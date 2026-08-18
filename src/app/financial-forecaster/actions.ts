'use server';

import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), 'scratch/stability_cache.json');

const readLocalCache = (): Record<string, any> => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to read local stability cache:", e);
  }
  return {};
};

const writeLocalCache = (schoolId: string, data: any) => {
  try {
    const cache = readLocalCache();
    cache[schoolId] = data;
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write local stability cache:", e);
  }
};

function getRecruitmentSeasonForCountry(country?: string): string {
  const c = (country || "").toLowerCase().trim();
  const currentMonth = new Date().getMonth(); // 0 = Jan, 11 = Dec

  const southernHemisphere = [
    'australia', 'new zealand', 'south africa', 'argentina', 'brazil', 
    'peru', 'chile', 'uruguay', 'kenya', 'tanzania', 'south-africa', 'new-zealand'
  ];
  const aprilMarchCycle = ['japan', 'south korea', 'south-korea'];

  if (southernHemisphere.some(name => c.includes(name))) {
    if (currentMonth >= 4 && currentMonth <= 7) {
      return "Early Bird Phase (May-Aug Window) for Southern Hemisphere Calendar (Starts Jan/Feb)";
    } else if (currentMonth >= 8 && currentMonth <= 9) {
      return "Standard Phase (Sep-Oct Window) for Southern Hemisphere Calendar (Starts Jan/Feb)";
    } else {
      return "Late-Cycle/Panic Resignations (Nov-Jan Window) for Southern Hemisphere Calendar (Starts Jan/Feb)";
    }
  } else if (aprilMarchCycle.some(name => c.includes(name))) {
    if (currentMonth >= 7 && currentMonth <= 10) {
      return "Early Bird Phase (Aug-Nov Window) for Japanese/Korean Calendar (Starts Mar/Apr)";
    } else if (currentMonth === 11 || currentMonth <= 0) {
      return "Standard Phase (Dec-Jan Window) for Japanese/Korean Calendar (Starts Mar/Apr)";
    } else {
      return "Late-Cycle/Panic Resignations (Feb-Apr Window) for Japanese/Korean Calendar (Starts Mar/Apr)";
    }
  } else {
    if (currentMonth >= 9 || currentMonth <= 0) {
      return "Early Bird Phase (Oct-Jan Window)";
    } else if (currentMonth >= 1 && currentMonth <= 3) {
      return "Standard Phase (Feb-Apr Window)";
    } else {
      return "Late-Cycle/Panic Resignations (May-Aug Window)";
    }
  }
}

interface ScrapedVacancy {
  title: string;
  source: string;
  source_url?: string;
  tes_employer_slug?: string;
}

function reconstructJobBoardUrl(vacancy: ScrapedVacancy, schoolBaseUrl: string): string {
  const sourceNormalized = vacancy.source.toLowerCase();
  const cleanedTitle = vacancy.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

  // 1. TES Link Reconstruction Heuristics
  if (sourceNormalized.includes('tes')) {
    // If the engine extracted the explicit employer code block, route straight to their live portal overview
    if (vacancy.tes_employer_slug) {
      return `https://www.tes.com/jobs/employer/${vacancy.tes_employer_slug}`;
    }
    // Hardcoded fallback override for known entities (e.g., Parklane) to prevent generic homepages
    if (schoolBaseUrl.includes('parklane')) {
      return `https://www.tes.com/jobs/employer/parklane-international-school-1065604`;
    }
    // If all else fails, use TES search directory parameterized specifically to international school positions
    return `https://www.tes.com/jobs/browse/international`;
  }

  // 2. School Web Direct Subdirectory Protection
  if (sourceNormalized.includes('school web') || sourceNormalized.includes('portal')) {
    const rootUrlClean = schoolBaseUrl.replace(/\/$/, '');
    
    // Catch cases where the engine lazily passed the bare homepage root
    if (!vacancy.source_url || vacancy.source_url === schoolBaseUrl || vacancy.source_url === `${schoolBaseUrl}/`) {
      return `${rootUrlClean}/about-us/job-opportunities/`; 
    }
    return vacancy.source_url;
  }

  // 3. Regional Aggregators (Jobs.cz / Expats.cz / Indeed)
  if (sourceNormalized.includes('jobs.cz') || sourceNormalized.includes('expats')) {
    if (vacancy.source_url && vacancy.source_url.startsWith('http')) {
      return vacancy.source_url; // Retain cached crawling footprint strings if present
    }
    // Fall back directly to localized search strings rather than landing them on empty global homepages
    return `https://cz.indeed.com/q-english-international-school-l-hlavn%C3%AD-m%C4%9Bsto-praha-nab%C3%ADdky-pr%C3%A1ce.html`;
  }

  return vacancy.source_url || `${schoolBaseUrl.replace(/\/$/, '')}/vacancies`;
}

function getSchoolBaseUrl(schoolId: string, schoolName: string): string {
  const lowerName = schoolName.toLowerCase();
  const lowerId = schoolId.toLowerCase();
  if (lowerName.includes("parklane") || lowerId.includes("parklane") || lowerId === "flis0202") {
    return "https://www.parklane-is.cz";
  }
  if (lowerName.includes("riverside") || lowerId.includes("riverside") || lowerId === "flis0059") {
    return "https://www.riversideschool.cz";
  }
  const slug = schoolName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  return `https://www.${slug}.com`;
}

export interface EvaluateOfferInput {
    schoolName: string;
    location: string;
    country: string;
    monthlySavings: number;
    currency: string;
    familyStatus: string;
}

export interface EvaluateOfferOutput {
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
    overallScore: number;
}

/**
 * Generates a tactical SWOT analysis of a potential teaching contract offer.
 * @param input - The contract offer parameters (school, location, savings, etc.)
 * @returns An object containing the generated SWOT data or an error message.
 */
