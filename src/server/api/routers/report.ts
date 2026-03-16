import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env.js";
import type { ParsedReceipt, ReceiptLineItem, ReceiptReview } from "~/types/receipt-review";
import { calcAllReceiptsEligibleTotal } from "~/lib/receipt-eligible";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Upsert a ReceiptReview entry into an existing array by URL. */
function upsertReview(existing: ReceiptReview[], entry: ReceiptReview): ReceiptReview[] {
  const updated = [...existing];
  const idx = updated.findIndex((r) => r.url === entry.url);
  if (idx >= 0) {
    updated[idx] = { ...updated[idx]!, ...entry };
  } else {
    updated.push(entry);
  }
  return updated;
}

/**
 * Return the image content block for OpenRouter.
 * - Images (jpg/png): pass the URL directly — Gemini can fetch public URLs.
 * - PDFs: fetch and send as a base64 data URI (URL passing not reliable for PDFs).
 */
async function buildImageContent(
  url: string,
): Promise<{ type: "image_url"; image_url: { url: string } }> {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) throw new Error(`Failed to fetch receipt PDF (HTTP ${res.status})`);
    // Reject early if Content-Length is present and already too large
    const declaredLength = res.headers.get("content-length");
    if (declaredLength !== null && Number(declaredLength) > MAX_PDF_BYTES) {
      throw new Error("Receipt PDF exceeds the 20 MB limit.");
    }
    // Stream the body and enforce the cap regardless of headers
    if (!res.body) throw new Error("Failed to fetch receipt PDF (empty body).");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesRead = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new Error("Receipt PDF exceeds the 20 MB limit.");
      }
      chunks.push(value);
    }
    const base64 = Buffer.concat(chunks).toString("base64");
    return { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } };
  }

  // For images, pass the public URL directly — avoids large base64 request bodies
  return { type: "image_url", image_url: { url } };
}

const OCR_PROMPT = `\
You are analyzing an image or PDF that may contain one or more receipts.

For EACH distinct receipt visible, extract the store name, all line items, and the totals.

Return ONLY a JSON object — no markdown, no explanation — with this structure:
{
  "receipts": [
    {
      "storeName": "Store Name",
      "items": [
        { "description": "Item name", "amount": 12.50 }
      ],
      "subtotal": 100.00,
      "tax": 13.00,
      "total": 113.00
    }
  ]
}

Rules:
- Include one object in "receipts" for each distinct receipt in the image
- "storeName" is the merchant name as printed on the receipt; omit the field if not legible
- "amount" for each item is the line item price as shown on the receipt (pre-tax), as a plain number
- "subtotal" is the pre-tax total; omit if not shown on the receipt
- "tax" is the total tax charged; omit if not shown
- "total" is the grand total charged; omit if not shown
- All monetary values must be plain numbers (e.g. 12.50, not "$12.50")`;

/**
 * Parse a monetary value returned by the AI model.
 * Strips common formatting ($, commas, spaces) before converting.
 * Returns 0 for anything that still doesn't parse as a finite number.
 */
function parseAmount(raw: unknown): number {
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[$,\s]/g, "");
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

