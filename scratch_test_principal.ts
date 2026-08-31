import { isSupportOrNonTeachingRole } from './src/lib/crawler/roleClassifier';
import { triageVacancyLifecycle } from './src/lib/crawler/dateParser';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env.local') });

const cleanScrapedJobsList = (jobs: string[], schoolName?: string): string[] => {
  return jobs;
};

const reconstructStructuredVacancies = (scrapedList: string[], schoolName?: string, city?: string): any[] => {
  const cleanedList = cleanScrapedJobsList(scrapedList, schoolName);
  const getRecruitmentCycle = (v: any): "CURRENT" | "HISTORIC_Y1" => {
    const dateStr = v.date_listed || v.date_closing;
    if (!dateStr) return "CURRENT";
    const cleanDateStr = dateStr.replace(/posted:\s*/i, '').trim();
    const d = new Date(cleanDateStr);
    if (isNaN(d.getTime())) return "CURRENT";
    const twelveMonthsAgo = new Date("2025-05-21");
    return d >= twelveMonthsAgo ? "CURRENT" : "HISTORIC_Y1";
  };

  const parsed = cleanedList.map(job => {
    let jobUrl = "";
    let workingStr = job;
    const urlParts = job.split(" || ");
    if (urlParts.length > 1) {
      workingStr = urlParts[0].trim();
      jobUrl = urlParts[1].trim();
    }

    const lastDashIdx = workingStr.lastIndexOf(' - ');
    let main = workingStr;
    let source = 'Web';
    if (lastDashIdx !== -1) {
      main = workingStr.substring(0, lastDashIdx).trim();
      source = workingStr.substring(lastDashIdx + 3).trim();
    }

    const parenIdx = main.indexOf('(');
    const rawTitle = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();
    let title = rawTitle.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (title.length > 80) {
      title = title.substring(0, 80).trim();
    }

    const parentheticalMatches = [...job.matchAll(/\(([^)]+)\)/g)];
    let date_listed = '';
    let closesDate = '';
    if (parentheticalMatches.length > 0) {
      const dateParenthetical = parentheticalMatches.find(m => {
        const text = m[1].toLowerCase();
        return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
      }) || parentheticalMatches[parentheticalMatches.length - 1];
      
      const content = dateParenthetical[1];
      const parts = content.split(';').map(s => s.trim());
      const postedPart = parts.find(p => p.toLowerCase().includes('posted:'));
      if (postedPart) {
        date_listed = postedPart.replace(/posted:\s*/i, '').trim();
      } else {
        date_listed = content.trim();
      }
      const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
      if (closesPart) {
        closesDate = closesPart.replace(/closes:\s*/i, '').trim();
      }
    }
    
    let status = "OPEN";
    if (job.toLowerCase().includes("closes:") && !job.toLowerCase().includes("posted:")) {
      status = "CLOSED";
    }
    if (/202[4-5]|archive|cycle/i.test(job)) {
      status = "CLOSED";
    }

    let date_listed_val: string | null = date_listed || "21 May 2026";
    let date_closing_val: string | null = closesDate || null;

    if (status === "OPEN" && date_closing_val) {
      const closes = new Date(date_closing_val);
      const today = new Date();
      if (!isNaN(closes.getTime()) && closes < today) {
        status = "CLOSED";
      }
    }

    if (status === "OPEN") {
      const isAnchor = date_listed_val && (date_listed_val === "21 May 2026" || date_listed_val.includes("21 May 2026"));
      if (isAnchor && date_closing_val) {
        date_listed_val = null;
      }
    } else {
      date_closing_val = null;
    }

    const item: any = {
      title,
      source,
      source_url: jobUrl || "",
      date_listed: date_listed_val,
      date_closing: date_closing_val,
      status
    };
    item.recruitmentCycle = getRecruitmentCycle(item);
    return item;
  }).filter((v): v is NonNullable<typeof v> => v !== null);

  return parsed;
};

const rawJob = "Elementary School Principal, Puxi Campus, Shanghai (Aug 2026; Posted: 27 Aug 2026; Closes: 17 Oct 2026) - TES || https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE7_x-RFwVxRP2JG7EY5VGbZqPKnJo2H6h5Iov16k0n2zvXhL2AL02Tx9lZC1wC_AzBz2vge8w2hFQEXNw-lxHCScGfrHGG36_1Lq2ADD8iTqy9-M4jQlD7x3SSvJhcpSb-oMND0_dPhHfI759k_NSCHvLMGGQ9zBHdfGnYgCQMj0oZZGmn1BdQEY3bWMs91T1UDb0==";

async function test() {
  const parsed = reconstructStructuredVacancies([rawJob], "Shanghai American School", "Shanghai");
  console.log("Parsed result:", JSON.stringify(parsed, null, 2));

  const filtered = parsed.filter(v => (v.recruitmentCycle === 'CURRENT' || !v.recruitmentCycle) && !isSupportOrNonTeachingRole(v.title));
  console.log("After initial filters:", JSON.stringify(filtered, null, 2));

  if (filtered.length > 0) {
    const v = filtered[0];
    const rawClosing = v.closesDate || v.date_closing || null;
    const triage = triageVacancyLifecycle(rawClosing);
    console.log("Triage result:", JSON.stringify(triage, null, 2));
  }
}

test().catch(console.error);
