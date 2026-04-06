import { Lead, UserContext } from "./types";

export function generateEmailTemplate(lead: Lead, ctx: UserContext): { subject: string; body: string } {
  const hook = lead.personalizedHook || null;

  const subject = lead.personalizedSubject
    ? lead.personalizedSubject
    : hook
    ? `Quick question, ${lead.firstName}`
    : `${lead.firstName} — quick question`;

  const body = hook
    ? `Hey ${lead.firstName},

${hook}

That's exactly what I work on — I help ${ctx.targetRoleType} at ${ctx.targetCompanyType} ${ctx.valueProposition}. Would it make sense to grab 15 min this week?

${ctx.senderName}`
    : `Hey ${lead.firstName},

Working with a few ${ctx.targetRoleType} at ${ctx.targetCompanyType} right now and figured I'd reach out directly. I help them ${ctx.valueProposition} — without the overhead of a full content team.

Worth a 15 min chat?

${ctx.senderName}`;

  return { subject, body };
}

export function generateLinkedInTemplate(lead: Lead, ctx: UserContext): string {
  const hook = lead.personalizedHook;

  if (hook) {
    return `Hey ${lead.firstName} — ${hook}. That's exactly the kind of thing I work on. Would love to connect.`;
  }

  return `Hey ${lead.firstName} — working with a few ${ctx.targetRoleType} on ${ctx.valueProposition}. Thought it'd be worth connecting directly. No pitch.`;
}

export function generateFullMessage(lead: Lead, ctx: UserContext): string {
  if (lead.channel === "email") {
    const { subject, body } = generateEmailTemplate(lead, ctx);
    return `Subject: ${subject}\n\n${body}`;
  }
  return generateLinkedInTemplate(lead, ctx);
}