/** Call OpenRouter with Gemini 2.5 Flash to OCR a receipt image. */
async function runReceiptOcr(receiptUrl: string): Promise<Pick<ReceiptReview, "receipts">> {
  const imageContent = await buildImageContent(receiptUrl);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.BETTER_AUTH_URL,
      "X-Title": "SEIF Receipt Review",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      // response_format omitted — not supported for multimodal requests on Gemini via OpenRouter
      messages: [
        {
          role: "user",
          content: [imageContent, { type: "text", text: OCR_PROMPT }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OCR model.");

  // Strip markdown fences if the model wrapped the JSON
  const raw = /```(?:json)?\s*([\s\S]*?)```/.exec(content)?.[1] ?? content;

  const parsed = JSON.parse(raw) as {
    receipts?: Array<{
      storeName?: string;
      items?: Array<{ description?: string; amount?: unknown }>;
      subtotal?: unknown;
      tax?: unknown;
      total?: unknown;
    }>;
  };

  const receipts: ParsedReceipt[] = (parsed.receipts ?? []).map((r) => ({
    storeName: r.storeName ? String(r.storeName) : undefined,
    items: (r.items ?? []).map(
      (item): ReceiptLineItem => ({
        id: randomUUID(),
        description: item.description ?? "",
        amount: parseAmount(item.amount),
        eligible: true,
      }),
    ),
    ...(r.subtotal != null ? { subtotal: parseAmount(r.subtotal) } : {}),
    ...(r.tax != null ? { tax: parseAmount(r.tax) } : {}),
    ...(r.total != null ? { total: parseAmount(r.total) } : {}),
  }));

  return { receipts };
}

const reportStatusSchema = z.enum(["SUBMITTED", "COMPLETE", "PENDING_FUNDS_RETURN", "FUNDS_RETURNED"]);

const receiptsPathsSchema = z
  .array(z.string().url())
  .min(1, "At least one receipt is required.")
  .max(10, "Maximum 10 receipts. Contact the clubs coordinator if you need to submit more.");

export const reportRouter = createTRPCRouter({
  /** Get report for an application (if any); caller must own the application. */
  getByApplicationId: protectedProcedure
    .input(z.object({ applicationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.seifApplication.findFirst({
        where: {
          id: input.applicationId,
          submittedById: ctx.session.user.id,
          status: "APPROVED",
        },
        include: { report: true },
      });
      if (!app) return null;
      return app.report;
    }),

  /** Submit a SEIF report for an approved application (owner only). */
  create: protectedProcedure
    .input(
      z.object({
        applicationId: z.string().cuid(),
        amountSpent: z.number().min(0).finite(),
        underSpendExplanation: z.string().trim().optional(),
        descriptionActivities: z.string().trim().min(1, "Description & activities is required."),
        finalBudgetFilePath: z.string().min(1, "Final budget file is required."),
        receiptsFilePaths: receiptsPathsSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.seifApplication.findFirst({
        where: {
          id: input.applicationId,
          submittedById: ctx.session.user.id,
          status: "APPROVED",
        },
        include: { report: true },
      });
      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found or not approved.",
        });
      }
      if (app.report) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A report has already been submitted for this application.",
        });
      }
      const amountAllocated =
        app.amountApproved != null ? Number(app.amountApproved) : Number(app.amountRequested);
      if (input.amountSpent > amountAllocated) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Amount spent cannot exceed the amount allocated.",
        });
      }
      try {
        return await ctx.db.seifReport.create({
          data: {
            applicationId: input.applicationId,
            amountAllocated,
            amountSpent: input.amountSpent,
            underSpendExplanation: input.underSpendExplanation ?? null,
            descriptionActivities: input.descriptionActivities,
            finalBudgetFilePath: input.finalBudgetFilePath,
            receiptsFilePaths: input.receiptsFilePaths as unknown as object,
            submittedById: ctx.session.user.id,
          },
        });
      } catch (err) {
        const prismaError = err as { code?: string };
        if (prismaError.code === "P2002") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A report has already been submitted for this application.",
          });
        }
        throw err;
      }
    }),

  /** List all reports (admin). */
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.seifReport.findMany({
      orderBy: { submittedAt: "desc" },
      include: {
        application: {
          include: { organization: true, submittedBy: true },
        },
        reviewedBy: true,
      },
    });
  }),

  /** Get one report by id (admin). */
  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.id },
        include: {
          application: {
            include: { organization: true, submittedBy: true },
          },
          reviewedBy: true,
        },
      });
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      }
      return report;
    }),

  /** Save admin review data for a receipt image (one or more parsed receipts). */
  saveReceiptReview: adminProcedure
    .input(
      z.object({
        reportId: z.string().cuid(),
        receiptUrl: z.string().url(),
        receipts: z
          .array(
            z.object({
              storeName: z.string().optional(),
              items: z.array(
                z.object({
                  id: z.string(),
                  description: z.string(),
                  amount: z.number().min(0).finite(),
                  eligible: z.boolean(),
                }),
              ),
              subtotal: z.number().min(0).finite().optional(),
              tax: z.number().min(0).finite().optional(),
              total: z.number().min(0).finite().optional(),
            }),
          )
          .min(1, "At least one receipt entry is required."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.reportId },
        select: { id: true, receiptReviews: true, receiptsFilePaths: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });

      const storedPaths = (report.receiptsFilePaths as string[]) ?? [];
      if (!storedPaths.includes(input.receiptUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Receipt URL not found in this report." });
      }

      const existing = (report.receiptReviews as ReceiptReview[] | null) ?? [];
      const entry: ReceiptReview = {
        url: input.receiptUrl,
        ocrStatus: "complete",
        receipts: input.receipts,
        reviewedAt: new Date().toISOString(),
      };
      return ctx.db.seifReport.update({
        where: { id: input.reportId },
        data: { receiptReviews: upsertReview(existing, entry) as unknown as object },
      });
    }),

  /**
   * Run AI OCR on a single receipt via OpenRouter (Gemini 2.5 Flash).
   * Synchronously fetches, analyses, and saves the result; returns the ReceiptReview entry.
   */
  triggerReceiptOcr: adminProcedure
    .input(
      z.object({
        reportId: z.string().cuid(),
        receiptUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.reportId },
        select: { id: true, receiptReviews: true, receiptsFilePaths: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });

      const storedPaths = (report.receiptsFilePaths as string[]) ?? [];
      if (!storedPaths.includes(input.receiptUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Receipt URL not found in this report." });
      }

      const existing = (report.receiptReviews as ReceiptReview[] | null) ?? [];

      let entry: ReceiptReview;
      try {
        const ocr = await runReceiptOcr(input.receiptUrl);
        entry = { url: input.receiptUrl, ocrStatus: "complete", ...ocr };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[receipt-ocr] failed:", message, err);
        entry = {
          url: input.receiptUrl,
          ocrStatus: "error",
          ocrError: message,
          // Preserve any receipts the admin had already added manually
          receipts: existing.find((r) => r.url === input.receiptUrl)?.receipts ?? [],
        };
      }

      await ctx.db.seifReport.update({
        where: { id: input.reportId },
        data: { receiptReviews: upsertReview(existing, entry) as unknown as object },
      });

      return entry;
    }),

  /**
   * Finalise the receipt review. Automatically determines whether funds need
   * to be returned by comparing eligible expenses to the allocated amount.
   * Sets status to COMPLETE or PENDING_FUNDS_RETURN accordingly.
   */
  finalizeReview: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.id },
        select: { id: true, status: true, amountAllocated: true, receiptReviews: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (report.status !== "SUBMITTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Report has already been finalised." });
      }

      const reviews = (report.receiptReviews as unknown[] | null) ?? [];
      const totalEligible = calcAllReceiptsEligibleTotal(reviews);
      const amountAllocated = Number(report.amountAllocated);
      // Use a small epsilon to absorb floating-point rounding
      const newStatus: "COMPLETE" | "PENDING_FUNDS_RETURN" =
        totalEligible >= amountAllocated - 0.005 ? "COMPLETE" : "PENDING_FUNDS_RETURN";

      return ctx.db.seifReport.update({
        where: { id: input.id },
        data: { status: newStatus, reviewedAt: new Date(), reviewedById: ctx.session.user.id },
      });
    }),

  /**
   * Undo a finalized review.
   * Moves status from COMPLETE or PENDING_FUNDS_RETURN → SUBMITTED, clearing reviewer fields.
   */
  undoFinalizeReview: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (report.status !== "COMPLETE" && report.status !== "PENDING_FUNDS_RETURN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Report has not been finalised.",
        });
      }

      return ctx.db.seifReport.update({
        where: { id: input.id },
        data: { status: "SUBMITTED", reviewedAt: null, reviewedById: null },
      });
    }),

  /**
   * Undo a funds-returned confirmation.
   * Moves status from FUNDS_RETURNED → PENDING_FUNDS_RETURN.
   */
  undoFundsReturned: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (report.status !== "FUNDS_RETURNED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Report is not in funds-returned state.",
        });
      }

      return ctx.db.seifReport.update({
        where: { id: input.id },
        data: { status: "PENDING_FUNDS_RETURN", reviewedAt: new Date(), reviewedById: ctx.session.user.id },
      });
    }),

  /**
   * Confirm that the outstanding funds have been returned.
   * Moves status from PENDING_FUNDS_RETURN → FUNDS_RETURNED.
   */
  confirmFundsReturned: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      if (report.status !== "PENDING_FUNDS_RETURN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Report is not awaiting funds return.",
        });
      }

      return ctx.db.seifReport.update({
        where: { id: input.id },
        data: { status: "FUNDS_RETURNED", reviewedAt: new Date(), reviewedById: ctx.session.user.id },
      });
    }),

  /** Update report status and optional reviewer notes (admin). */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        status: reportStatusSchema,
        reviewerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        status: input.status,
        reviewerNotes: input.reviewerNotes !== undefined ? (input.reviewerNotes?.trim() || null) : undefined,
        ...(input.status === "SUBMITTED"
          ? { reviewedAt: null, reviewedById: null }
          : { reviewedAt: new Date(), reviewedById: ctx.session.user.id }),
      };
      return ctx.db.seifReport.update({
        where: { id: input.id },
        data,
      });
    }),
});
