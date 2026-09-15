import { parse } from "csv-parse/sync";
import { readFileSync } from "node:fs";

export interface DebtorRow {
  name: string;
  email: string;
  debtSubject: string;
  debtAmount: number; // whole euros, as in the CSV
}

/** Read + parse + validate a CSV file (columns: name, email, debtSubject, debtAmount). */
export function parseDebtorsCsv(path: string): DebtorRow[] {
  return parseDebtorsCsvContent(readFileSync(path, "utf8"));
}

/** Parse + validate CSV content (columns: name, email, debtSubject, debtAmount). */
export function parseDebtorsCsvContent(raw: string): DebtorRow[] {
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  const rows: DebtorRow[] = [];

  for (const [index, record] of records.entries()) {
    const line = index + 2; // 1-indexed, +1 for header

    const name = record["name"] ?? "";
    const email = record["email"] ?? "";
    const debtSubject = record["debtSubject"] ?? "";
    const amountRaw = record["debtAmount"] ?? "";

    if (!name || !email || !debtSubject || !amountRaw) {
      throw new Error(`Line ${line}: missing required column (got name='${name}', email='${email}', debtSubject='${debtSubject}', debtAmount='${amountRaw}')`);
    }

    const debtAmount = Number(amountRaw);
    if (!Number.isInteger(debtAmount) || debtAmount <= 0) {
      throw new Error(`Line ${line}: debtAmount must be a positive integer, got '${amountRaw}'`);
    }

    rows.push({ name, email, debtSubject, debtAmount });
  }

  return rows;
}