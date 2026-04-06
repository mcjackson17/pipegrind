"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lead, DayOfWeek, DAY_LABELS } from "@/lib/types";
import { getActiveCampaign, getLeadsForDay, getDayProgress, updateLead, getTodayDayOfWeek, getUserContext } from "@/lib/storage";
import { enrichBatch, enrichLead } from "@/lib/enrichment";
import { LeadCard } from "@/components/lead-card";
import { ProgressBar } from "@/components/progress-bar";

export default function DailyPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState(getActiveCampaign());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek() ?? 0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadIndex, setActiveLeadIndex] = useState(0);
  const [resuming, setResuming] = useState(false);
  const [resumeProgress, setResumeProgress] = useState({ done: 0, total: 0 });

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

  const handleToggleReply = (leadId: string) => {
    if (!campaign) return;
    const lead = campaign.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const updated = updateLead(campaign.id, leadId, { replied: !lead.replied });
    if (updated) {
      setCampaign(updated);
      setLeads(getLeadsForDay(updated, selectedDay));
    }
  };

  const handleReenrich = async (leadId: string, noteOverride?: string) => {
    if (!campaign) return;
    const ctx = getUserContext();
    if (!ctx?.apiKey) return;

    const lead = campaign.leads.find((l) => l.id === leadId);
    if (!lead) return;

    // Save the note override to the lead first
    if (noteOverride) {
      updateLead(campaign.id, leadId, { notes: noteOverride, enrichmentStatus: "enriching" });
    } else {
      updateLead(campaign.id, leadId, { enrichmentStatus: "enriching" });
    }

    const leadWithNote = noteOverride ? { ...lead, notes: noteOverride } : lead;

    try {
      const result = await enrichLead(leadWithNote, ctx);
      const updated = updateLead(campaign.id, leadId, {
        notes: noteOverride ?? lead.notes,
        personalizedHook: result.hook || null,
        personalizedSubject: result.subject || null,
        researchContext: result.research || null,
        sourceUrl: result.sourceUrl || null,
        enrichmentStatus: result.hook ? "done" : "failed",
      });
      if (updated) {
        setCampaign(updated);
        setLeads(getLeadsForDay(updated, selectedDay));
      }
    } catch {
      updateLead(campaign.id, leadId, { enrichmentStatus: "failed" });
      refreshData();
    }
  };

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

  const handleResumeEnrichment = async () => {
    if (!campaign) return;
    const ctx = getUserContext();
    if (!ctx?.apiKey) return;

    const unenriched = campaign.leads.filter((l) => l.enrichmentStatus !== "done");
    if (unenriched.length === 0) return;

    setResuming(true);
    setResumeProgress({ done: 0, total: unenriched.length });

    await enrichBatch(
      unenriched,
      ctx,
      (done, total) => setResumeProgress({ done, total }),
      (leadId, result) => {
        updateLead(campaign.id, leadId, {
          personalizedHook: result.hook || null,
          personalizedSubject: result.subject || null,
          researchContext: result.research || null,
          sourceUrl: result.sourceUrl || null,
          enrichmentStatus: result.hook ? "done" : "failed",
        });
      }
    );

    setResuming(false);
    refreshData();
  };

  if (!campaign) return null;

  const unenrichedCount = campaign.leads.filter((l) => l.enrichmentStatus !== "done").length;
  const hasApiKey = !!getUserContext()?.apiKey;
  const progress = getDayProgress(campaign, selectedDay);
  const today = getTodayDayOfWeek();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-zinc-900">PipeGrind</h1>
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

      {/* Resume enrichment banner */}
      {unenrichedCount > 0 && hasApiKey && !resuming && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-amber-800">
                {unenrichedCount} leads still need personalized hooks
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Enrichment was interrupted — click to resume where it left off
              </p>
            </div>
            <button
              onClick={handleResumeEnrichment}
              className="ml-4 shrink-0 text-sm px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {resuming && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-800">Enriching leads...</p>
              <p className="text-sm text-purple-600">{resumeProgress.done} / {resumeProgress.total}</p>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${resumeProgress.total > 0 ? (resumeProgress.done / resumeProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
                onToggleReply={() => handleToggleReply(lead.id)}
                onReenrich={(noteOverride) => handleReenrich(lead.id, noteOverride)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