export async function getOfferTacticalVerdict(input: EvaluateOfferInput): Promise<{ data: EvaluateOfferOutput | null; error: string | null; }> {
    try {
        // 🛡️ Data validation check before sending to AI
        if (!input.schoolName || !input.location) {
            throw new Error("Incomplete intelligence: School and Location data required.");
        }

        // 🛰️ DYNAMIC IMPORT TO BYPASS CLIENT BUNDLER CLASH DURING SSR
        const { evaluateOffer } = await import('@/ai/flows/evaluate-offer-flow');

        const data = await evaluateOffer(input);
        return { data, error: null };
    } catch (e: any) {
        // 🕵️ Log the full trace for the developer, but return a clean string to the UI
        console.error("AI Verdict Generation Failed:", e);
        
        return { 
            data: null, 
            error: typeof e === 'string' ? e : e.message || "Uplink failure during verdict generation. Intelligence pipeline is offline." 
        };
    }
}

/**
 * Dynamic Server Action to rephrase the cached briefing into a strict, candid UK English "staffroom chat" style.
 */
export async function rewordDossierBriefing(input: {
    briefing: string;
    schoolName: string;
    familyStatus: string;
}): Promise<{ data: string | null; error: string | null; }> {
    try {
        if (!input.briefing) {
            throw new Error("Source briefing text is required for translation.");
        }

        // 🛰️ DYNAMIC IMPORT TO BYPASS CLIENT BUNDLER CLASH DURING SSR
        const { getAI } = await import('@/ai/genkit');

        const ai = getAI();
        const response = await ai.generate({
            prompt: `You are an elite, highly experienced British international school teacher and recruitment coordinator.
Your task is to reword the following detailed school intelligence dossier so that it retains 100% of its factual information, numbers, curriculum details, housing notes, and saving/expense insights, but sounds completely fresh, unique, and written in a candid, authentic staffroom coffee-chat vibe with strictly UK English teacher-talk phrasing.

Factual Source Dossier:
${input.briefing}

Additional Context:
- Target School: ${input.schoolName}
- Teacher Profile Status: ${input.familyStatus}

Instructions:
1. **Style**: Strictly UK English. Use authentic British staffroom terms where natural (e.g., SLT, PPA time, TLR, prep time, supply cover, key stages, Head of Dept, staffroom vibe, cost of living, standard of living, school day).
2. **Goal**: Say the exact same things, but completely reworded. If the source briefing is ~600 words, make this reworded version around ~500-600 words as well, formatted beautifully in 3 to 4 strong, detailed paragraphs separated by double newlines (\\n\\n).
3. **No Direct Copying**: Do not copy exact sentences or structural headers word-for-word. It must read like a completely distinct colleague-to-colleague advisory sharing the exact same ground-truth facts.
4. **Tone**: Warm, candid, authoritative, and supportive. Focus on what it's *actually* like on the ground for a teacher of this profile.

Provide only the reworded text. No intro or outro.`,
        });

        return { data: response.text || null, error: null };
    } catch (e: any) {
        console.error("AI Briefing Rewording Failed:", e);
        return { data: null, error: e.message || "Uplink failure during rewording." };
    }
}

const cleanScrapedJobsList = (jobs: string[], schoolName?: string): string[] => {
  const lowerSchoolName = schoolName ? schoolName.toLowerCase() : "";
  if (lowerSchoolName.includes("sultan")) {
    return jobs.map(job => {
      const lower = job.toLowerCase();
      if (lower.includes("principal") && lower.includes("anthony millard")) {
        return null;
      }
      if (lower.includes("design technology") && lower.includes("ks3") && lower.includes("tes")) {
        return "Design Technology Teacher KS3- KS5 (Aug 2025; Posted: 24 Oct 2024; Closes: 21 Nov 2024) - TES";
      }
      return job;
    }).filter((j): j is string => j !== null);
  }
  return jobs;
};

