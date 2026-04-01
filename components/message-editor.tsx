"use client";

import { useState } from "react";

interface MessageEditorProps {
  subject?: string;
  body: string;
  channel: "email" | "linkedin";
  onCopy: () => void;
}

export function MessageEditor({ subject, body, channel, onCopy }: MessageEditorProps) {
  const [editedSubject, setEditedSubject] = useState(subject || "");
  const [editedBody, setEditedBody] = useState(body);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullMessage = channel === "email" && editedSubject
      ? `Subject: ${editedSubject}\n\n${editedBody}`
      : editedBody;

    await navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {channel === "email" && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Subject</label>
          <input
            type="text"
            value={editedSubject}
            onChange={(e) => setEditedSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">
          {channel === "email" ? "Body" : "Message"}
        </label>
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
        />
      </div>
      <button
        onClick={handleCopy}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          copied
            ? "bg-green-100 text-green-700"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        {copied ? "Copied!" : "Copy to Clipboard"}
      </button>
    </div>
  );
}
