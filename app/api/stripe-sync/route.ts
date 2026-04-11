import { NextRequest, NextResponse } from "next/server";
import { FinanceEntry } from "@/lib/finance-types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { stripeKey } = await req.json();

  if (!stripeKey || !stripeKey.startsWith("sk_")) {
    return NextResponse.json({ error: "Invalid Stripe secret key" }, { status: 400 });
  }

  // Fetch from Jan 1 of current year
  const yearStart = Math.floor(new Date(`${new Date().getFullYear()}-01-01`).getTime() / 1000);

  const entries: FinanceEntry[] = [];
  let hasMore = true;
  let startingAfter: string | null = null;

  while (hasMore) {
    const params = new URLSearchParams({
      limit: "100",
      "created[gte]": String(yearStart),
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const res = await fetch(`https://api.stripe.com/v1/charges?${params}`, {
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Stripe API error" }, { status: res.status });
    }

    const data = await res.json();

    for (const charge of data.data) {
      // Only count successful, non-refunded charges
      if (!charge.paid || charge.refunded) continue;

      const date = new Date(charge.created * 1000);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      entries.push({
        id: `stripe_${charge.id}`,
        date: `${yyyy}-${mm}-${dd}`,
        description: charge.description || charge.billing_details?.name || "Stripe payment",
        amount: charge.amount / 100, // cents → dollars
        type: "income",
        source: "stripe",
      });
    }

    hasMore = data.has_more;
    if (hasMore && data.data.length > 0) {
      startingAfter = data.data[data.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  return NextResponse.json({ entries, count: entries.length });
}
