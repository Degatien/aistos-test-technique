import { prisma } from "../server/db";
import { encrypt, emailHash, generateSlug } from "../crypto";
import type { DebtorRow } from "./parse";

export interface ImportResult {
  debtsCreated: number;
  uniqueDebtors: number;
}

/** Upsert Debtor by emailHash and create one Debt per row, atomically. */
export async function importRows(rows: DebtorRow[]): Promise<ImportResult> {
  const uniqueEmails = new Set(rows.map((r) => emailHash(r.email)));

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const hash = emailHash(row.email);

      await tx.debtor.upsert({
        where: { emailHash: hash },
        create: {
          emailHash: hash,
          slug: generateSlug(),
          name: encrypt(row.name),
          email: encrypt(row.email),
        },
        update: {
          // Refresh encrypted PII on re-import (e.g. re-encryption or new key)
          name: encrypt(row.name),
          email: encrypt(row.email),
        },
      });

      await tx.debt.create({
        data: {
          debtorId: hash,
          debtSubject: row.debtSubject,
          debtAmount: row.debtAmount,
        },
      });
    }
  });

  return {
    debtsCreated: rows.length,
    uniqueDebtors: uniqueEmails.size,
  };
}