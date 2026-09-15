import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "../db";
import { decrypt } from "../../crypto";

export const debtorRouter = router({
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const debtor = await prisma.debtor.findUnique({
        where: { slug: input.slug },
        include: {
          debts: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!debtor) {
        return null;
      }

      return {
        name: decrypt(debtor.name),
        email: decrypt(debtor.email),
        debts: debtor.debts.map((debt) => ({
          id: debt.id,
          debtSubject: debt.debtSubject,
          debtAmount: debt.debtAmount,
          status: debt.status,
        })),
      };
    }),
});