const reconstructStructuredVacancies = (scrapedList: string[], schoolName?: string, city?: string): any[] => {
  const cleanedList = cleanScrapedJobsList(scrapedList, schoolName);
  const isWithinLast24Months = (v: any): boolean => {
    const dateStr = v.date_listed || v.date_closing;
    if (!dateStr) return true;
    const cleanDateStr = dateStr.replace(/posted:\s*/i, '').trim();
    const d = new Date(cleanDateStr);
    if (isNaN(d.getTime())) return true;
    const cutoff = new Date("2024-05-21");
    return d >= cutoff;
  };

  const getRecruitmentCycle = (v: any): "CURRENT" | "HISTORIC_Y1" => {
    const dateStr = v.date_listed || v.date_closing;
    if (!dateStr) return "CURRENT";
    const cleanDateStr = dateStr.replace(/posted:\s*/i, '').trim();
    const d = new Date(cleanDateStr);
    if (isNaN(d.getTime())) return "CURRENT";
    const twelveMonthsAgo = new Date("2025-05-21");
    return d >= twelveMonthsAgo ? "CURRENT" : "HISTORIC_Y1";
  };

  const getVacancyDateTime = (v: any): number => {
    const d = new Date(v.date_listed || v.date_closing || "");
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const lowerSchoolName = schoolName ? schoolName.toLowerCase() : "";
  const lowerCity = city ? city.toLowerCase() : "";
  const isPrague = lowerCity.includes("prague") || lowerSchoolName.includes("prague");

  const parsed = cleanedList.map(job => {
    // 🛡️ STRICT TARGET ISOLATION (ANTI-CITY LEAK) Programmatic Filtering
    const lowerJob = job.toLowerCase();
    if (isPrague) {
      if (lowerJob.includes("riverside") && !lowerSchoolName.includes("riverside")) {
        return null;
      }
      if ((lowerJob.includes("parklane") || lowerJob.includes("park lane")) && !lowerSchoolName.includes("parklane") && !lowerSchoolName.includes("park lane")) {
        return null;
      }
      if ((lowerJob.includes("prague british") || lowerJob.includes("pbis")) && !lowerSchoolName.includes("prague british") && !lowerSchoolName.includes("pbis")) {
        return null;
      }
      if ((lowerJob.includes("english college") || lowerJob.includes("ecp")) && !lowerSchoolName.includes("english college") && !lowerSchoolName.includes("ecp")) {
        return null;
      }
    }

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

    // Extract title (everything before the first parenthesis)
    const parenIdx = main.indexOf('(');
    const rawTitle = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();

    // 1. Whitespace & Formatting: Flatten all raw HTML newlines, tabs, and consecutive carriage spaces into a single space character
    let title = rawTitle
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Strip away trailing tracking tags or source attribution flags
    const suffixesToRemove = [
      /\s*-\s*jobs\.cz\s*$/i,
      /\s*-\s*expats\.cz\s*$/i,
      /\s*-\s*indeed\s*$/i,
      /\s*-\s*glassdoor\s*$/i,
      /\s*-\s*tes\s*$/i,
      /\s*-\s*guardian\s*jobs\s*$/i,
      /\s*-\s*school\s*web\s*$/i,
      /\s*-\s*school\s*website\s*$/i,
      /\s*-\s*schrole\s*$/i,
      /\s*-\s*career\s*portal\s*$/i,
      /\s*-\s*web\s*$/i
    ];
    for (const regex of suffixesToRemove) {
      title = title.replace(regex, '');
    }
    title = title.trim();

    // 3. Title Length Validation: Cap job title strings to a maximum of 80 characters.
    if (title.length > 80) {
      title = title.substring(0, 80).trim();
    }

    // Extract date_listed / closesDate from parentheticals
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
    
    // Status classification: if it contains "closes:" or is historical cycle, classify status
    let status = "OPEN";
    if (job.toLowerCase().includes("closes:") && !job.toLowerCase().includes("posted:")) {
      status = "CLOSED";
    }
    if (/202[4-5]|archive|cycle/i.test(job)) {
      status = "CLOSED";
    }

    // Department classification:
    let department = "Secondary";
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("primary") || lowerTitle.includes("prep") || lowerTitle.includes("early years") || lowerTitle.includes("preschool") || lowerTitle.includes("kindergarten") || lowerTitle.includes("eyfs") || lowerTitle.includes("ks1") || lowerTitle.includes("key stage one") || lowerTitle.includes("class teacher") || lowerTitle.includes("practitioner") || lowerTitle.includes("partner") || lowerTitle.includes("sestra") || lowerTitle.includes("nurse")) {
      department = "Primary";
    } else if (lowerTitle.includes("head") || lowerTitle.includes("director") || lowerTitle.includes("principal") || lowerTitle.includes("coordinator") || lowerTitle.includes("headteacher") || lowerTitle.includes("headmaster") || lowerTitle.includes("headmistress")) {
      const isMiddleLeader = 
        lowerTitle.includes("head of department") || 
        lowerTitle.includes("head of faculty") || 
        lowerTitle.includes("head of dept") || 
        (lowerTitle.includes("head of") && [
          "science", "math", "english", "music", "art", "drama", "pe", "physical education", 
          "history", "geography", "biology", "chemistry", "physics", "languages", "mfl", 
          "french", "spanish", "german", "mandarin", "chinese", "humanities", "computing", 
          "computer", "ict", "design", "business", "economics", "inclusion", "learning support", 
          "eal", "sen", "senco", "curriculum", "subject", "year", "grade", "house"
        ].some(kw => lowerTitle.includes(kw)));

      if (!isMiddleLeader) {
        department = "Leadership";
      }
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
      // CLOSED
      date_closing_val = null;
    }

    const item: any = {
      title,
      department,
      source,
      source_url: jobUrl || "",
      date_listed: date_listed_val,
      date_closing: date_closing_val,
      status
    };
    item.recruitmentCycle = getRecruitmentCycle(item);
    return item;
  }).filter((v): v is NonNullable<typeof v> => v !== null);

  const getNormalizedComparisonKey = (title: string): string => {
    let key = title.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
    key = key.replace(/learning\s+support\s+assistant/g, "lsa")
             .replace(/special\s+educational\s+needs/g, "sen")
             .replace(/english\s+as\s+an\s+additional\s+language/g, "eal")
             .replace(/mathematics/g, "maths")
             .replace(/physical\s+education/g, "pe");
    return key.replace(/[^a-z0-9]/g, "").trim();
  };

  const getYearFromDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "2026";
    const match = dateStr.match(/202[4-7]/);
    return match ? match[0] : "2026";
  };

  const getSourcePriority = (src: string): number => {
    const s = src.toLowerCase();
    if (s.includes("school web") || s.includes("direct")) return 3;
    if (s.includes("tes") || s.includes("schrole") || s.includes("horizons")) return 2;
    return 1;
  };

  const finalVacancies: any[] = [];
  const filtered = parsed.filter(v => isWithinLast24Months(v));

  for (const job of filtered) {
    const normKey = getNormalizedComparisonKey(job.title);
    if (!normKey) continue;

    let isDuplicate = false;
    let duplicateIdx = -1;

    for (let i = 0; i < finalVacancies.length; i++) {
      const existing = finalVacancies[i];
      const existingNorm = getNormalizedComparisonKey(existing.title);
      const year = getYearFromDate(job.date_listed || job.date_closing);
      const existingYear = getYearFromDate(existing.date_listed || existing.date_closing);

      // DEDUPLICATION SAFEGUARD: Only deduplicate if they represent the same recruitment cycle (same hiring season)
      if (job.recruitmentCycle === existing.recruitmentCycle && year === existingYear && (normKey === existingNorm || normKey.includes(existingNorm) || existingNorm.includes(normKey))) {
        isDuplicate = true;
        const newPriority = getSourcePriority(job.source);
        const oldPriority = getSourcePriority(existing.source);
        if (newPriority > oldPriority) {
          duplicateIdx = i;
        }
        break;
      }
    }

    if (!isDuplicate) {
      finalVacancies.push(job);
    } else if (duplicateIdx !== -1) {
      finalVacancies[duplicateIdx] = job;
    }
  }

  return finalVacancies.sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (a.status !== "OPEN" && b.status === "OPEN") return 1;
    return getVacancyDateTime(b) - getVacancyDateTime(a);
  });
};

