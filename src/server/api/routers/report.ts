import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";
import type { ReceiptReview } from "~/types/receipt-review";

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

  /** Save admin review data for a single receipt (items + eligible flags). */
  saveReceiptReview: adminProcedure
    .input(
      z.object({
        reportId: z.string().cuid(),
        receiptUrl: z.string().url(),
        items: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            amount: z.number().min(0).finite(),
            tax: z.number().min(0).finite().optional(),
            eligible: z.boolean(),
          }),
        ),
        detectedSubtotal: z.number().optional(),
        detectedTax: z.number().optional(),
        detectedTotal: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.seifReport.findUnique({
        where: { id: input.reportId },
        select: { id: true, receiptReviews: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });

      const existing = (report.receiptReviews as ReceiptReview[] | null) ?? [];
      const idx = existing.findIndex((r) => r.url === input.receiptUrl);
      const entry: ReceiptReview = {
        url: input.receiptUrl,
        ocrStatus: "complete",
        items: input.items,
        detectedSubtotal: input.detectedSubtotal,
        detectedTax: input.detectedTax,
        detectedTotal: input.detectedTotal,
        reviewedAt: new Date().toISOString(),
      };
      const updated = [...existing];
      if (idx >= 0) {
        updated[idx] = { ...existing[idx]!, ...entry };
      } else {
        updated.push(entry);
      }
      return ctx.db.seifReport.update({
        where: { id: input.reportId },
        data: { receiptReviews: updated as unknown as object },
      });
    }),

  /**
   * Trigger AI OCR analysis for a single receipt (admin).
   * Marks the receipt as "processing" in the DB.
   * TODO: integrate OpenRouter + Gemini 2.5 Flash to parse the receipt and populate items.
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
        select: { id: true, receiptReviews: true },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });

      const existing = (report.receiptReviews as ReceiptReview[] | null) ?? [];
      const idx = existing.findIndex((r) => r.url === input.receiptUrl);
      const updated = [...existing];
      const entry: ReceiptReview = {
        url: input.receiptUrl,
        ocrStatus: "processing",
        items: idx >= 0 ? (existing[idx]!.items ?? []) : [],
      };
      if (idx >= 0) {
        updated[idx] = { ...existing[idx]!, ...entry };
      } else {
        updated.push(entry);
      }
      await ctx.db.seifReport.update({
        where: { id: input.reportId },
        data: { receiptReviews: updated as unknown as object },
      });

      // TODO: kick off async AI analysis via OpenRouter (Gemini 2.5 Flash)
      // The model should return JSON with line items (description, amount, tax), subtotal, tax, total.
      // On completion, update ocrStatus to "complete" and populate items.

      return { status: "processing" as const };
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
