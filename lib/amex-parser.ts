import { FinanceEntry } from "./finance-types";

// Amex Business CSV format:
// Date,Reference,Amount,Description
// 04/10/2026,XXXXXXXXXX,29.99,SOME VENDOR
// Sometimes quoted, sometimes not. Amount is positive for charges.

function stripQuotes(s: string): string {
  return s.trim().replace(/^"(.*)"$/, "$1").trim();
}

function parseAmexDate(raw: string): string | null {
  // Amex uses MM/DD/YYYY
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export function parseAmexCSV(csvText: string): { entries: FinanceEntry[]; skipped: number } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { entries: [], skipped: 0 };

  // Detect header row and skip it
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("date") || firstLine.includes("reference") || firstLine.includes("description");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const entries: FinanceEntry[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    // Simple CSV split — Amex doesn't typically embed commas in description but handle quotes
    const cols = line.split(",").map(stripQuotes);
    if (cols.length < 3) { skipped++; continue; }

    const [rawDate, reference, rawAmount, ...descParts] = cols;
    const date = parseAmexDate(rawDate);
    if (!date) { skipped++; continue; }

    const amount = parseFloat(rawAmount.replace(/[$,]/g, ""));
    if (isNaN(amount) || amount <= 0) { skipped++; continue; }

    const description = descParts.join(", ").trim() || reference || "Amex charge";

    entries.push({
      id: `amex_${reference || date}_${rawAmount}`.replace(/\s+/g, "_"),
      date,
      description,
      amount,
      type: "expense",
      source: "amex",
    });
  }

  return { entries, skipped };
}
