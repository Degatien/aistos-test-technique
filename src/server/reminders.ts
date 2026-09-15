import { prisma } from "./db";
import { decrypt } from "../crypto";
import { sendMail } from "./mail";

export interface PendingDebt {
  id: string;
  debtSubject: string;
  debtAmount: number;
}

export interface PendingDebtor {
  id: string; // emailHash
  slug: string;
  name: string;
  email: string;
  pendingDebts: PendingDebt[];
}

/** List debtors that have at least one pending debt, with decrypted identity. */
export async function listPendingDebtors(): Promise<PendingDebtor[]> {
  const debtors = await prisma.debtor.findMany({
    where: { debts: { some: { status: "PENDING" } } },
    include: {
      debts: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return debtors.map((debtor) => ({
    id: debtor.emailHash,
    slug: debtor.slug,
    name: decrypt(debtor.name),
    email: decrypt(debtor.email),
    pendingDebts: debtor.debts.map((debt) => ({
      id: debt.id,
      debtSubject: debt.debtSubject,
      debtAmount: debt.debtAmount,
    })),
  }));
}

function buildReminderText(debtor: PendingDebtor, baseUrl: string): string {
  const total = debtor.pendingDebts.reduce((sum, d) => sum + d.debtAmount, 0);
  const lines = debtor.pendingDebts
    .map((d) => `  - ${d.debtSubject} : ${d.debtAmount.toLocaleString("fr-FR")} €`)
    .join("\n");

  return [
    `Bonjour ${debtor.name},`,
    "",
    "Nous vous rappelons que les dettes suivantes restent à régler :",
    "",
    lines,
    "",
    `Total dû : ${total.toLocaleString("fr-FR")} €`,
    "",
    `Vous pouvez régler en ligne : ${baseUrl}/debtor/${debtor.slug}`,
    "",
    "Cordialement,",
    "Le service recouvrement",
  ].join("\n");
}

/** Send a reminder email to a single debtor (must have pending debts). */
export async function sendReminder(debtor: PendingDebtor): Promise<void> {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  await sendMail({
    to: { email: debtor.email, name: debtor.name },
    subject: "Rappel : dettes en attente de règlement",
    text: buildReminderText(debtor, baseUrl),
  });
}