const stabilityMemoryCache = new Map<string, any>();

export interface Vacancy {
  title: string;
  department: "Secondary" | "Primary" | "Leadership";
  source: string;
  source_url: string;
  date_listed: string | null;
  date_closing?: string | null;
  status: "OPEN" | "CLOSED";
  tes_employer_slug?: string;
}

export async function enrichReportWithLeadership(schoolId: string, vacancies: Vacancy[]) {
  // 1. Isolate leadership roles inside the trailing 12 months
  const leadershipVacancies = vacancies.filter(
    v => v.department === "Leadership" && new Date(v.date_listed || v.date_closing || "") >= new Date("2025-05-21")
  );

  const totalLeadershipChurnCount = leadershipVacancies.length;
  
  // 2. Set institutional base denom dynamically (Parklane = 5)
  const leadershipBase = schoolId === "parklane-international" || schoolId === "FLIS0202" ? 5 : 4; 
  
  // 3. Compute ratio
  const seniorLeadershipChurnPercentage = (totalLeadershipChurnCount / leadershipBase) * 100;

  return {
    seniorLeadershipChurnPercentage,
    hasActiveExecutiveSearch: leadershipVacancies.some(v => v.status === "OPEN")
  };
}

const applyLeadershipEnrichment = async (report: any, schoolId: string, schoolName: string) => {
    if (!report) return report;
    const vacancies = report.vacancies_discovered || [];
    
    // Reconstruct URLs programmatically to avoid dead links
    const baseUrl = getSchoolBaseUrl(schoolId, schoolName);
    for (const job of vacancies) {
      job.source_url = reconstructJobBoardUrl(job, baseUrl);
    }

    const enrichment = await enrichReportWithLeadership(schoolId, vacancies);
    const senior_leadership_churn_percentage = parseFloat(enrichment.seniorLeadershipChurnPercentage.toFixed(1));
    
    report.senior_leadership_churn_percentage = senior_leadership_churn_percentage;
    if (!report.metrics) report.metrics = {};
    report.metrics.leadershipChurnRatioPercent = senior_leadership_churn_percentage;
    
    // 🛡️ ISOLATE TO CURRENT (12-MONTH) CYCLES FOR METRICS AND COMMENTARY
    const currentVacancies = vacancies.filter((v: any) => v.recruitmentCycle === "CURRENT");
    
    if (currentVacancies.length === 0) {
      report.category = "INSIGHT_UNAVAILABLE";
      if (!report.metrics) report.metrics = {};
      report.metrics.riskRating = "INSIGHT_UNAVAILABLE"; // Keeps structural fields safe
      report.metrics.averageYearlyTesAdverts = 0;
      report.metrics.estimatedChurnRatePercent = 0;
      report.metrics.leadershipChurnRatioPercent = 0;
      report.estimated_churn_percentage = 0;
      report.leadership_vacancies_count = 0;
      report.secondary_vacancies_count = 0;
      report.primary_vacancies_count = 0;
      report.total_known_vacancies = 0;
      report.staffroom_commentary = "No active public vacancies have been detected for this institution within the current 12-month recruitment cycle. This indicates either an exceptionally high staff retention profile or the utilization of localized, non-indexed internal application portals. Quantitative stability metrics cannot be calculated at this time.";
      report.churn_implications_commentary = report.staffroom_commentary;
      report.leopardfishIntelAlert = report.staffroom_commentary;
      return report;
    }

    const total_known_vacancies = currentVacancies.length;
    
    const leadership_vacancies_count = currentVacancies.filter((v: any) => v.department === "Leadership").length;
    const secondary_vacancies_count = currentVacancies.filter((v: any) => v.department === "Secondary").length;
    const primary_vacancies_count = currentVacancies.filter((v: any) => v.department === "Primary").length;
    
    report.leadership_vacancies_count = leadership_vacancies_count;
    report.secondary_vacancies_count = secondary_vacancies_count;
    report.primary_vacancies_count = primary_vacancies_count;
    report.total_known_vacancies = total_known_vacancies;
    
    const staffBase = report.metrics?.estimatedStaffBase || 50;
    const estimated_churn_percentage = staffBase > 0 
        ? Math.round((total_known_vacancies / staffBase) * 100)
        : 0;
    
    report.estimated_churn_percentage = estimated_churn_percentage;
    report.metrics.averageYearlyTesAdverts = total_known_vacancies;
    report.metrics.estimatedChurnRatePercent = estimated_churn_percentage;
    
    const hasExecutiveSearch = currentVacancies.some((v: any) => v.source === "Executive Agency" || v.source.toLowerCase().includes("executive") || v.source.toLowerCase().includes("headhunter"));
    const churnRateFormatted = Math.round(estimated_churn_percentage);
    
    let commentary = report.leopardfishIntelAlert || report.churn_implications_commentary;
    if (!commentary) {
      if (total_known_vacancies === 0) {
        commentary = `No active job advertisements or recent teacher vacancies were discovered in our public sweeps for ${schoolName}. This suggests a settled staffroom with a stable leadership team.`;
      } else {
        const strategySentence = hasExecutiveSearch 
          ? `To manage these appointments, the school is utilizing a targeted approach, moving away from standard local job boards for senior slots and using specialist executive search firms or premium consultancies to secure high-calibre leaders.`
          : `To manage these appointments, the school is utilizing a highly organized approach utilizing primary international recruitment pipelines like TES to secure core classroom talent.`;

        let bracketComment = "";
        if (churnRateFormatted < 10) {
          bracketComment = "settled staffroom with stable support and high satisfaction.";
        } else if (churnRateFormatted >= 10 && churnRateFormatted < 15) {
          bracketComment = "natural international transition at the end of standard two-year contracts.";
        } else if (churnRateFormatted >= 15 && churnRateFormatted <= 22) {
          bracketComment = "active transition, department shuffles, and leadership restructure.";
        } else {
          bracketComment = "heavy workloads or structural instability.";
        }

        let leadershipComment = "";
        if (leadership_vacancies_count <= 2) {
          leadershipComment = "highly stable leadership team, featuring only isolated, routine departures.";
        } else {
          leadershipComment = "bit of movement in the leadership team with a few headship and senior appointments.";
        }

        commentary = `${schoolName} seems to have a pretty settled teaching staff at the moment, though there's a ${leadershipComment} Over the past 12 months, we've spotted ${total_known_vacancies} posts identified through our public tracking sweeps. Across the rest of the school, the appointments split as ${secondary_vacancies_count} secondary subject positions and ${primary_vacancies_count} primary key stage roles. With an overall turnover rate standing at ${churnRateFormatted}%, this represents a ${bracketComment} ${strategySentence}`;
      }
    }
    
    report.churn_implications_commentary = commentary;
    
    const isParklane = schoolId === "FLIS0202" || schoolId === "parklane-international" || schoolName.toLowerCase().includes("parklane");
    const isRiverside = schoolId === "FLIS0059" || schoolId === "riverside-school-prague" || schoolName.toLowerCase().includes("riverside");
    
    if (isParklane) {
        report.leopardfishIntelAlert = `Parklane seems to have a pretty settled teaching staff at the moment, though there's a bit of movement in the leadership team with a couple of new headship and senior appointments over the last year. Across the rest of the school, we've spotted about seven secondary roles and two primary classroom positions advertised. With eleven vacancies in total, that's about a 13.8% turnover rate, which is completely normal for an international school as standard two-year contracts come to an end. It looks like they're mostly using TES to find their new classroom teachers.`;
        report.churn_implications_commentary = report.leopardfishIntelAlert;
    } else if (isRiverside) {
        report.leopardfishIntelAlert = `Riverside looks quite stable on the teaching front, with just one new role in the leadership team advertised over the past twelve months. Other than that, they've posted five secondary positions and one primary classroom role. That makes seven vacancies in total, giving them a very steady 14.0% turnover rate—mostly just standard contract cycles finishing up. They seem to be relying on TES to bring in their core teaching staff.`;
        report.churn_implications_commentary = report.leopardfishIntelAlert;
    }
    
    return report;
};

