"use client";

import { Campaign, Lead, DayProgress, DayOfWeek } from "./types";

const CAMPAIGNS_KEY = "lmw_campaigns";
const ACTIVE_CAMPAIGN_KEY = "lmw_active_campaign";
const USER_CONTEXT_KEY = "lmw_user_context";

export function saveCampaign(campaign: Campaign): void {
  const campaigns = getAllCampaigns();
  const existing = campaigns.findIndex((c) => c.id === campaign.id);
  if (existing >= 0) {
    campaigns[existing] = campaign;
  } else {
    campaigns.push(campaign);
  }
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function getAllCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CAMPAIGNS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getActiveCampaign(): Campaign | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(ACTIVE_CAMPAIGN_KEY);
  if (!id) return null;
  const campaigns = getAllCampaigns();
  return campaigns.find((c) => c.id === id) || null;
}

export function setActiveCampaign(id: string): void {
  localStorage.setItem(ACTIVE_CAMPAIGN_KEY, id);
}

export function updateLead(campaignId: string, leadId: string, updates: Partial<Lead>): Campaign | null {
  const campaigns = getAllCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;

  const lead = campaign.leads.find((l) => l.id === leadId);
  if (!lead) return null;

  Object.assign(lead, updates);
  saveCampaign(campaign);
  return campaign;
}

export function getLeadsForDay(campaign: Campaign, day: DayOfWeek): Lead[] {
  return campaign.leads
    .filter((l) => l.batchDay === day)
    .sort((a, b) => a.batchIndex - b.batchIndex);
}

export function getDayProgress(campaign: Campaign, day: DayOfWeek): DayProgress {
  const leads = getLeadsForDay(campaign, day);
  return {
    total: leads.length,
    done: leads.filter((l) => l.status === "done").length,
    skipped: leads.filter((l) => l.status === "skipped").length,
  };
}

export function getTodayDayOfWeek(): DayOfWeek | null {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  if (jsDay === 0 || jsDay === 6) return null; // Weekend
  return (jsDay - 1) as DayOfWeek; // Convert to 0=Mon, 4=Fri
}

export function saveUserContext(ctx: { senderName: string; valueProposition: string; targetRoleType: string; targetCompanyType: string; apiKey: string }): void {
  localStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(ctx));
}

export function getUserContext(): { senderName: string; valueProposition: string; targetRoleType: string; targetCompanyType: string; apiKey: string } | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(USER_CONTEXT_KEY);
  return data ? JSON.parse(data) : null;
}
