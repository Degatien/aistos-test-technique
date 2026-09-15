import "dotenv/config";
import { prisma } from "./server/db";
import { parseDebtorsCsv } from "./import/parse";
import { importRows } from "./import/service";

const CSV_PATH = process.argv[2] ?? "debtors.csv";

// Usage: bun run import [path-to-csv]  (defaults to ./debtors.csv)

async function main() {
  const rows = parseDebtorsCsv(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from ${CSV_PATH}`);

  const result = await importRows(rows);
  console.log(
    `Import complete: ${result.debtsCreated} debt(s) created for ${result.uniqueDebtors} unique debtor(s).`,
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