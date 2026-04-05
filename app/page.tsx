"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CSVUpload } from "@/components/csv-upload";
import { SetupForm } from "@/components/setup-form";
import { Lead, UserContext, Campaign } from "@/lib/types";
import { saveCampaign, setActiveCampaign, saveUserContext, getActiveCampaign, updateLead } from "@/lib/storage";
import { enrichBatch } from "@/lib/enrichment";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"check" | "setup" | "upload" | "enriching" | "ready">("check");
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const existing = getActiveCampaign();
    if (existing) {
      router.push("/daily");
    } else {
      setStep("setup");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetup = (ctx: UserContext) => {
    setUserContext(ctx);
    saveUserContext(ctx);
    setStep("upload");
  };

  const handleLeadsParsed = async (parsedLeads: Lead[]) => {
    setLeads(parsedLeads);

    // Save campaign immediately — before enrichment starts
    // This way if the user's computer restarts, the leads are already in localStorage
    const campaign = buildCampaign(parsedLeads);
    saveCampaign(campaign);
    setActiveCampaign(campaign.id);

    if (userContext?.apiKey) {
      setStep("enriching");
      const pending = parsedLeads.filter((l) => l.enrichmentStatus !== "done");
      setEnrichProgress({ done: 0, total: pending.length });

      await enrichBatch(
        parsedLeads,
        userContext,
        (done, total) => setEnrichProgress({ done, total }),
        // Save each lead to localStorage the moment its hook arrives
        (leadId, result) => {
          updateLead(campaign.id, leadId, {
            personalizedHook: result.hook || null,
            researchContext: result.research || null,
            sourceUrl: result.sourceUrl || null,
            enrichmentStatus: result.hook ? "done" : "failed",
          });
        }
      );
    }

    setStep("ready");
  };

  const buildCampaign = (initialLeads: Lead[]): Campaign => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + daysUntilMonday);

    return {
      id: `campaign_${Date.now()}`,
      name: `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      createdAt: now.toISOString(),
      weekStartDate: monday.toISOString().split("T")[0],
      leads: initialLeads,
      userContext: userContext!,
    };
  };

  if (step === "check") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-zinc-900">PipeGrind</h1>
          <p className="text-zinc-500 mt-2">100 sales actions a day. No excuses.</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-10">
          {["Setup", "Upload", "Go"].map((label, i) => {
            const stepIndex = step === "setup" ? 0 : step === "upload" ? 1 : 2;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i <= stepIndex ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-sm ${i <= stepIndex ? "text-zinc-900" : "text-zinc-400"}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-8 h-px bg-zinc-300" />}
              </div>
            );
          })}
        </div>

        {step === "setup" && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Tell me about you</h2>
            <p className="text-sm text-zinc-500 mb-5">This shapes your outreach templates.</p>
            <SetupForm onSubmit={handleSetup} />
          </div>
        )}

        {step === "upload" && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Upload your leads</h2>
            <p className="text-sm text-zinc-500 mb-5">
              Export a CSV from Apollo or Sales Navigator. We&apos;ll split it into daily batches of 100.
            </p>
            <CSVUpload onLeadsParsed={handleLeadsParsed} />
          </div>
        )}

        {step === "enriching" && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <div className="text-4xl mb-3">🔮</div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Enriching your leads</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Generating personalized hooks for each lead...
            </p>
            <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-purple-500 to-blue-500"
                style={{
                  width: `${enrichProgress.total > 0 ? (enrichProgress.done / enrichProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-sm text-zinc-500">
              {enrichProgress.done} / {enrichProgress.total} leads
            </p>
          </div>
        )}

        {step === "ready" && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">You&apos;re set!</h2>
            <p className="text-sm text-zinc-500 mb-2">
              {leads.length} leads split into daily batches of {Math.min(100, leads.length)}.
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              {leads.filter((l) => l.channel === "email").length} email &middot;{" "}
              {leads.filter((l) => l.channel === "linkedin").length} LinkedIn
            </p>
            <button
              onClick={() => router.push("/daily")}
              className="w-full py-3 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Start Today&apos;s Batch →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
