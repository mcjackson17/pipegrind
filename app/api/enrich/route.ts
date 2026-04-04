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

  // Web search requires the beta header
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

  const researchPrompt = `Find recent, real information about ${fullName}, ${lead.title} at ${lead.company}.

Search for:
- Their LinkedIn posts or articles they've written
- Recent company news about ${lead.company} (funding, product launches, hiring, partnerships)
- Podcast appearances or conference talks by ${fullName}
- Any content they've published or been quoted in
${lead.industry ? `- Recent trends or news in the ${lead.industry} industry that relate to their role` : ""}

Return ONLY verified facts you actually found with sources. Be specific — include dates, titles, and details.
If you find nothing specific about this person or company, say exactly: "No specific information found."
Do NOT make anything up or speculate.`;

  const data = await callClaude(
    apiKey,
    "claude-sonnet-4-6",
    [{ role: "user", content: researchPrompt }],
    [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    1024
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
    ? "This hook opens a cold email."
    : "This hook is for a LinkedIn DM or connection request.";

  return `Write a 1-2 sentence cold outreach hook. Casual and direct — like texting a peer, not writing a corporate email.

${channelNote}

LEAD:
- Name: ${lead.firstName} ${lead.lastName}
- Title: ${lead.title}
- Company: ${lead.company}
${lead.industry ? `- Industry: ${lead.industry}` : ""}

RESEARCH / CONTEXT:
${research}

SENDER: Dan McDermott — helps ${userContext.targetRoleType} at ${userContext.targetCompanyType} ${userContext.valueProposition}. Dan is a content strategist based in San Diego. He went to Tufts and UCL. He's a founder himself, so he writes peer-to-peer, not vendor-to-buyer.

RULES:
- Reference ONLY things from the RESEARCH / CONTEXT section above
- Do NOT invent, assume, or fabricate ANY details — no fake compliments, no made-up content references
- If the research says "No specific information found" or is very thin, write a hook about a genuine, specific challenge that a ${lead.title} at a ${lead.industry || "similar"} company actually faces — be honest and direct, not fake-specific
- Don't start with "I" — start with something about them or their situation
- No corporate fluff, no buzzwords
- Keep it to 1-2 sentences max
- Sound like a founder talking to another founder, not an agency pitching a client

Write ONLY the hook — no subject line, no greeting, no sign-off.`;
}

export async function POST(request: NextRequest) {
  const { lead, userContext, channel, apiKey }: EnrichRequest = await request.json();

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  try {
    let research: string;

    // Step 1: Get research context
    if (lead.notes && lead.notes.trim()) {
      // User provided their own notes — use those directly
      research = lead.notes.trim();
    } else {
      // No user notes — do web search research
      research = await researchLead(apiKey, lead);
    }

    // Step 2: Generate hook from real research
    const hookPrompt = buildHookPrompt(lead, userContext, channel, research);

    const hookData = await callClaude(
      apiKey,
      "claude-haiku-4-5-20251001",
      [{ role: "user", content: hookPrompt }],
      undefined,
      150
    );

    const hook = extractTextFromResponse(hookData);

    return NextResponse.json({
      hook,
      research: lead.notes ? `User notes: ${lead.notes}` : research,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to enrich: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
