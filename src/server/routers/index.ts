import { router, publicProcedure } from "../trpc";
import { debtorRouter } from "./debtor";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),
  debtor: debtorRouter,
});

export type AppRouter = typeof appRouter;