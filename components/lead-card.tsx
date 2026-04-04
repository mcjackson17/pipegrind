"use client";

import { useState } from "react";
import { Lead, UserContext } from "@/lib/types";
import { generateEmailTemplate, generateLinkedInTemplate } from "@/lib/templates";
import { MessageEditor } from "./message-editor";

interface LeadCardProps {
  lead: Lead;
  userContext: UserContext;
  onMarkDone: () => void;
  onSkip: () => void;
  isActive: boolean;
}

export function LeadCard({ lead, userContext, onMarkDone, onSkip, isActive }: LeadCardProps) {
  const [expanded, setExpanded] = useState(isActive);

  if (lead.status !== "pending") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-lg opacity-60">
        <span>{lead.status === "done" ? "✅" : "⏭️"}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-zinc-500">{lead.firstName} {lead.lastName}</span>
          <span className="text-xs text-zinc-400 ml-2">{lead.title} at {lead.company}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          lead.channel === "email" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
        }`}>
          {lead.channel === "email" ? "Email" : "LinkedIn"}
        </span>
      </div>
    );
  }

  // Only show a message template if enrichment is done AND a hook was found
  const hasHook = lead.enrichmentStatus === "done" && !!lead.personalizedHook;
  const enrichmentPending = lead.enrichmentStatus === "pending" || lead.enrichmentStatus === "enriching";
  const nothingFound = lead.enrichmentStatus === "done" && !lead.personalizedHook;

  const emailTemplate = hasHook && lead.channel === "email" ? generateEmailTemplate(lead, userContext) : null;
  const linkedInTemplate = hasHook && lead.channel === "linkedin" ? generateLinkedInTemplate(lead, userContext) : null;

  // Badge label
  let enrichmentBadge = null;
  if (hasHook) {
    enrichmentBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Personalized ✓</span>;
  } else if (nothingFound) {
    enrichmentBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">Nothing found</span>;
  } else if (enrichmentPending) {
    enrichmentBadge = <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400">Not enriched</span>;
  }

  return (
    <div className={`border rounded-xl transition-all ${
      isActive ? "border-blue-300 bg-white shadow-md" : "border-zinc-200 bg-white"
    }`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600">
          {lead.firstName[0]}{lead.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-zinc-900">
              {lead.firstName} {lead.lastName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              lead.channel === "email" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {lead.channel === "email" ? "Email" : "LinkedIn"}
            </span>
            {enrichmentBadge}
          </div>
          <p className="text-xs text-zinc-500 truncate">{lead.title} at {lead.company}</p>
        </div>
        <span className="text-zinc-400 text-sm">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 pt-3 space-y-3">
          {/* Lead details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {lead.email && (
              <div>
                <span className="text-zinc-400">Email:</span>{" "}
                <span className="text-zinc-700">{lead.email}</span>
              </div>
            )}
            {lead.linkedinUrl && (
              <div>
                <span className="text-zinc-400">LinkedIn:</span>{" "}
                <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Profile →
                </a>
              </div>
            )}
            {lead.industry && (
              <div>
                <span className="text-zinc-400">Industry:</span>{" "}
                <span className="text-zinc-700">{lead.industry}</span>
              </div>
            )}
            {lead.location && (
              <div>
                <span className="text-zinc-400">Location:</span>{" "}
                <span className="text-zinc-700">{lead.location}</span>
              </div>
            )}
          </div>

          {/* Personalized hook */}
          {hasHook && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">Personalized Hook</p>
              <p className="text-sm text-amber-900">{lead.personalizedHook}</p>
            </div>
          )}

          {/* Nothing found state — no template, just a clear message */}
          {nothingFound && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-zinc-500">Nothing found to personalize around</p>
              <p className="text-xs text-zinc-400 mt-1">
                Add a note to your CSV and re-enrich, or skip this lead.
              </p>
              {lead.linkedinUrl && (
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-blue-600 hover:underline"
                >
                  Research manually on LinkedIn →
                </a>
              )}
            </div>
          )}

          {/* Not yet enriched state */}
          {enrichmentPending && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-center">
              <p className="text-sm text-zinc-400">Run enrichment to generate a personalized hook</p>
            </div>
          )}

          {/* Research context — collapsible */}
          {lead.researchContext && lead.researchContext !== "No specific information found." && (
            <details className="bg-zinc-50 border border-zinc-200 rounded-lg">
              <summary className="px-3 py-2 text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-700">
                Research context (click to expand)
              </summary>
              <div className="px-3 pb-3 text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                {lead.researchContext}
              </div>
            </details>
          )}

          {/* User notes */}
          {lead.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Your Notes</p>
              <p className="text-sm text-blue-900">{lead.notes}</p>
            </div>
          )}

          {/* Message template — only shown when there's a real hook */}
          {emailTemplate && (
            <MessageEditor
              subject={emailTemplate.subject}
              body={emailTemplate.body}
              channel="email"
              onCopy={() => {}}
            />
          )}
          {linkedInTemplate && (
            <MessageEditor
              body={linkedInTemplate}
              channel="linkedin"
              onCopy={() => {}}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {(hasHook) && (
              <button
                onClick={onMarkDone}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Mark Done ✓
              </button>
            )}
            <button
              onClick={onSkip}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                hasHook
                  ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  : "flex-1 bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
              }`}
            >
              {nothingFound ? "Skip — nothing to send" : "Skip"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