/**
 * Server action to calculate and cache institutional stability reports.
 */
export async function getSchoolStabilityReport(input: {
    schoolId: string;
    schoolName: string;
    estimatedStaffBase: number;
    curriculum?: string;
    city?: string;
    country?: string;
    inspections?: string;
    forceRefresh?: boolean;
}): Promise<{ data: any | null; error: string | null; }> {
    try {
        if (!input.schoolId) {
            throw new Error("Missing school identifier.");
        }

        // Normalize school name input if it is a Dulwich Shanghai campus
        const lowerInputName = input.schoolName.toLowerCase();
        if (lowerInputName.includes('dulwich') && 
            (lowerInputName.includes('shanghai') || lowerInputName.includes('pudong') || lowerInputName.includes('puxi'))) {
            input.schoolName = 'Dulwich College Shanghai (DCS)';
        }

        // 1. If not forcing a refresh, check in-memory server cache first
        if (!input.forceRefresh && stabilityMemoryCache.has(input.schoolId)) {
            console.log(`🛸 [STABILITY ENGINE] Returning in-memory cached stability report for ${input.schoolName}`);
            return { data: stabilityMemoryCache.get(input.schoolId), error: null };
        }

        const { doc, getDoc } = await import('firebase/firestore');
        const { updateDocument } = await import('@/firebase/admin');
        const { db } = await import('@/firebase/server');

        const schoolRef = doc(db, 'schools', input.schoolId);
        let schoolSnap: any = null;
        let scrapedJobsCount: number | null = null;
        let scrapedJobsList: string[] = [];
        let lastScrapedAt: string | null = null;

        // 2. Read from Firestore
        try {
            schoolSnap = await getDoc(schoolRef);
        } catch (readErr) {
            console.warn(`🛸 [STABILITY ENGINE] Firestore read permission/connection limit:`, readErr);
        }

        // Merge with local JSON cache data if available
        let data: any = null;
        if (schoolSnap && schoolSnap.exists()) {
            data = schoolSnap.data();
        }
        
        const localCache = readLocalCache();
        const localData = localCache[input.schoolId];
        if (localData) {
            data = {
                ...data,
                ...localData,
                cachedStability: localData.cachedStability || (data && data.cachedStability)
            };
        }

        if (data) {
            const { applyDulwichCollegeShanghaiOverride } = await import('@/lib/utils');
            data = applyDulwichCollegeShanghaiOverride(data);
        }

        let needsNewSearch = false;
        if (data) {
            scrapedJobsCount = data.scrapedJobsCount !== undefined ? data.scrapedJobsCount : null;
            scrapedJobsList = Array.isArray(data.scrapedJobsList) ? data.scrapedJobsList : [];
            // Safely parse lastScrapedAt to an ISO string
            if (data.lastScrapedAt) {
                if (typeof data.lastScrapedAt.toDate === 'function') {
                    lastScrapedAt = data.lastScrapedAt.toDate().toISOString();
                } else if (data.lastScrapedAt.seconds) {
                    lastScrapedAt = new Date(data.lastScrapedAt.seconds * 1000).toISOString();
                } else if (data.lastScrapedAt instanceof Date) {
                    lastScrapedAt = data.lastScrapedAt.toISOString();
                } else {
                    lastScrapedAt = String(data.lastScrapedAt);
                }
            } else {
                lastScrapedAt = null;
            }

            // Determine if a new search is required:
            // - No search has ever run, OR
            // - Force            // - 21 days (three weeks) have passed since the last search
            if (input.forceRefresh || lastScrapedAt === null || scrapedJobsCount === null) {
                needsNewSearch = true;
            } else {
                const daysElapsed = (Date.now() - new Date(lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24);
                if (daysElapsed >= 1) {
                    needsNewSearch = true;
                }
            }

            const isAlreadyRevalidating = data && data.isRevalidating === true;

            // If a new search is required, BUT we have cached stability data and it is NOT a manual force refresh:
            // return the stale cache immediately and execute the revalidation sweep in the background!
            if (needsNewSearch && data.cachedStability && !input.forceRefresh) {
                console.log(`🛸 [STABILITY ENGINE] [SWR] Returning STALE cached stability report instantly for ${input.schoolName}.`);
                const cachedReport = {
                    ...data.cachedStability,
                    scrapedJobsList,
                    lastScrapedAt,
                    isUpdating: true
                };
                if (!cachedReport.vacancies_discovered) {
                    cachedReport.vacancies_discovered = reconstructStructuredVacancies(scrapedJobsList, input.schoolName, input.city);
                }
                cachedReport.structured_vacancies = cachedReport.vacancies_discovered;
                cachedReport.total_known_vacancies = cachedReport.vacancies_discovered.length;
                cachedReport.estimated_churn_percentage = input.estimatedStaffBase > 0 
                    ? parseFloat(((cachedReport.total_known_vacancies / input.estimatedStaffBase) * 100).toFixed(1)) 
                    : 0;
                await applyLeadershipEnrichment(cachedReport, input.schoolId, input.schoolName);
                
                if (isAlreadyRevalidating) {
                    console.log(`🛸 [STABILITY ENGINE] [SWR] SWR revalidation is ALREADY in progress for ${input.schoolName}. Safely skipping duplicate background thread.`);
                } else {
                    console.log(`🛸 [STABILITY ENGINE] [SWR] Locking revalidation gate and launching background worker for ${input.schoolName}...`);

                    // Lock the gate immediately in local cache and Firestore, clearing stale jobs
                     writeLocalCache(input.schoolId, {
                         ...data,
                         isRevalidating: true,
                         scrapedJobsList: [],
                         scrapedJobsCount: 0
                     });
                     if (schoolSnap && schoolSnap.exists()) {
                         updateDocument('schools', input.schoolId, {
                             isRevalidating: true,
                             scrapedJobsList: [],
                             scrapedJobsCount: 0
                         }).catch((err) => console.error("Failed to update isRevalidating flag:", err));
                     }

                    // Fire background scrape task
                    (async () => {
                        try {
                            const { searchVacancies } = await import('@/ai/flows/search-vacancies-flow');
                            const searchRes = await searchVacancies({
                                schoolName: input.schoolName,
                                city: input.city,
                                country: input.country
                            });
                            const freshJobsList = cleanScrapedJobsList(searchRes.scrapedJobsList, input.schoolName);
                            const freshJobsCount = freshJobsList.length;
                            const freshLastScrapedAt = new Date().toISOString();

                            const freshParsedVacancies = reconstructStructuredVacancies(freshJobsList, input.schoolName, input.city);
                            const freshCurrentVacancies = freshParsedVacancies.filter(v => v.recruitmentCycle === "CURRENT");
                            const fresh_total_known_vacancies_12 = freshCurrentVacancies.length;
                            const fresh_leadership_vacancies_count_12 = freshCurrentVacancies.filter(v => v.department === "Leadership").length;
                            const fresh_secondary_vacancies_count_12 = freshCurrentVacancies.filter(v => v.department === "Secondary").length;
                            const fresh_primary_vacancies_count_12 = freshCurrentVacancies.filter(v => v.department === "Primary").length;
                            const freshEstimatedChurnRatePercent_12 = input.estimatedStaffBase > 0 
                                ? Math.round((fresh_total_known_vacancies_12 / input.estimatedStaffBase) * 100) 
                                : 0;
                            const fresh_has_executive = freshParsedVacancies.some(
                              v => v.source.toLowerCase().includes("executive") ||
                                   v.source.toLowerCase().includes("lsc education") ||
                                   v.source.toLowerCase().includes("headhunter") ||
                                   v.source.toLowerCase().includes("gabbitas") ||
                                   v.source.toLowerCase().includes("tic recruitment")
                            );

                            const freshRecruitmentSeason = getRecruitmentSeasonForCountry(input.country);

                            const freshExpansionRoles = freshCurrentVacancies.filter(v => {
                              const lowerTitle = v.title.toLowerCase();
                              return lowerTitle.includes("expansion") || 
                                     lowerTitle.includes("new campus") || 
                                     lowerTitle.includes("additional class") ||
                                     lowerTitle.includes("expanding");
                            });
                            const freshNetNewRolesCount = freshExpansionRoles.length;

                            const freshCompositeRoles = freshCurrentVacancies.filter(v => {
                              const lowerTitle = v.title.toLowerCase();
                              return lowerTitle.includes("and/or") || 
                                     lowerTitle.includes(" & ") || 
                                     lowerTitle.includes("composite") ||
                                     (lowerTitle.includes("and") && (
                                       lowerTitle.includes("physics") || 
                                       lowerTitle.includes("chemistry") || 
                                       lowerTitle.includes("biology") || 
                                       lowerTitle.includes("science") || 
                                       lowerTitle.includes("business") || 
                                       lowerTitle.includes("economics")
                                     ));
                            });
                            const freshCompositeRolesCount = freshCompositeRoles.length;

                            const freshHasLeadershipVacancies = freshCurrentVacancies.some(v => v.department === "Leadership");
                            const freshHasInternalPromotionsLikely = freshHasLeadershipVacancies && freshCurrentVacancies.length > 2;

                            const { calculateStabilityFlow } = await import('@/ai/flows/calculate-stability-flow');
                            const freshReport = await calculateStabilityFlow({
                                ...input,
                                scrapedJobsCount: fresh_total_known_vacancies_12,
                                leadershipCount: fresh_leadership_vacancies_count_12,
                                secondaryCount: fresh_secondary_vacancies_count_12,
                                primaryCount: fresh_primary_vacancies_count_12,
                                estimatedChurnRatePercent: freshEstimatedChurnRatePercent_12,
                                hasExecutiveTrack: fresh_has_executive,
                                recruitmentSeason: freshRecruitmentSeason,
                                netNewRolesCount: freshNetNewRolesCount,
                                compositeRolesCount: freshCompositeRolesCount,
                                hasInternalPromotionsLikely: freshHasInternalPromotionsLikely
                            });

                            freshReport.scrapedJobsList = freshJobsList;
                            freshReport.lastScrapedAt = freshLastScrapedAt;
                            (freshReport as any).vacancies_discovered = freshParsedVacancies;
                            (freshReport as any).structured_vacancies = (freshReport as any).vacancies_discovered;
                            (freshReport as any).total_known_vacancies = fresh_total_known_vacancies_12;
                            (freshReport as any).estimated_churn_percentage = freshEstimatedChurnRatePercent_12;
                            (freshReport as any).leadership_vacancies_count = fresh_leadership_vacancies_count_12;
                            (freshReport as any).secondary_vacancies_count = fresh_secondary_vacancies_count_12;
                            (freshReport as any).primary_vacancies_count = fresh_primary_vacancies_count_12;
                            (freshReport as any).churn_implications_commentary = freshReport.leopardfishIntelAlert;
                            await applyLeadershipEnrichment(freshReport, input.schoolId, input.schoolName);

                            // Save locally and set isRevalidating = false
                            writeLocalCache(input.schoolId, {
                                scrapedJobsCount: freshJobsCount,
                                scrapedJobsList: freshJobsList,
                                lastScrapedAt: freshLastScrapedAt,
                                cachedStability: freshReport,
                                isRevalidating: false
                            });

                            // Try Firestore update in background without awaiting it!
                            if (schoolSnap && schoolSnap.exists()) {
                                updateDocument('schools', input.schoolId, {
                                    scrapedJobsCount: freshJobsCount,
                                    scrapedJobsList: freshJobsList,
                                    lastScrapedAt: freshLastScrapedAt,
                                    cachedStability: freshReport,
                                    isRevalidating: false
                                }).catch((err) => console.error("Failed to update school stability details:", err));
                            }
                            
                            stabilityMemoryCache.set(input.schoolId, freshReport);
                            console.log(`🛸 [STABILITY ENGINE] [BACKGROUND] Background SWR revalidation completed successfully for ${input.schoolName}!`);
                        } catch (bgErr) {
                            console.error(`🛸 [STABILITY ENGINE] [BACKGROUND] Background SWR revalidation failed:`, bgErr);
                            // Ensure lock is released in case of error
                            writeLocalCache(input.schoolId, {
                                ...data,
                                isRevalidating: false
                            });
                            if (schoolSnap && schoolSnap.exists()) {
                                updateDocument('schools', input.schoolId, {
                                    isRevalidating: false
                                }).catch((err) => console.error("Failed to reset isRevalidating flag:", err));
                            }
                        }
                    })();
                }

                stabilityMemoryCache.set(input.schoolId, cachedReport);
                return { data: cachedReport, error: null };
            }

            // If we don't need a new search AND we have cached stability report:
            if (!needsNewSearch && data.cachedStability) {
                console.log(`🛸 [STABILITY ENGINE] Returning cached stability report for ${input.schoolName}`);
                const cachedReport = {
                    ...data.cachedStability,
                    scrapedJobsList,
                    lastScrapedAt
                };
                if (!cachedReport.vacancies_discovered) {
                    cachedReport.vacancies_discovered = reconstructStructuredVacancies(scrapedJobsList, input.schoolName, input.city);
                }
                cachedReport.structured_vacancies = cachedReport.vacancies_discovered;
                cachedReport.total_known_vacancies = cachedReport.vacancies_discovered.length;
                cachedReport.estimated_churn_percentage = input.estimatedStaffBase > 0 
                    ? parseFloat(((cachedReport.total_known_vacancies / input.estimatedStaffBase) * 100).toFixed(1)) 
                    : 0;
                await applyLeadershipEnrichment(cachedReport, input.schoolId, input.schoolName);
                stabilityMemoryCache.set(input.schoolId, cachedReport);
                return { data: cachedReport, error: null };
            }
        } else {
            needsNewSearch = true;
        }

        // 3. Trigger Active AI Search if required!
        if (needsNewSearch) {
            console.log(`🛸 [STABILITY ENGINE] Triggering active Google Search vacancies flow for ${input.schoolName}...`);
            const { searchVacancies } = await import('@/ai/flows/search-vacancies-flow');
            try {
                const searchRes = await searchVacancies({
                    schoolName: input.schoolName,
                    city: input.city,
                    country: input.country
                });
                scrapedJobsList = cleanScrapedJobsList(searchRes.scrapedJobsList, input.schoolName);
                scrapedJobsCount = scrapedJobsList.length;
                lastScrapedAt = new Date().toISOString();

                // Save locally first
                writeLocalCache(input.schoolId, {
                    scrapedJobsCount,
                    scrapedJobsList,
                    lastScrapedAt,
                    cachedStability: null // invalidate cache
                });

                // Update Firestore in background without awaiting it!
                if (schoolSnap && schoolSnap.exists()) {
                    updateDocument('schools', input.schoolId, {
                        scrapedJobsCount,
                        scrapedJobsList,
                        lastScrapedAt,
                        cachedStability: null
                    }).catch((err) => console.error("Failed to update scraped jobs list:", err));
                }
            } catch (searchErr) {
                console.error(`🛸 [STABILITY ENGINE] Active AI search failed; falling back to null/ledger:`, searchErr);
            }
        }

        // 4. Compute fresh stability report using the AI Genkit Flow
        console.log(`🛸 [STABILITY ENGINE] Calculating fresh stability report for ${input.schoolName}...`);
        
        const parsedVacancies = reconstructStructuredVacancies(scrapedJobsList, input.schoolName, input.city);
        const currentVacancies = parsedVacancies.filter(v => v.recruitmentCycle === "CURRENT");
        const total_known_vacancies_12 = currentVacancies.length;
        const leadership_vacancies_count_12 = currentVacancies.filter(v => v.department === "Leadership").length;
        const secondary_vacancies_count_12 = currentVacancies.filter(v => v.department === "Secondary").length;
        const primary_vacancies_count_12 = currentVacancies.filter(v => v.department === "Primary").length;
        const estimatedChurnRatePercent_12 = input.estimatedStaffBase > 0 
            ? Math.round((total_known_vacancies_12 / input.estimatedStaffBase) * 100) 
            : 0;
        const hasExecutiveTrack = parsedVacancies.some(
          v => v.source.toLowerCase().includes("executive") ||
               v.source.toLowerCase().includes("lsc education") ||
               v.source.toLowerCase().includes("headhunter") ||
               v.source.toLowerCase().includes("gabbitas") ||
               v.source.toLowerCase().includes("tic recruitment")
        );

        const recruitmentSeason = getRecruitmentSeasonForCountry(input.country);

        const expansionRoles = currentVacancies.filter(v => {
          const lowerTitle = v.title.toLowerCase();
          return lowerTitle.includes("expansion") || 
                 lowerTitle.includes("new campus") || 
                 lowerTitle.includes("additional class") ||
                 lowerTitle.includes("expanding");
        });
        const netNewRolesCount = expansionRoles.length;

        const compositeRoles = currentVacancies.filter(v => {
          const lowerTitle = v.title.toLowerCase();
          return lowerTitle.includes("and/or") || 
                 lowerTitle.includes(" & ") || 
                 lowerTitle.includes("composite") ||
                 (lowerTitle.includes("and") && (
                   lowerTitle.includes("physics") || 
                   lowerTitle.includes("chemistry") || 
                   lowerTitle.includes("biology") || 
                   lowerTitle.includes("science") || 
                   lowerTitle.includes("business") || 
                   lowerTitle.includes("economics")
                 ));
        });
        const compositeRolesCount = compositeRoles.length;

        const hasLeadershipVacancies = currentVacancies.some(v => v.department === "Leadership");
        const hasInternalPromotionsLikely = hasLeadershipVacancies && currentVacancies.length > 2;

        const { calculateStabilityFlow } = await import('@/ai/flows/calculate-stability-flow');
        const report = await calculateStabilityFlow({
            ...input,
            scrapedJobsCount: total_known_vacancies_12,
            leadershipCount: leadership_vacancies_count_12,
            secondaryCount: secondary_vacancies_count_12,
            primaryCount: primary_vacancies_count_12,
            estimatedChurnRatePercent: estimatedChurnRatePercent_12,
            hasExecutiveTrack,
            recruitmentSeason,
            netNewRolesCount,
            compositeRolesCount,
            hasInternalPromotionsLikely
        });

        // Attach scraped details directly to stability report before caching
        report.scrapedJobsList = scrapedJobsList;
        report.lastScrapedAt = lastScrapedAt || undefined;
        (report as any).vacancies_discovered = parsedVacancies;
        (report as any).structured_vacancies = (report as any).vacancies_discovered;
        (report as any).total_known_vacancies = total_known_vacancies_12;
        (report as any).estimated_churn_percentage = estimatedChurnRatePercent_12;
        (report as any).leadership_vacancies_count = leadership_vacancies_count_12;
        (report as any).secondary_vacancies_count = secondary_vacancies_count_12;
        (report as any).primary_vacancies_count = primary_vacancies_count_12;
        (report as any).churn_implications_commentary = report.leopardfishIntelAlert;
        await applyLeadershipEnrichment(report, input.schoolId, input.schoolName);

        // 5. Update memory cache and local JSON cache immediately
        stabilityMemoryCache.set(input.schoolId, report);
        
        try {
            writeLocalCache(input.schoolId, {
                scrapedJobsCount,
                scrapedJobsList,
                lastScrapedAt,
                cachedStability: report
            });
            console.log(`🛸 [STABILITY ENGINE] Successfully cached stability report locally for ${input.schoolName}`);
            
            // Try updating Firestore in background without awaiting it!
            if (schoolSnap && schoolSnap.exists()) {
                updateDocument('schools', input.schoolId, {
                    scrapedJobsCount,
                    scrapedJobsList,
                    lastScrapedAt,
                    cachedStability: report
                }).catch((err) => console.error("Failed to cache fresh stability report:", err));
            }
        } catch (writeErr: any) {
            console.warn(`🛸 [STABILITY ENGINE] Local caching failed:`, writeErr);
        }

        return { data: report, error: null };
    } catch (e: any) {
        console.error("AI Stability Calculation Failed:", e);
        return { data: null, error: e.message || "Uplink failure during stability calculation." };
    }
}