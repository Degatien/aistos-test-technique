import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./routers";
import index from "../../index.html";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
  }),
);

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  routes: {
    "/debtor/*": index,
  },
  fetch: app.fetch,
  development: true,
};