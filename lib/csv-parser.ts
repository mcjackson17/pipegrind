import { Lead, DayOfWeek } from "./types";

interface ParsedRow {
  [key: string]: string;
}

// Common column name mappings from Apollo and Sales Navigator
const COLUMN_MAPS: Record<string, string[]> = {
  firstName: ["first name", "first_name", "firstname", "first"],
  lastName: ["last name", "last_name", "lastname", "last"],
  email: ["email", "email address", "email_address", "contact email", "work email"],
  title: ["title", "job title", "job_title", "position", "role"],
  company: ["company", "company name", "company_name", "organization", "account name"],
  linkedinUrl: ["linkedin", "linkedin url", "linkedin_url", "person linkedin url", "linkedin profile", "profile url"],
  industry: ["industry", "company industry"],
  companySize: ["company size", "employees", "# employees", "company_size", "number of employees"],
  location: ["location", "city", "person city", "state", "country"],
  notes: ["notes", "trigger", "trigger event", "context", "reason", "personalization", "note"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_\-]/g, " ");
}

function mapColumn(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(COLUMN_MAPS)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csvText: string): { leads: Lead[]; unmappedColumns: string[]; totalRows: number } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { leads: [], unmappedColumns: [], totalRows: 0 };
  }

  const headers = parseCSVLine(lines[0]);
  const columnMapping: Record<number, string> = {};
  const unmappedColumns: string[] = [];

  headers.forEach((header, index) => {
    const mapped = mapColumn(header);
    if (mapped) {
      columnMapping[index] = mapped;
    } else {
      unmappedColumns.push(header);
    }
  });

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: ParsedRow = {};

    for (const [index, field] of Object.entries(columnMapping)) {
      row[field] = values[parseInt(index)] || "";
    }

    // Skip rows without a name
    if (!row.firstName && !row.lastName) continue;

    const hasEmail = !!(row.email && row.email.includes("@"));

    const lead: Lead = {
      id: `lead_${Date.now()}_${i}`,
      firstName: row.firstName || "",
      lastName: row.lastName || "",
      email: hasEmail ? row.email : null,
      title: row.title || "",
      company: row.company || "",
      linkedinUrl: row.linkedinUrl || null,
      industry: row.industry || null,
      companySize: row.companySize || null,
      location: row.location || null,
      notes: row.notes || null,
      researchContext: null,
      personalizedHook: null,
      enrichmentStatus: "pending",
      channel: hasEmail ? "email" : "linkedin",
      status: "pending",
      batchDay: 0,
      batchIndex: 0,
    };

    leads.push(lead);
  }

  // Auto-batch: split into groups of up to 100 per day
  assignBatches(leads);

  return { leads, unmappedColumns, totalRows: lines.length - 1 };
}

function assignBatches(leads: Lead[]): void {
  // Shuffle to mix email and LinkedIn leads across days
  const shuffled = [...leads].sort(() => Math.random() - 0.5);

  // But then sort so email-first leads come before LinkedIn-only
  shuffled.sort((a, b) => {
    if (a.channel === "email" && b.channel === "linkedin") return -1;
    if (a.channel === "linkedin" && b.channel === "email") return 1;
    return 0;
  });

  const BATCH_SIZE = 100;
  shuffled.forEach((lead, index) => {
    const originalLead = leads.find((l) => l.id === lead.id)!;
    originalLead.batchDay = Math.min(Math.floor(index / BATCH_SIZE), 4) as DayOfWeek;
    originalLead.batchIndex = index % BATCH_SIZE;
  });
}
