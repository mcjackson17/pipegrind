import { Lead, UserContext } from "./types";

export interface EnrichResult {
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
  onProgress: (completed: number, total: number) => void,
  onLeadEnriched?: (leadId: string, result: EnrichResult) => void
): Promise<Map<string, EnrichResult>> {
  // Only enrich leads that haven't been done yet
  const pending = leads.filter((l) => l.enrichmentStatus !== "done");
  const results = new Map<string, EnrichResult>();
  const CONCURRENCY = 2;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (lead) => {
      try {
        const result = await enrichLead(lead, ctx);
        results.set(lead.id, result);
        // Save to localStorage immediately — don't wait for the full batch
        onLeadEnriched?.(lead.id, result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Enrichment failed for ${lead.firstName} ${lead.lastName}:`, msg);
        results.set(lead.id, { hook: "", research: `Error: ${msg}` });
        // Still call the callback so the lead gets marked as failed in localStorage
        onLeadEnriched?.(lead.id, { hook: "", research: `Error: ${msg}` });
      }
    });

    await Promise.all(promises);
    onProgress(Math.min(i + CONCURRENCY, pending.length), pending.length);
  }

  return results;
}
