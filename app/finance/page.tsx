"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { FinanceEntry } from "@/lib/finance-types";
import {
  getFinanceEntries,
  getStripeKey,
  saveStripeKey,
  addEntries,
  deleteEntry,
  entriesForPeriod,
  sumByType,
  groupByMonth,
} from "@/lib/finance-storage";
import { parseAmexCSV } from "@/lib/amex-parser";
import { PLChart } from "@/components/pl-chart";

type ViewMode = "daily" | "weekly" | "monthly" | "ytd";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfDay(monday);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function getPeriod(mode: ViewMode): { from: Date; to: Date; label: string } {
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  switch (mode) {
    case "daily":
      return { from: today, to: todayEnd, label: "Today" };
    case "weekly": {
      const from = startOfWeek(now);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59);
      return { from, to, label: "This Week" };
    }
    case "monthly": {
      const from = startOfMonth(now);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { from, to, label: now.toLocaleString("default", { month: "long" }) };
    }
    case "ytd": {
      const from = startOfYear(now);
      return { from, to: todayEnd, label: `${now.getFullYear()} YTD` };
    }
  }
}

export default function FinancePage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [view, setView] = useState<ViewMode>("ytd");
  const [stripeKey, setStripeKeyState] = useState("");
  const [showStripeInput, setShowStripeInput] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [amexMsg, setAmexMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setEntries(getFinanceEntries()), []);

  useEffect(() => {
    refresh();
    const saved = getStripeKey();
    if (saved) setStripeKeyState(saved);
  }, [refresh]);

  const { from, to, label } = getPeriod(view);
  const periodEntries = entriesForPeriod(entries, from, to);
  const { income, expenses, net } = sumByType(periodEntries);

  const ytdEntries = entriesForPeriod(entries, startOfYear(new Date()), new Date());
  const monthlyData = groupByMonth(view === "ytd" ? ytdEntries : periodEntries);

  // Sort entries newest first for the list
  const sortedEntries = [...periodEntries].sort((a, b) => b.date.localeCompare(a.date));

  const handleAmexUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { entries: newEntries, skipped } = parseAmexCSV(text);
      if (newEntries.length === 0) {
        setAmexMsg("No valid rows found. Check your CSV format.");
        return;
      }
      addEntries(newEntries);
      refresh();
      setAmexMsg(`Imported ${newEntries.length} expense${newEntries.length !== 1 ? "s" : ""}${skipped > 0 ? ` (${skipped} skipped)` : ""}.`);
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  const handleStripeSync = async () => {
    if (!stripeKey.startsWith("sk_")) {
      setSyncMsg("Key should start with sk_live_ or sk_test_");
      return;
    }
    saveStripeKey(stripeKey);
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/stripe-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(`Error: ${data.error}`);
      } else {
        addEntries(data.entries);
        refresh();
        setSyncMsg(`Synced ${data.count} payment${data.count !== 1 ? "s" : ""} from Stripe.`);
        setShowStripeInput(false);
      }
    } catch {
      setSyncMsg("Network error. Try again.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Finances</h1>
            <p className="text-xs text-zinc-500">PipeGrind</p>
          </div>
          <Link
            href="/daily"
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            Back to Pipeline
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* View tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          {(["daily", "weekly", "monthly", "ytd"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {v === "daily" ? "Today" : v === "weekly" ? "Week" : v === "monthly" ? "Month" : "YTD"}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500 mb-1">Revenue</p>
            <p className="text-xl font-bold text-slate-700">{fmt(income)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500 mb-1">Expenses</p>
            <p className="text-xl font-bold text-zinc-500">({fmt(expenses)})</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500 mb-1">Net</p>
            <p className={`text-xl font-bold ${net >= 0 ? "text-green-600" : "text-red-500"}`}>
              {net >= 0 ? fmt(net) : `(${fmt(Math.abs(net))})`}
            </p>
          </div>
        </div>

        {/* P&L Chart — always shows YTD monthly breakdown */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-sm font-medium text-zinc-600 mb-4">
            {view === "ytd" ? `${new Date().getFullYear()} P&L by Month` : `${label} — Monthly Breakdown`}
          </p>
          <PLChart months={view === "ytd" ? monthlyData : groupByMonth(ytdEntries)} />
        </div>

        {/* Data import */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-700">Import Data</p>

          {/* Amex */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-700">Amex CSV</p>
              <p className="text-xs text-zinc-400">Upload your statement CSV (expenses)</p>
            </div>
            <div className="flex items-center gap-2">
              {amexMsg && <span className="text-xs text-zinc-500">{amexMsg}</span>}
              <button
                onClick={() => fileRef.current?.click()}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                Upload CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleAmexUpload} />
            </div>
          </div>

          {/* Stripe */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-700">Stripe</p>
                <p className="text-xs text-zinc-400">Sync client payments (income)</p>
              </div>
              <button
                onClick={() => setShowStripeInput(!showStripeInput)}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                {getStripeKey() ? "Re-sync" : "Connect"}
              </button>
            </div>
            {showStripeInput && (
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  value={stripeKey}
                  onChange={(e) => setStripeKeyState(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
                <button
                  onClick={handleStripeSync}
                  disabled={syncing || !stripeKey}
                  className="w-full py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
                >
                  {syncing ? "Syncing..." : "Sync Stripe Payments"}
                </button>
                {syncMsg && <p className="text-xs text-zinc-500">{syncMsg}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Transaction list */}
        {sortedEntries.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-zinc-700">Transactions — {label}</p>
            </div>
            {sortedEntries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-800 truncate">{entry.description}</p>
                  <p className="text-xs text-zinc-400">
                    {entry.date} · {entry.source === "stripe" ? "Stripe" : entry.source === "amex" ? "Amex" : "Manual"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-medium ${entry.type === "income" ? "text-green-600" : "text-zinc-600"}`}>
                    {entry.type === "income" ? "+" : "-"}{fmt(entry.amount)}
                  </span>
                </div>
                <button
                  onClick={() => { deleteEntry(entry.id); refresh(); }}
                  className="text-zinc-300 hover:text-red-400 text-xs ml-1 transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">
            No data yet. Upload your Amex CSV or connect Stripe to get started.
          </div>
        )}
      </div>
    </div>
  );
}
