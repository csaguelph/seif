import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, adminProcedure, publicProcedure } from "~/server/api/trpc";

const formDataSchema = z.record(z.unknown());
const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const normalizeNullableString = (value: string | null | undefined) => value ?? null;
const isReviewableStatus = (status: string) =>
  status === "SUBMITTED" || status === "UNDER_REVIEW";

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
      },
    });
  }),

  getById: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.seifApplication.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          organization: true,
          submittedBy: true,
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
      const existing = await ctx.db.seifApplication.findUniqueOrThrow({
        where: { id: input.id },
        select: { status: true },
      });

      if (!isReviewableStatus(existing.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted or under-review applications can be approved.",
        });
      }

      return ctx.db.seifApplication.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          reviewerComments: normalizeNullableString(input.comments),
          approvalConditions: normalizeNullableString(input.conditions),
          denialReason: null,
          reviewedAt: new Date(),
        },
      });
    }),

  reject: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().trim().min(1, "A denial reason is required."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.seifApplication.findUniqueOrThrow({
        where: { id: input.id },
        select: { status: true },
      });

      if (!isReviewableStatus(existing.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only submitted or under-review applications can be denied.",
        });
      }

      return ctx.db.seifApplication.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          denialReason: input.reason,
          reviewerComments: null,
          approvalConditions: null,
          reviewedAt: new Date(),
        },
      });
    }),
});
