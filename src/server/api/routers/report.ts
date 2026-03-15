import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, protectedProcedure } from "~/server/api/trpc";

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
        amountAllocated: z.number().min(0).finite(),
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
      return ctx.db.seifReport.create({
        data: {
          applicationId: input.applicationId,
          amountAllocated: input.amountAllocated,
          amountSpent: input.amountSpent,
          underSpendExplanation: input.underSpendExplanation ?? null,
          descriptionActivities: input.descriptionActivities,
          finalBudgetFilePath: input.finalBudgetFilePath,
          receiptsFilePaths: input.receiptsFilePaths as unknown as object,
          submittedById: ctx.session.user.id,
        },
      });
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
      return ctx.db.seifReport.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          application: {
            include: { organization: true, submittedBy: true },
          },
          reviewedBy: true,
        },
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
        ...(input.status !== "SUBMITTED" && {
          reviewedAt: new Date(),
          reviewedById: ctx.session.user.id,
        }),
      };
      return ctx.db.seifReport.update({
        where: { id: input.id },
        data,
      });
    }),
});
