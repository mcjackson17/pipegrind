import { NextRequest, NextResponse } from "next/server";

interface EnrichRequest {
  lead: {
    firstName: string;
    lastName: string;
    title: string;
    company: string;
    industry: string | null;
    companySize: string | null;
    location: string | null;
    notes: string | null;
  };
  userContext: {
    valueProposition: string;
    targetRoleType: string;
    targetCompanyType: string;
  };
  channel: "email" | "linkedin";
  apiKey: string;
}

async function callClaude(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  tools?: unknown[],
  maxTokens = 1024
) {
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  if (tools && tools.length > 0) {
    headers["anthropic-beta"] = "web-search-2025-03-05";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  return response.json();
}

function extractTextFromResponse(data: { content: { type: string; text?: string }[] }): string {
  return data.content
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text?: string }) => block.text || "")
    .join("\n")
    .trim();
}

async function researchLead(
  apiKey: string,
  lead: EnrichRequest["lead"]
): Promise<string> {
  const fullName = `${lead.firstName} ${lead.lastName}`;

  const researchPrompt = `You are doing pre-call research for a cold outreach message. Find SPECIFIC, RECENT, REAL information about ${fullName}, ${lead.title} at ${lead.company}.

Search for these in order of priority:
1. LinkedIn posts or articles written by ${fullName} in the last 6 months — what topics do they post about? Any specific opinions or insights they've shared?
2. Podcast appearances, conference talks, or interviews featuring ${fullName}
3. Recent news about ${lead.company} — funding rounds, product launches, new hires, partnerships, press coverage
4. Any content ${fullName} has published — blog posts, newsletters, videos, threads
5. ${lead.company} website — what do they actually do, what's their positioning, any recent announcements

Return ONLY what you actually found. For each finding, include:
- What you found (be specific — quote titles, topics, dates if available)
- Where you found it (URL or source)

If you genuinely find nothing specific about this person or company after searching, respond with exactly: "NOTHING_FOUND"

Do NOT summarize their industry. Do NOT describe what someone in their role typically does. Only report verified facts about THIS specific person or company.`;

  const data = await callClaude(
    apiKey,
    "claude-sonnet-4-6",
    [{ role: "user", content: researchPrompt }],
    [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    1500
  );

  return extractTextFromResponse(data);
}

function buildHookPrompt(
  lead: EnrichRequest["lead"],
  userContext: EnrichRequest["userContext"],
  channel: "email" | "linkedin",
  research: string
): string {
  const channelNote = channel === "email"
    ? "This hook is the opening line of a cold email — after 'Hey [Name],'."
    : "This hook is the opening of a LinkedIn DM or connection request note.";

  return `You are writing a cold outreach hook for Dan McDermott, a content strategist in San Diego who helps ${userContext.targetRoleType} at ${userContext.targetCompanyType} ${userContext.valueProposition}. Dan is a founder himself — he writes peer-to-peer, not vendor-to-buyer.

${channelNote}

LEAD: ${lead.firstName} ${lead.lastName}, ${lead.title} at ${lead.company}

RESEARCH FOUND:
${research}

YOUR JOB:
Write a 1-2 sentence hook that references something SPECIFIC from the research above. The hook should make ${lead.firstName} think "this person actually looked me up."

STRICT RULES:
- You MUST reference something specific from the research — a real post, a real piece of news, a real thing they said or did
- Do NOT start with "I" — open with something about them
- Do NOT use phrases like "I noticed", "I came across", "I saw that" — be more direct
- Do NOT write generic observations about their industry or role
- Do NOT compliment them vaguely ("great work", "impressive journey")
- Keep it to 1-2 sentences max
- Casual and direct — like texting a peer

If the research doesn't contain anything specific enough to reference honestly, respond with exactly: "NO_HOOK"

Write ONLY the hook or "NO_HOOK" — nothing else.`;
}

export async function POST(request: NextRequest) {
  const { lead, userContext, channel, apiKey }: EnrichRequest = await request.json();

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  try {
    let research: string;

    if (lead.notes && lead.notes.trim()) {
      // User provided their own notes — use these directly, skip web search
      research = `USER NOTES: ${lead.notes.trim()}`;
    } else {
      research = await researchLead(apiKey, lead);
    }

    // If research came back empty, return no hook rather than faking it
    if (research === "NOTHING_FOUND" || research.trim() === "") {
      return NextResponse.json({ hook: "", research: "No specific information found." });
    }

    const hookPrompt = buildHookPrompt(lead, userContext, channel, research);

    const hookData = await callClaude(
      apiKey,
      "claude-sonnet-4-6",
      [{ role: "user", content: hookPrompt }],
      undefined,
      200
    );

    const hook = extractTextFromResponse(hookData);

    // If the model couldn't find anything specific enough, return no hook
    if (hook === "NO_HOOK" || hook.trim() === "") {
      return NextResponse.json({ hook: "", research });
    }

    return NextResponse.json({ hook, research });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to enrich: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
