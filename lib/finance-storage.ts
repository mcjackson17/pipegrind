"use client";

import { FinanceData, FinanceEntry } from "./finance-types";

const FINANCE_KEY = "pipegrind_finance";

function getFinanceData(): FinanceData {
  if (typeof window === "undefined") return { entries: [], stripeKey: null, lastStripeSyncAt: null };
  const raw = localStorage.getItem(FINANCE_KEY);
  return raw ? JSON.parse(raw) : { entries: [], stripeKey: null, lastStripeSyncAt: null };
}

function saveFinanceData(data: FinanceData): void {
  localStorage.setItem(FINANCE_KEY, JSON.stringify(data));
}

export function getFinanceEntries(): FinanceEntry[] {
  return getFinanceData().entries;
}

export function getStripeKey(): string | null {
  return getFinanceData().stripeKey;
}

export function saveStripeKey(key: string): void {
  const data = getFinanceData();
  data.stripeKey = key;
  saveFinanceData(data);
}

export function getLastStripeSyncAt(): string | null {
  return getFinanceData().lastStripeSyncAt;
}

export function addEntries(newEntries: FinanceEntry[]): void {
  const data = getFinanceData();
  // Deduplicate by id
  const existingIds = new Set(data.entries.map((e) => e.id));
  const toAdd = newEntries.filter((e) => !existingIds.has(e.id));
  data.entries = [...data.entries, ...toAdd];
  data.lastStripeSyncAt = new Date().toISOString();
  saveFinanceData(data);
}

export function deleteEntry(id: string): void {
  const data = getFinanceData();
  data.entries = data.entries.filter((e) => e.id !== id);
  saveFinanceData(data);
}

// ---- Aggregation helpers ----

export function entriesForPeriod(entries: FinanceEntry[], from: Date, to: Date): FinanceEntry[] {
  return entries.filter((e) => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

export function sumByType(entries: FinanceEntry[]): { income: number; expenses: number; net: number } {
  const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  return { income, expenses, net: income - expenses };
}

// Group entries by YYYY-MM, return array sorted by month
export function groupByMonth(entries: FinanceEntry[]): Array<{
  label: string; // e.g. "Jan"
  yearMonth: string; // e.g. "2026-01"
  income: number;
  expenses: number;
  net: number;
}> {
  const map: Record<string, { income: number; expenses: number }> = {};

  for (const e of entries) {
    const ym = e.date.slice(0, 7); // "2026-04"
    if (!map[ym]) map[ym] = { income: 0, expenses: 0 };
    if (e.type === "income") map[ym].income += e.amount;
    else map[ym].expenses += e.amount;
  }

  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, { income, expenses }]) => ({
      label: MONTH_LABELS[parseInt(ym.slice(5, 7)) - 1],
      yearMonth: ym,
      income,
      expenses,
      net: income - expenses,
    }));
}
