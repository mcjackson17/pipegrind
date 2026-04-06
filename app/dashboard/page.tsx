"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Campaign, DayOfWeek } from "@/lib/types";
import { getActiveCampaign, getDayProgress } from "@/lib/storage";
import { WeeklyChart } from "@/components/weekly-chart";

export default function DashboardPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const c = getActiveCampaign();
    if (!c) {
      router.push("/");
      return;
    }
    setCampaign(c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!campaign) return null;

  const days: DayOfWeek[] = [0, 1, 2, 3, 4];
  const totalDone = days.reduce((sum: number, day) => sum + getDayProgress(campaign, day).done, 0);
  const totalLeads = campaign.leads.length;
  const emailCount = campaign.leads.filter((l) => l.channel === "email").length;
  const linkedInCount = campaign.leads.filter((l) => l.channel === "linkedin").length;
  const repliedCount = campaign.leads.filter((l) => l.replied).length;
  const replyRate = totalDone > 0 ? Math.round((repliedCount / totalDone) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Weekly Dashboard</h1>
            <p className="text-sm text-zinc-500">{campaign.name}</p>
          </div>
          <Link
            href="/daily"
            className="text-sm px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
          >
            Back to Daily View
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">Total Done</p>
            <p className="text-2xl font-bold text-zinc-900">{totalDone}</p>
            <p className="text-xs text-zinc-400">of {totalLeads} leads</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">Reply Rate</p>
            <p className="text-2xl font-bold text-green-600">{replyRate}%</p>
            <p className="text-xs text-zinc-400">{repliedCount} of {totalDone} replied</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">Emails</p>
            <p className="text-2xl font-bold text-blue-600">{emailCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-sm text-zinc-500">LinkedIn</p>
            <p className="text-2xl font-bold text-purple-600">{linkedInCount}</p>
          </div>
        </div>

        <WeeklyChart campaign={campaign} />
      </div>
    </div>
  );
}
