import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./routers";
import { prisma } from "./db";
import { stripe } from "./stripe";
import index from "../../index.html";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
  }),
);

app.post("/api/checkout", async (c) => {
  const { debtId } = await c.req.json<{ debtId?: string }>();

  if (!debtId) {
    return c.json({ error: "debtId is required" }, 400);
  }

  const debt = await prisma.debt.findUnique({
    where: { id: debtId },
    include: { debtor: true },
  });

  if (!debt) {
    return c.json({ error: "Debt not found" }, 404);
  }

  if (debt.status === "PAID") {
    return c.json({ error: "Debt already paid" }, 409);
  }

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: debt.debtSubject,
          },
          unit_amount: debt.debtAmount * 100, // euros → cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      debtId: debt.id,
    },
    success_url: `${baseUrl}/debtor/${debt.debtor.slug}?payment=success`,
    cancel_url: `${baseUrl}/debtor/${debt.debtor.slug}?payment=cancelled`,
  });

  await prisma.debt.update({
    where: { id: debt.id },
    data: { stripeSessionId: session.id },
  });

  return c.json({ url: session.url });
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  routes: {
    "/debtor/*": index,
  },
  fetch: app.fetch,
  development: true,
};