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
        <span className={`text-lg ${lead.status === "done" ? "" : ""}`}>
          {lead.status === "done" ? "✅" : "⏭️"}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-zinc-500">
            {lead.firstName} {lead.lastName}
          </span>
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

  const emailTemplate = lead.channel === "email" ? generateEmailTemplate(lead, userContext) : null;
  const linkedInTemplate = lead.channel === "linkedin" ? generateLinkedInTemplate(lead, userContext) : null;

  return (
    <div
      className={`border rounded-xl transition-all ${
        isActive ? "border-blue-300 bg-white shadow-md" : "border-zinc-200 bg-white"
      }`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-medium text-zinc-600">
          {lead.firstName[0]}{lead.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-zinc-900">
              {lead.firstName} {lead.lastName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              lead.channel === "email" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {lead.channel === "email" ? "Email" : "LinkedIn"}
            </span>
            {lead.enrichmentStatus === "done" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Personalized
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate">
            {lead.title} at {lead.company}
          </p>
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
                <a
                  href={lead.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
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
          {lead.personalizedHook && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1">Personalized Hook</p>
              <p className="text-sm text-amber-900">{lead.personalizedHook}</p>
            </div>
          )}

          {/* Research context — collapsible */}
          {lead.researchContext && (
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

          {/* Message template */}
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
            <button
              onClick={onMarkDone}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Mark Done ✓
            </button>
            <button
              onClick={onSkip}
              className="py-2 px-4 bg-zinc-100 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
