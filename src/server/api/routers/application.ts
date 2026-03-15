import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, protectedProcedure, publicProcedure } from "~/server/api/trpc";

const formDataSchema = z.record(z.unknown());
const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const normalizeNullableString = (value: string | null | undefined) => value ?? null;
const reviewableStatuses: Array<"SUBMITTED" | "UNDER_REVIEW"> = ["SUBMITTED", "UNDER_REVIEW"];

export const applicationRouter = createTRPCRouter({
  listOrganizations: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.organization.findMany({
      orderBy: { name: "asc" },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
        amountRequested: z.number().positive().finite(),
        budgetFilePath: z.string().optional(),
        formData: formDataSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.seifApplication.create({
        data: {
          organizationId: input.organizationId,
          amountRequested: input.amountRequested,
          budgetFilePath: input.budgetFilePath ?? null,
          formData: input.formData as object,
          submittedById: ctx.session?.user?.id ?? null,
        },
      });
    }),

  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.seifApplication.findMany({
      orderBy: { submittedAt: "desc" },
      include: {
        organization: true,
        submittedBy: true,
        reviewedBy: true,
      },
    });
  }),

  /** List applications submitted by the current user (for dashboard). */
  listMyApplications: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.seifApplication.findMany({
      where: { submittedById: ctx.session.user.id },
      orderBy: { submittedAt: "desc" },
      include: {
        organization: true,
      },
    });
  }),

  /** Get one application by id; only allowed if the current user submitted it. */
  getMyApplicationById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.seifApplication.findUnique({
        where: {
          id: input.id,
          submittedById: ctx.session.user.id,
        },
        include: {
          organization: true,
          reviewedBy: true,
        },
      });
      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found." });
      }
      return app;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.seifApplication.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          organization: true,
          submittedBy: true,
          reviewedBy: true,
        },
      });
    }),

  approve: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        comments: optionalTrimmedString,
        conditions: optionalTrimmedString,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.seifApplication.updateMany({
        where: {
          id: input.id,
          status: { in: reviewableStatuses },
        },
        data: {
          status: "APPROVED",
          reviewedById: ctx.session.user.id,
          reviewerComments: normalizeNullableString(input.comments),
          approvalConditions: normalizeNullableString(input.conditions),
          denialReason: null,
          reviewedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted or under-review applications can be approved.",
        });
      }

      return { success: true };
    }),

  reject: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().trim().min(1, "A denial reason is required."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.seifApplication.updateMany({
        where: {
          id: input.id,
          status: { in: reviewableStatuses },
        },
        data: {
          status: "REJECTED",
          reviewedById: ctx.session.user.id,
          denialReason: input.reason,
          reviewerComments: null,
          approvalConditions: null,
          reviewedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted or under-review applications can be denied.",
        });
      }

      return { success: true };
    }),
});
