import "dotenv/config";
import { prisma } from "./server/db";
import { encrypt, emailHash, generateSlug } from "./crypto";
import { parseDebtorsCsv } from "./import/parse";

const CSV_PATH = process.argv[2] ?? "debtors.csv";

async function main() {
  const rows = parseDebtorsCsv(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from ${CSV_PATH}`);

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

  console.log(
    `Import complete: ${rows.length} debt(s) created for ${uniqueEmails.size} unique debtor(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });