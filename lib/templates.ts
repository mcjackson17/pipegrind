import { Lead, UserContext } from "./types";

export function generateEmailTemplate(lead: Lead, ctx: UserContext): { subject: string; body: string } {
  const hook = lead.personalizedHook || `I came across ${lead.company} and wanted to reach out`;

  const subject = `Quick question about ${lead.company}`;

  const body = `Hey ${lead.firstName},

${hook}

I help ${ctx.targetRoleType} at ${ctx.targetCompanyType} ${ctx.valueProposition}. Would it make sense to chat for 15 min this week?

${ctx.senderName}`;

  return { subject, body };
}

export function generateLinkedInTemplate(lead: Lead, ctx: UserContext): string {
  const hook = lead.personalizedHook || `I came across your profile and thought we might be solving similar problems`;

  return `Hey ${lead.firstName} — ${hook}. Would love to connect and swap notes on ${ctx.valueProposition.split(" ").slice(0, 5).join(" ")}. No pitch, just think we're in similar worlds.`;
}

export function generateFullMessage(lead: Lead, ctx: UserContext): string {
  if (lead.channel === "email") {
    const { subject, body } = generateEmailTemplate(lead, ctx);
    return `Subject: ${subject}\n\n${body}`;
  }
  return generateLinkedInTemplate(lead, ctx);
}
