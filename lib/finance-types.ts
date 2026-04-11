export interface FinanceEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive, type determines direction
  type: "income" | "expense";
  source: "stripe" | "amex" | "manual";
}

export interface FinanceData {
  entries: FinanceEntry[];
  stripeKey: string | null;
  lastStripeSyncAt: string | null;
}
