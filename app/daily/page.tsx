"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lead, DayOfWeek, DAY_LABELS } from "@/lib/types";
import { getActiveCampaign, getLeadsForDay, getDayProgress, updateLead, getTodayDayOfWeek } from "@/lib/storage";
import { LeadCard } from "@/components/lead-card";
import { ProgressBar } from "@/components/progress-bar";

export default function DailyPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState(getActiveCampaign());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek() ?? 0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadIndex, setActiveLeadIndex] = useState(0);

  const refreshData = useCallback(() => {
    const c = getActiveCampaign();
    setCampaign(c);
    if (c) {
      const dayLeads = getLeadsForDay(c, selectedDay);
      setLeads(dayLeads);
      // Find first pending lead
      const firstPending = dayLeads.findIndex((l) => l.status === "pending");
      setActiveLeadIndex(firstPending >= 0 ? firstPending : 0);
    }
  }, [selectedDay]);

  useEffect(() => {
    if (!campaign) {
      router.push("/");
      return;
    }
    refreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const handleAction = (leadId: string, action: "done" | "skipped") => {
    if (!campaign) return;
    const updated = updateLead(campaign.id, leadId, { status: action });
    if (updated) {
      setCampaign(updated);
      const dayLeads = getLeadsForDay(updated, selectedDay);
      setLeads(dayLeads);
      // Move to next pending
      const nextPending = dayLeads.findIndex((l, i) => i > activeLeadIndex && l.status === "pending");
      if (nextPending >= 0) {
        setActiveLeadIndex(nextPending);
      }
    }
  };

  if (!campaign) return null;

  const progress = getDayProgress(campaign, selectedDay);
  const today = getTodayDayOfWeek();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-zinc-900">Lead Magnet Wizard</h1>
              <p className="text-xs text-zinc-500">{campaign.name}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Weekly View
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem("lmw_active_campaign");
                  router.push("/");
                }}
                className="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                New Campaign
              </button>
            </div>
          </div>

          {/* Day selector */}
          <div className="flex gap-1 mb-3">
            {([0, 1, 2, 3, 4] as DayOfWeek[]).map((day) => {
              const dayProgress = getDayProgress(campaign, day);
              const isToday = day === today;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-zinc-900 text-white"
                      : isToday
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <div>{DAY_LABELS[day].slice(0, 3)}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {dayProgress.done}/{dayProgress.total}
                  </div>
                </button>
              );
            })}
          </div>

          <ProgressBar progress={progress} label={`${DAY_LABELS[selectedDay]}'s Progress`} />
        </div>
      </div>

      {/* Lead list */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="space-y-2">
          {leads.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-lg mb-1">No leads for {DAY_LABELS[selectedDay]}</p>
              <p className="text-sm">Upload more leads or check another day.</p>
            </div>
          ) : (
            leads.map((lead, index) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                userContext={campaign.userContext}
                isActive={index === activeLeadIndex && lead.status === "pending"}
                onMarkDone={() => handleAction(lead.id, "done")}
                onSkip={() => handleAction(lead.id, "skipped")}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
