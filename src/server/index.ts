import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./routers";
import { prisma } from "./db";
import { stripe } from "./stripe";
import { parseDebtorsCsvContent } from "../import/parse";
import { importRows } from "../import/service";
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

app.post("/api/import", async (c) => {
  const raw = await c.req.text();

  try {
    const rows = parseDebtorsCsvContent(raw);
    const result = await importRows(rows);
    return c.json(result);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      400,
    );
  }
});

app.post("/api/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  const body = await c.req.text();

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, 500);
  }

  if (!signature) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const debtId = session.metadata?.debtId;
    if (debtId) {
      await prisma.debt.update({
        where: { id: debtId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }
  }

  return c.json({ received: true });
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  routes: {
    "/debtor/*": index,
    "/import": index,
  },
  fetch: app.fetch,
  development: true,
};