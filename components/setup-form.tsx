"use client";

import { useState } from "react";
import { UserContext } from "@/lib/types";
import { getUserContext } from "@/lib/storage";

interface SetupFormProps {
  onSubmit: (ctx: UserContext) => void;
}

export function SetupForm({ onSubmit }: SetupFormProps) {
  const existing = getUserContext();

  const [senderName, setSenderName] = useState(existing?.senderName || "Dan McDermott");
  const [valueProposition, setValueProposition] = useState(existing?.valueProposition || "build lean content systems that turn founder expertise into leads");
  const [targetRoleType, setTargetRoleType] = useState(existing?.targetRoleType || "founders and CEOs");
  const [targetCompanyType, setTargetCompanyType] = useState(existing?.targetCompanyType || "small B2B SaaS teams");
  const [apiKey, setApiKey] = useState(existing?.apiKey || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ senderName, valueProposition, targetRoleType, targetCompanyType, apiKey });
  };

  const isValid = senderName && valueProposition && targetRoleType && targetCompanyType;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Your Name</label>
        <input
          type="text"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Dan McDermott"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          What do you help people do? <span className="text-zinc-400">(value prop)</span>
        </label>
        <input
          type="text"
          value={valueProposition}
          onChange={(e) => setValueProposition(e.target.value)}
          placeholder="e.g. build predictable sales pipelines without hiring an SDR"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Target role type
          </label>
          <input
            type="text"
            value={targetRoleType}
            onChange={(e) => setTargetRoleType(e.target.value)}
            placeholder="e.g. founders, VPs of Sales"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Target company type
          </label>
          <input
            type="text"
            value={targetCompanyType}
            onChange={(e) => setTargetCompanyType(e.target.value)}
            placeholder="e.g. B2B SaaS startups, agencies"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Anthropic API Key <span className="text-zinc-400">(for AI enrichment — optional)</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-zinc-400 mt-1">Stored locally. Used to generate personalized hooks via Claude.</p>
      </div>
      <button
        type="submit"
        disabled={!isValid}
        className="w-full py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Continue
      </button>
    </form>
  );
}
