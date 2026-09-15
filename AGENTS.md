# AGENTS.md

## Project Overview

Technical test: a small web application in **TypeScript** that imports debts from a CSV
(columns: `name`, `email`, `debtSubject`, `debtAmount`), stores them in a database, lets a
debtor view their debt and pay it via **Stripe in test mode**, then updates the debt status.

## Deliverables (from the spec)

- Git repo using TypeScript, including the example CSV
- README.md following this structure (headings in French, per spec):
  1. **Démarrage** — how to launch and test the project
  2. **Choix d'architecture** — decisions, hypotheses, limitations
  3. **Avant une mise en production** — what would change for prod
  4. **Ressources utilisées** — docs, tools, AI assistants used

## Three Tasks

1. **Import des dettes** — import the CSV and create the corresponding records in the database.
2. **Page débiteur** — a page for a debtor showing identity, subject, amount, status, with a
   **Payer** button.
3. **Paiement Stripe** — on Payer click, initiate a Stripe payment (test environment) and
   update the debt status after payment.

## Architecture Decisions (see README "Choix d'architecture")

The test is built on the **company production stack** to demonstrate fit.

| Area | Decision | Notes |
|---|---|---|
| Language | TypeScript (strict) | |
| Runtime | Bun | Company production runtime |
| API | REST & tRPC | Company standard |
| Database | PostgreSQL + Prisma | Company standard; local instance via Docker |
| CSV parsing | `csv-parse` | Handles quoted fields correctly |
| Stripe | Checkout Session, test mode | Status updated via webhook + redirect fallback |
| Frontend | React + TanStack + TailwindCSS + Shadcn/ui | Company standard |
| Bundling | Bun (HTML imports) | No Vite — Bun bundles React/CSS natively |
| Currency | EUR | Assumed from context; verify against CSV |

### Hypotheses

- A debtor is identified by **email** in the URL (`/debtor/:email`).
- One debt per debtor (or the page lists all debts for that email).
- Stripe test keys come from a `.env` file (never committed).
- Local PostgreSQL runs via `docker compose up`; migrations via Prisma.

### Infrastructure (prod context, for README "Avant une mise en production")

- Scaleway (deployment), Docker, GitHub Actions (CI/CD), Axiom (monitoring/logs).
- AI tooling used on this project: Claude Code, Lovable, Gemini API (for README "Ressources utilisées").

## Conventions

- Base branch: `master`
- Use Bun as runtime/package manager (never `npm`)
- Speak/write in English (except README headings required in French by the spec)
- Simplicity first: minimum code that solves the problem, no speculative abstractions
- Surgical changes: touch only what the task requires
- Never commit secrets: `.env`, Stripe keys
- Incremental setup: add a dependency or env variable only when the feature that uses it
  is implemented — never install packages or define env vars ahead of time. `.env.example`
  grows one variable at a time, in lockstep with the code that reads it.
- Include `.env.example` with placeholder test keys
- Provide an example CSV (`example.csv`) matching the exact columns:
  `name,email,debtSubject,debtAmount`

## Getting Started (for agents)

1. `bun install`
2. Start the local PostgreSQL instance: `docker compose up -d`
3. Copy `.env.example` to `.env` — variables are added incrementally: `DATABASE_URL` is
   required from the DB step onward; Stripe test keys (`sk_test_...`, `pk_test_...`) only
   when Task 3 lands
4. Run migrations: `bunx prisma migrate dev`
5. `bun run import` (or equivalent) to load `example.csv` into the DB
6. `bun run dev` to start the server
7. Open `/debtor/:email` to see the debtor page and test the Pay button

## Goal-Driven Execution

- Task 1 → verify: rows exist in the DB after import; import is idempotent or documented
- Task 2 → verify: page shows name, subject, amount, status and a working Payer button
- Task 3 → verify: clicking Payer opens Stripe Checkout (test mode); paying updates the
  debt status to paid; webhook path tested (e.g. with `stripe listen`)