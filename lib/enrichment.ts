import { Lead, UserContext } from "./types";

interface EnrichResult {
  hook: string;
  research: string;
}

export async function enrichLead(lead: Lead, ctx: UserContext): Promise<EnrichResult> {
  const response = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        title: lead.title,
        company: lead.company,
        industry: lead.industry,
        companySize: lead.companySize,
        location: lead.location,
        notes: lead.notes,
      },
      userContext: {
        valueProposition: ctx.valueProposition,
        targetRoleType: ctx.targetRoleType,
        targetCompanyType: ctx.targetCompanyType,
      },
      channel: lead.channel,
      apiKey: ctx.apiKey,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Enrichment failed");
  }

  const data = await response.json();
  return { hook: data.hook, research: data.research };
}

export async function enrichBatch(
  leads: Lead[],
  ctx: UserContext,
  onProgress: (completed: number, total: number) => void
): Promise<Map<string, EnrichResult>> {
  const results = new Map<string, EnrichResult>();
  const CONCURRENCY = 2; // Reduced from 3 — web search calls take longer

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (lead) => {
      try {
        const result = await enrichLead(lead, ctx);
        results.set(lead.id, result);
      } catch {
        results.set(lead.id, { hook: "", research: "" });
      }
    });

    await Promise.all(promises);
    onProgress(Math.min(i + CONCURRENCY, leads.length), leads.length);
  }

  return results;
}
