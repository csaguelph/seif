import { z } from "zod";

import { createTRPCRouter, adminProcedure, publicProcedure } from "~/server/api/trpc";

const formDataSchema = z.record(z.unknown());

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
});
