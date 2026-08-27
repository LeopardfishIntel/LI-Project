import admin from 'firebase-admin';
import { db as clientDb } from './server';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  getDoc,
  setDoc,
  addDoc,
  increment
} from 'firebase/firestore';

let adminDb: any = null;

try {
  if (typeof window === 'undefined') {
    // 🛰️ Local Dev Sentry: Only initialize Admin SDK if credentials are explicitly configured
    // or if we are running in a Google Cloud hosting environment. Otherwise, gracefully fall back
    // to the client-side SDK on the server-side to avoid "Could not load default credentials" crashes.
    const hasCredentials = 
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      process.env.K_SERVICE || 
      process.env.GAE_ENV || 
      process.env.FIREBASE_CONFIG ||
      process.env.VERCEL;

    if (hasCredentials || process.env.NODE_ENV === 'production') {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2840117705-12faa'
        });
      }
      adminDb = admin.firestore();
    } else {
      console.log("ℹ️ Admin credentials not detected locally. Using client-side Firestore fallback on server.");
    }
  }
} catch (err: any) {
  console.warn("Firebase Admin SDK initialization bypassed/failed. Falling back to client-side Firestore:", err.message || err);
}

const useAdmin = () => adminDb !== null;

// 1. Get All Documents from a Collection
export async function getCollectionDocs(colName: string) {
  if (useAdmin()) {
    const snap = await adminDb.collection(colName).get();
    return snap.docs.map((d: any) => ({
      id: d.id,
      data: () => d.data(),
      exists: () => true
    }));
  } else {
    const snap = await getDocs(collection(clientDb, colName));
    return snap.docs;
  }
}

// 2. Get a single document
export async function getDocument(colName: string, docId: string) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    const snap = await docRef.get();
    return {
      exists: () => snap.exists,
      id: snap.id,
      data: () => snap.data()
    };
  } else {
    const docRef = doc(clientDb, colName, docId);
    const snap = await getDoc(docRef);
    return snap;
  }
}

// 3. Set a document
export async function setDocument(colName: string, docId: string, data: any, options: { merge?: boolean } = {}) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    await docRef.set(data, options);
  } else {
    const docRef = doc(clientDb, colName, docId);
    await setDoc(docRef, data, options);
  }
}

// 4. Update a document
export async function updateDocument(colName: string, docId: string, data: any) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    await docRef.update(data);
  } else {
    const docRef = doc(clientDb, colName, docId);
    await updateDoc(docRef, data);
  }
}

// 5. Add a document
export async function addDocument(colName: string, data: any) {
  if (useAdmin()) {
    const ref = await adminDb.collection(colName).add(data);
    return { id: ref.id };
  } else {
    const ref = await addDoc(collection(clientDb, colName), data);
    return { id: ref.id };
  }
}

// 6. Batch operations helper
export class DatabaseBatch {
  private batch: any;
  private isAdmin: boolean;

  constructor() {
    this.isAdmin = useAdmin();
    this.batch = this.isAdmin ? adminDb.batch() : writeBatch(clientDb);
  }

  set(colName: string, docId: string, data: any, options: { merge?: boolean } = {}) {
    if (this.isAdmin) {
      const ref = adminDb.collection(colName).doc(docId);
      this.batch.set(ref, data, options);
    } else {
      const ref = doc(clientDb, colName, docId);
      this.batch.set(ref, data, options);
    }
  }

  update(colName: string, docId: string, data: any) {
    if (this.isAdmin) {
      const ref = adminDb.collection(colName).doc(docId);
      this.batch.update(ref, data);
    } else {
      const ref = doc(clientDb, colName, docId);
      this.batch.update(ref, data);
    }
  }

  async commit() {
    await this.batch.commit();
  }
}

export function getAdminDb() {
  return adminDb || clientDb;
}

// 7. Increment a field atomically
export async function incrementField(colName: string, docId: string, fieldName: string, value: number = 1) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    await docRef.set({
      [fieldName]: admin.firestore.FieldValue.increment(value)
    }, { merge: true });
  } else {
    const docRef = doc(clientDb, colName, docId);
    await setDoc(docRef, {
      [fieldName]: increment(value)
    }, { merge: true });
  }
}

// =====================================================================
// 🛰️ SEARCH RESPONSE CACHING (24-Hour TTL Caching Engine)
// =====================================================================

export interface CachedSearchResult {
  query: string;
  results: any;
  cachedAt: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Creates a deterministic hash for a search query
 */
export function getQueryHash(queryStr: string): string {
  let hash = 0;
  const clean = queryStr.trim().toLowerCase();
  for (let i = 0; i < clean.length; i++) {
    const char = clean.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'sq_' + Math.abs(hash).toString(36) + '_' + clean.substring(0, 20).replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves cached search results if within 24-hour TTL window
 */
export async function getCachedSearchResult(queryStr: string): Promise<any | null> {
  const hash = getQueryHash(queryStr);
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  try {
    if (isAdmin) {
      const docSnap = await dbInstance.collection('search_cache').doc(hash).get();
      if (!docSnap.exists) return null;
      const data = docSnap.data();
      if (!data || Date.now() > data.expiresAt) return null;
      return data.results;
    } else {
      const { doc: cDoc, getDoc: cGetDoc } = await import('firebase/firestore');
      const docRef = cDoc(clientDb, 'search_cache', hash);
      const docSnap = await cGetDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      if (!data || Date.now() > data.expiresAt) return null;
      return data.results;
    }
  } catch (err) {
    console.warn("Search cache lookup bypassed:", err);
    return null;
  }
}

/**
 * Persists raw search engine results to Firestore with a 24-hour TTL
 */
export async function setCachedSearchResult(queryStr: string, results: any): Promise<void> {
  const hash = getQueryHash(queryStr);
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = Date.now();

  const payload: CachedSearchResult = {
    query: queryStr,
    results,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS
  };

  try {
    if (isAdmin) {
      await dbInstance.collection('search_cache').doc(hash).set(payload);
    } else {
      const { doc: cDoc, setDoc: cSetDoc } = await import('firebase/firestore');
      const docRef = cDoc(clientDb, 'search_cache', hash);
      await cSetDoc(docRef, payload);
    }
  } catch (err) {
    console.warn("Search cache persist bypassed:", err);
  }
}

/**
 * Purges all cached search results from the `search_cache` collection.
 * Used during force sweeps to ensure fresh queries with updated filters.
 */
export async function clearSearchCache(): Promise<{ deletedCount: number }> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  let deletedCount = 0;

  try {
    if (isAdmin) {
      const snap = await dbInstance.collection('search_cache').get();
      if (!snap.empty) {
        const batch = dbInstance.batch();
        snap.docs.forEach((d: any) => {
          deletedCount++;
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } else {
      const { collection, getDocs, writeBatch: cBatch } = await import('firebase/firestore');
      const { db: firestoreClient } = await import('./server');
      const targetDb = firestoreClient || clientDb;
      if (targetDb) {
        const colRef = collection(targetDb, 'search_cache');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const batch = cBatch(targetDb);
          snap.docs.forEach(d => {
            deletedCount++;
            batch.delete(d.ref);
          });
          await batch.commit();
        }
      }
    }
    console.log(`🧹 [SEARCH CACHE] Purged ${deletedCount} cached search queries.`);
  } catch (err) {
    console.warn("Failed to clear search_cache collection:", err);
  }

  return { deletedCount };
}

// =====================================================================
// 🎯 SCHOOL BATCH TIERING & SCHEDULING (PEAK VS LOW HIRING WINDOWS)
// =====================================================================

export interface TieredSchoolTarget {
  id: string;
  name: string;
  city: string;
  country: string;
  tier: 1 | 2 | 3;
  lastScraped: number | null;
}

/**
 * Computes sweep candidates based on hiring season tiers:
 * - Tier 1 (Daily): Peak season (Nov-Apr) or high-priority schools (max 20 per sweep).
 * - Tier 2 (Every 3 Days): Standard international schools (May-Oct).
 * - Tier 3 (Weekly): Low activity / archived schools.
 */
export function getTieredSweepTargets(schools: any[], maxDailyLimit: number = 20): TieredSchoolTarget[] {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 10 = Nov, 11 = Dec
  const isPeakHiringSeason = currentMonth >= 10 || currentMonth <= 3; // Nov to April
  const nowTime = now.getTime();

  const evaluated: TieredSchoolTarget[] = [];

  for (const s of schools) {
    const data = typeof s.data === 'function' ? s.data() : s;
    let lastScraped: number | null = null;
    if (data.lastScrapedAt) {
      if (data.lastScrapedAt.seconds) {
        lastScraped = data.lastScrapedAt.seconds * 1000;
      } else {
        lastScraped = new Date(data.lastScrapedAt).getTime();
      }
    }

    // Determine Tier
    let tier: 1 | 2 | 3 = 2;
    if (isPeakHiringSeason || data.isHighPriority || (data.scrapedJobsCount && data.scrapedJobsCount > 3)) {
      tier = 1;
    } else if (data.isLowActivity || (data.scrapedJobsCount === 0 && lastScraped && (nowTime - lastScraped) < 7 * 24 * 60 * 60 * 1000)) {
      tier = 3;
    }

    // Check cadence eligibility
    let isDue = false;
    if (lastScraped === null) {
      isDue = true;
    } else {
      const daysSince = (nowTime - lastScraped) / (1000 * 60 * 60 * 24);
      if (tier === 1 && daysSince >= 1) isDue = true;
      else if (tier === 2 && daysSince >= 3) isDue = true;
      else if (tier === 3 && daysSince >= 7) isDue = true;
    }

    if (isDue) {
      evaluated.push({
        id: s.id || data.id,
        name: data.schoolname || data.name || "",
        city: data.city || "",
        country: data.country || "",
        tier,
        lastScraped
      });
    }
  }

  // Sort: null lastScraped first, then Tier 1 before Tier 2/3, then oldest scraped
  evaluated.sort((a, b) => {
    if (a.lastScraped === null && b.lastScraped !== null) return -1;
    if (b.lastScraped === null && a.lastScraped !== null) return 1;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (a.lastScraped || 0) - (b.lastScraped || 0);
  });

  return evaluated.slice(0, maxDailyLimit);
}


const SUBJECT_KEYWORDS = [
  "Maths", "Mathematics", "Physics", "Chemistry", "Biology", "Science",
  "English", "History", "Geography", "Art", "Music", "Drama", "PE",
  "Physical Education", "Computing", "Computer Science", "Economics",
  "Business", "French", "Spanish", "German", "Mandarin", "Primary",
  "Early Years", "Kindergarten", "Leadership", "Head of", "Principal"
];

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  czechia: "CZK",
  "czech republic": "CZK",
  "united arab emirates": "AED",
  uae: "AED",
  dubai: "AED",
  "abu dhabi": "AED",
  qatar: "QAR",
  "saudi arabia": "SAR",
  kuwait: "KWD",
  bahrain: "BHD",
  oman: "OMR",
  jordan: "JOD",
  egypt: "EGP",
  switzerland: "CHF",
  japan: "JPY",
  singapore: "SGD",
  "hong kong": "HKD",
  china: "CNY",
  thailand: "THB",
  vietnam: "VND",
  indonesia: "IDR",
  malaysia: "MYR",
  "south korea": "KRW",
  korea: "KRW",
  "united kingdom": "GBP",
  uk: "GBP",
  england: "GBP",
  "united states": "USD",
  usa: "USD",
  brazil: "BRL",
  argentina: "ARS",
  "south africa": "ZAR",
  mexico: "MXN",
  colombia: "COP",
  germany: "EUR",
  france: "EUR",
  spain: "EUR",
  italy: "EUR",
  netherlands: "EUR",
  portugal: "EUR",
  greece: "EUR",
  austria: "EUR",
  belgium: "EUR",
  ireland: "EUR"
};

function extractSubject(title?: string): string | null {
  if (!title) return null;
  for (const kw of SUBJECT_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(title)) {
      if (kw === "Mathematics") return "Maths";
      if (kw === "Computer Science") return "Computing";
      if (kw === "Early Years" || kw === "Kindergarten") return "Primary";
      return kw;
    }
  }
  return null;
}

function parseSalaryAmount(val: any): number | null {
  if (!val) return null;
  const str = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

function getMillis(val: any): number {
  if (!val) return Date.now();
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

export function canonicalCountryName(c: string): string {
  const n = c?.toLowerCase().trim() || "";
  if (n.includes("czech") || n.includes("czechia")) return "czechia";
  if (n.includes("uae") || n.includes("emirates")) return "united arab emirates";
  if (n.includes("uk") || n.includes("britain")) return "united kingdom";
  if (n.includes("usa") || n.includes("america")) return "united states";
  if (n.includes("swiz") || n.includes("swit")) return "switzerland";
  if (n.includes("viet")) return "vietnam";
  return n;
}
/**
 * 🛡️ PII & CONTACT SANITIZATION (GDPR Compliance)
 * Strips direct personal email addresses, phone numbers, and individual recruiter contacts
 * from raw job text/descriptions, converting them to generic school application handles.
 */
export function sanitizeJobContent(content: string): string {
  if (!content || typeof content !== 'string') return "";

  let cleaned = content;

  // 1. Sanitize direct personal email addresses (e.g. john.doe@school.org -> [careers-portal])
  // Preserve generic mailbox handles like info@, hr@, careers@, recruitment@, jobs@, admissions@
  cleaned = cleaned.replace(
    /\b(?!info@|hr@|careers@|recruitment@|jobs@|admissions@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
    '[careers-portal]'
  );

  // 2. Sanitize personal phone numbers (international and local formats)
  cleaned = cleaned.replace(
    /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?){2,4}\d{2,4}\b/g,
    '[phone redacted]'
  );

  return cleaned;
}

export interface NormalizedJobData {
  id: string;
  title: string;
  city: string;
  country: string;
  subject: string | null;
  curriculum: string;
  currency: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryRaw: string;
  analysisData: {
    subject: string | null;
    curriculum: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    city: string;
    country: string;
  };
}

/**
 * Data Normalization Engine:
 * Cleans and standardizes city, country, subject, and curriculum fields,
 * and maps missing currency codes to the local host country currency.
 */
export function normalizeJobData(rawJob: any, schoolData?: any, costOfLivingData?: any[]): NormalizedJobData {
  const rawCountry = rawJob?.country || schoolData?.country || schoolData?.region || "";
  const canonCountry = canonicalCountryName(rawCountry);

  let rawCity = rawJob?.city || schoolData?.city || schoolData?.town || schoolData?.location || "";
  rawCity = String(rawCity).trim().replace(/[^\w\s-]/g, '');

  let matchedCol: any = null;
  if (costOfLivingData && Array.isArray(costOfLivingData) && costOfLivingData.length > 0) {
    const normCity = rawCity.toLowerCase();
    matchedCol = costOfLivingData.find(c => {
      const colCity = (c.city || c.locationName || c.city_name || c.id || '').toLowerCase();
      const colCountry = canonicalCountryName(c.country || c.countryName || '');
      return (colCity && normCity && (colCity.includes(normCity) || normCity.includes(colCity))) &&
             (!colCountry || colCountry === canonCountry);
    });
  }

  const finalCity = matchedCol?.city || matchedCol?.locationName || rawCity || "International";
  const finalCountry = matchedCol?.country || matchedCol?.countryName || rawCountry || "International";

  const extractedSub = rawJob?.subject || rawJob?.analysisData?.subject || extractSubject(rawJob?.title) || null;

  const rawCurr = String(rawJob?.curriculum || rawJob?.analysisData?.curriculum || schoolData?.curriculum || "").toLowerCase();
  let finalCurriculum = "British";
  if (rawCurr.includes("ib") || rawCurr.includes("international baccalaureate") || rawCurr.includes("pyp") || rawCurr.includes("myp") || rawCurr.includes("dp")) {
    finalCurriculum = "IB";
  } else if (rawCurr.includes("american") || rawCurr.includes("us") || rawCurr.includes("ap") || rawCurr.includes("common core")) {
    finalCurriculum = "American";
  } else if (rawCurr.includes("australian")) {
    finalCurriculum = "Australian";
  } else if (rawCurr.includes("canadian") || rawCurr.includes("ontario")) {
    finalCurriculum = "Canadian";
  } else if (rawCurr.includes("british") || rawCurr.includes("cambridge") || rawCurr.includes("uk") || rawCurr.includes("england") || rawCurr.includes("national curriculum")) {
    finalCurriculum = "British";
  } else if (schoolData?.curriculum) {
    finalCurriculum = schoolData.curriculum;
  }

  let currency = rawJob?.currency || rawJob?.analysisData?.currency || schoolData?.currency;
  if (!currency || typeof currency !== 'string' || currency.trim() === '') {
    const lookupKey = canonCountry.toLowerCase();
    currency = COUNTRY_TO_CURRENCY[lookupKey] || (matchedCol?.currencyCode || matchedCol?.currency) || "USD";
  }
  currency = currency.toUpperCase().trim();

  const salaryRaw = String(rawJob?.salaryRaw || rawJob?.salary || schoolData?.salaryRange || schoolData?.salary || schoolData?.netbase || "");
  const salaryMin = rawJob?.salaryMin ?? rawJob?.analysisData?.salaryMin ?? parseSalaryAmount(salaryRaw);
  const salaryMax = rawJob?.salaryMax ?? rawJob?.analysisData?.salaryMax ?? parseSalaryAmount(salaryRaw);

  const analysisData = {
    subject: extractedSub,
    curriculum: finalCurriculum,
    salaryMin,
    salaryMax,
    currency,
    city: finalCity,
    country: finalCountry
  };

  return {
    id: rawJob?.id || "",
    title: rawJob?.title || "",
    city: finalCity,
    country: finalCountry,
    subject: extractedSub,
    curriculum: finalCurriculum,
    currency,
    salaryMin,
    salaryMax,
    salaryRaw,
    analysisData
  };
}

export interface ScrapeAuditLogEntry {
  timestamp?: any;
  schoolsScanned: number;
  jobsFound: number;
  autoApprovedCount: number;
  delistedCount: number;
  failureMessages?: string[];
  durationMs?: number;
  triggeredBy?: string;
}

/**
 * Ingestion Audit Logging:
 * Writes an entry into the `scrape_logs` Firestore collection.
 */
export async function logScrapeAudit(entry: ScrapeAuditLogEntry) {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const payload = {
    timestamp: entry.timestamp || now,
    schoolsScanned: entry.schoolsScanned || 0,
    jobsFound: entry.jobsFound || 0,
    autoApprovedCount: entry.autoApprovedCount || 0,
    delistedCount: entry.delistedCount || 0,
    failureMessages: entry.failureMessages || [],
    durationMs: entry.durationMs || 0,
    createdAt: now
  };

  try {
    if (isAdmin) {
      await dbInstance.collection('scrape_logs').add(payload);
    } else {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(clientDb, 'scrape_logs'), payload);
    }
  } catch (err) {
    console.error("Failed to write to scrape_logs collection:", err);
  }
}


/**
 * Managed Headless Browser Fallback Integration:
 * - Attempts Firecrawl API, ScrapingBee, Browserbase, or Playwright stealth scraper
 * - Executes JavaScript, bypasses Cloudflare challenges, and returns final rendered status and URL
 */
async function scrapeWithManagedBrowserFallback(url: string): Promise<{ success: boolean; status: number; finalUrl: string; isBlocked: boolean }> {
  // 1. Check Firecrawl API
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firecrawlKey}`
        },
        body: JSON.stringify({ url, pageOptions: { onlyMainContent: false } })
      });
      if (res.ok) {
        const json = await res.json();
        const finalUrl = json.data?.metadata?.sourceURL || url;
        const statusCode = json.data?.metadata?.statusCode || 200;
        return { success: statusCode < 400, status: statusCode, finalUrl, isBlocked: false };
      }
    } catch (e) {
      console.warn("Firecrawl fallback attempt failed:", e);
    }
  }

  // 2. Check ScrapingBee API
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (scrapingBeeKey) {
    try {
      const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${scrapingBeeKey}&url=${encodeURIComponent(url)}&render_js=true`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        return { success: true, status: 200, finalUrl: url, isBlocked: false };
      }
    } catch (e) {
      console.warn("ScrapingBee fallback attempt failed:", e);
    }
  }

  // 3. Fallback to Local Playwright Stealth Scraper
  try {
    const { scrapePage } = await import('@/lib/crawler/scraperEngine');
    const result = await scrapePage(url, { timeoutMs: 15000, blockResources: true });
    return {
      success: result.success,
      status: result.status,
      finalUrl: result.finalUrl || url,
      isBlocked: result.isBlocked
    };
  } catch (err) {
    console.warn("Local stealth scraper fallback failed:", err);
    return { success: false, status: 0, finalUrl: url, isBlocked: false };
  }
}

// =====================================================================
// 🚫 BLOG, NEWS & HISTORICAL OUTDATED VACANCY FILTERS
// =====================================================================

const BLOG_NEWS_PATH_REGEX = /\/(news|blog|blogs|articles|press|archives|weekly-roundup)\//i;

/**
 * Checks if a candidate URL points to a blog, news roundup, or unparameterized portal
 */
export const THIRD_PARTY_AGGREGATOR_DOMAINS = [
  'waytogulf.com',
  'optioncarriere.com',
  'optioncarriere',
  'jobrapido.com',
  'jobrapido',
  'jooble.org',
  'jooble.com',
  'bebee.com',
  'whatjobs.com',
  'adzuna.com',
  'adzuna.co.uk',
  'bayt.com',
  'naukrigulf.com',
  'gulftalent.com',
  'monstergulf.com',
  'tanqeeb.com',
  'careerjet.com',
  'indeed.com',
  'glassdoor.com',
  'qling.ai',
  'talent.com',
  'neuvoo.com',
  'ziprecruiter.com',
  'drjobs.ae',
  'edarabia.com/jobs',
  'learn4good.com',
  'allfreightjobs.com'
];

export function isThirdPartyAggregatorUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  return THIRD_PARTY_AGGREGATOR_DOMAINS.some(domain => lower.includes(domain));
}

export function isExcludedNewsOrBlogUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const clean = url.trim().toLowerCase();

  // 1. Check for third-party job aggregators (phantom mirror listings)
  if (isThirdPartyAggregatorUrl(clean)) {
    return true;
  }

  // 2. Check for news, blog, press, archives path segments
  if (BLOG_NEWS_PATH_REGEX.test(clean)) {
    return true;
  }

  // 3. Schrole specific check: must contain active vacancy routes
  if (clean.includes('schrole.com')) {
    const isSchroleVacancy = clean.includes('/app/') || clean.includes('/vacancy/') || clean.includes('/job/') || clean.includes('/jobs/');
    if (!isSchroleVacancy) {
      return true;
    }
  }

  return false;
}

/**
 * Historical Year & Date Sanity Check:
 * - Detects 4-digit years < 2026 in title or URL
 * - If yearless date on page published > 60 days ago, flags as expired
 */
export function isHistoricalExpiredJob(params: {
  title?: string;
  url?: string;
  dateStr?: string;
  publishedAtMillis?: number;
  currentYear?: number;
}): { isHistoricalExpired: boolean; reason?: string } {
  const { title = '', url = '', publishedAtMillis, currentYear = 2026 } = params;

  // 1. Check 4-digit years in URL and Title
  const combinedText = `${title} ${url}`.toLowerCase();
  const yearMatches = combinedText.match(/\b(201\d|202[0-5])\b/g); // 2010 to 2025
  if (yearMatches && yearMatches.length > 0) {
    const pastYear = Math.max(...yearMatches.map(Number));
    if (pastYear < currentYear) {
      return { isHistoricalExpired: true, reason: `Historical year detected: ${pastYear}` };
    }
  }

  // 2. Yearless date on page older than 60 days
  if (publishedAtMillis) {
    const ageDays = (Date.now() - publishedAtMillis) / (1000 * 60 * 60 * 24);
    if (ageDays > 60) {
      return { isHistoricalExpired: true, reason: `Publication age exceeded 60 days: ${Math.round(ageDays)} days old` };
    }
  }

  return { isHistoricalExpired: false };
}

/**
 * Live HTTP URL Verification Engine:
 * - Rejects blog posts, news roundups, and inactive routes
 * - Makes HTTP HEAD (with GET fallback) request following redirects
 * - If 403, 429, 503, or Cloudflare challenge detected -> Fallback to Managed Headless Browser
 * - If 404, 410, or redirects to root domain / generic home -> 'delisted'
 * - If 200 OK -> 'approved'
 */
export interface JobUrlVerificationResult {
  isValid: boolean;
  status: 'approved' | 'delisted';
  finalUrl: string;
  delistReason?: string;
}

export async function verifyJobUrlHttp(url: string): Promise<JobUrlVerificationResult> {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: url || '' };
  }

  const cleanUrl = url.trim();

  // 🚫 Reject third-party aggregators, blog posts, press releases, and invalid routes
  if (isExcludedNewsOrBlogUrl(cleanUrl) || isThirdPartyAggregatorUrl(cleanUrl)) {
    return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: cleanUrl };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    let res: Response;
    let isGetFetched = false;
    let responseText = '';

    try {
      res = await fetch(cleanUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
      if (res.status === 405 || res.status === 501) {
        isGetFetched = true;
        res = await fetch(cleanUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });
      }
    } catch {
      isGetFetched = true;
      res = await fetch(cleanUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });
    }

    clearTimeout(timeoutId);

    const finalUrl = res.url || cleanUrl;
    const statusCode = res.status;

    // 🛡️ BLOCK DETECTION: 403 Forbidden, 429 Rate Limit, 503, or Cloudflare challenge
    const isBlockStatus = statusCode === 403 || statusCode === 429 || statusCode === 503;
    let isCloudflareChallenge = false;

    if (isGetFetched && res.ok) {
      try {
        responseText = (await res.text()).toLowerCase();
        isCloudflareChallenge = responseText.includes('just a moment...') || 
                                responseText.includes('checking your browser') ||
                                responseText.includes('cf-browser-verification') ||
                                responseText.includes('turnstile');
      } catch {}
    }

    if (isBlockStatus || isCloudflareChallenge) {
      console.log(`🛡️ [VERIFIER] Protected portal block detected (${statusCode}). Invoking managed headless browser fallback for: ${cleanUrl}`);
      const headless = await scrapeWithManagedBrowserFallback(cleanUrl);
      
      if (headless.success && headless.status >= 200 && headless.status < 400 && !headless.isBlocked) {
        // Verify root redirect
        let isRedirectToRoot = false;
        try {
          const parsedInitial = new URL(cleanUrl);
          const parsedFinal = new URL(headless.finalUrl);
          const finalPath = parsedFinal.pathname.replace(/\/$/, '');
          if (parsedInitial.pathname.length > 2 && (finalPath === '' || finalPath === '/') && !parsedFinal.search) {
            isRedirectToRoot = true;
          }
        } catch {}

        if (isRedirectToRoot || isThirdPartyAggregatorUrl(headless.finalUrl)) {
          return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: headless.finalUrl };
        }

        return { isValid: true, status: 'approved', finalUrl: headless.finalUrl };
      } else if (headless.status === 404 || headless.status === 410) {
        return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: headless.finalUrl };
      }
    }

    if (statusCode === 404 || statusCode === 410 || statusCode >= 500 || isThirdPartyAggregatorUrl(finalUrl)) {
      return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl };
    }

    // Check if redirected to root domain without query params
    let isRedirectToRoot = false;
    try {
      const parsedInitial = new URL(cleanUrl);
      const parsedFinal = new URL(finalUrl);
      const finalPath = parsedFinal.pathname.replace(/\/$/, '');
      if (parsedInitial.pathname.length > 2 && (finalPath === '' || finalPath === '/') && !parsedFinal.search) {
        isRedirectToRoot = true;
      }
    } catch {}

    if (isRedirectToRoot) {
      return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl };
    }

    if (statusCode >= 200 && statusCode < 300) {
      return { isValid: true, status: 'approved', finalUrl };
    }

    return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl };
  } catch {
    clearTimeout(timeoutId);
    // Fallback to Headless Browser on network/timeout failure
    console.log(`🛡️ [VERIFIER] Network fetch failed for ${cleanUrl}. Invoking managed headless browser fallback...`);
    const headless = await scrapeWithManagedBrowserFallback(cleanUrl);
    if (headless.success && headless.status >= 200 && headless.status < 400 && !headless.isBlocked) {
      if (isThirdPartyAggregatorUrl(headless.finalUrl)) {
        return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: headless.finalUrl };
      }
      return { isValid: true, status: 'approved', finalUrl: headless.finalUrl };
    }
    return { isValid: false, status: 'delisted', delistReason: 'phantom_unverified_vacancy', finalUrl: cleanUrl };
  }
}

export interface ScrapeWorkerLogEntry {
  timestamp?: any;
  schoolId: string;
  queriesExecuted?: string[];
  jobsDiscovered: number;
  autoApprovedCount: number;
  delistedCount: number;
  errors?: string[];
  durationMs?: number;
}

/**
 * Ingestion Audit Logging (Per-Worker Sweep Task Execution):
 * Writes a document into the `scrape_logs` collection detailing:
 * timestamp, schoolId, queriesExecuted, jobsDiscovered, autoApprovedCount, delistedCount, errors.
 */
export async function logScrapeWorkerExecution(entry: ScrapeWorkerLogEntry) {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const payload = {
    timestamp: entry.timestamp || now,
    schoolId: entry.schoolId || "",
    queriesExecuted: entry.queriesExecuted || [],
    jobsDiscovered: entry.jobsDiscovered || 0,
    autoApprovedCount: entry.autoApprovedCount || 0,
    delistedCount: entry.delistedCount || 0,
    errors: entry.errors || [],
    durationMs: entry.durationMs || 0,
    createdAt: now
  };

  try {
    if (isAdmin) {
      await dbInstance.collection('scrape_logs').add(payload);
    } else {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(clientDb, 'scrape_logs'), payload);
    }
  } catch (err) {
    console.error("Failed to record sweep worker log entry:", err);
  }
}

// =====================================================================
// 👑 ADMIN JOB OVERRIDE METHODS (IMMUNE TO AUTOMATED CRAWLER CHANGES)
// =====================================================================

export async function manuallyApproveJob(schoolId: string, jobId: string, reviewedBy: string = "admin") {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const overrideData = {
    status: 'approved',
    isManualOverride: true,
    manuallyOverriddenAt: now,
    reviewedBy,
    lastVerifiedAt: now
  };

  if (isAdmin) {
    await dbInstance.collection('schools').doc(schoolId).collection('jobs').doc(jobId).set(overrideData, { merge: true });
  } else {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(clientDb, 'schools', schoolId, 'jobs', jobId), overrideData, { merge: true });
  }
}

export async function manuallyDelistJob(schoolId: string, jobId: string, reviewedBy: string = "admin") {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const overrideData = {
    status: 'delisted',
    isManualOverride: true,
    manuallyOverriddenAt: now,
    reviewedBy,
    lastVerifiedAt: now
  };

  if (isAdmin) {
    await dbInstance.collection('schools').doc(schoolId).collection('jobs').doc(jobId).set(overrideData, { merge: true });
  } else {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(clientDb, 'schools', schoolId, 'jobs', jobId), overrideData, { merge: true });
  }
}

export async function manuallyExpireJob(schoolId: string, jobId: string, reviewedBy: string = "admin") {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const overrideData = {
    status: 'expired',
    isManualOverride: true,
    manuallyOverriddenAt: now,
    reviewedBy,
    lastVerifiedAt: now
  };

  if (isAdmin) {
    await dbInstance.collection('schools').doc(schoolId).collection('jobs').doc(jobId).set(overrideData, { merge: true });
  } else {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(clientDb, 'schools', schoolId, 'jobs', jobId), overrideData, { merge: true });
  }
}

export async function moveJobToPending(schoolId: string, jobId: string, reviewedBy: string = "admin") {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const overrideData = {
    status: 'pending_review',
    isManualOverride: true,
    manuallyOverriddenAt: now,
    reviewedBy,
    lastVerifiedAt: now
  };

  if (isAdmin) {
    await dbInstance.collection('schools').doc(schoolId).collection('jobs').doc(jobId).set(overrideData, { merge: true });
  } else {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(clientDb, 'schools', schoolId, 'jobs', jobId), overrideData, { merge: true });
  }
}

// =====================================================================
// 🔍 FUZZY JOB FINGERPRINT GENERATION & DEDUPLICATION
// =====================================================================

/**
 * Standardizes title, subject, and hierarchy level to generate a deterministic fingerprint
 * for identifying identical vacancies across multiple sources (e.g. TES vs Direct Portal).
 */
export function generateJobFingerprint(schoolId: string, title: string, subject?: string | null): string {
  const cleanSchool = (schoolId || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  const cleanTitle = (title || "").toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const cleanSub = (subject || "").toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // 1. Identify Normalized Subject
  let normSubject = "general";
  if (cleanTitle.includes("math") || cleanSub.includes("math")) normSubject = "maths";
  else if (cleanTitle.includes("physic") || cleanSub.includes("physic")) normSubject = "physics";
  else if (cleanTitle.includes("chem") || cleanSub.includes("chem")) normSubject = "chemistry";
  else if (cleanTitle.includes("bio") || cleanSub.includes("bio")) normSubject = "biology";
  else if (cleanTitle.includes("sci") || cleanSub.includes("sci")) normSubject = "science";
  else if (cleanTitle.includes("eng") || cleanSub.includes("eng")) normSubject = "english";
  else if (cleanTitle.includes("hist") || cleanSub.includes("hist")) normSubject = "history";
  else if (cleanTitle.includes("geog") || cleanSub.includes("geog")) normSubject = "geography";
  else if (cleanTitle.includes("comput") || cleanTitle.includes("ict") || cleanSub.includes("comput")) normSubject = "computing";
  else if (cleanTitle.includes("art") || cleanSub.includes("art")) normSubject = "art";
  else if (cleanTitle.includes("music") || cleanSub.includes("music")) normSubject = "music";
  else if (cleanTitle.includes("drama") || cleanSub.includes("drama")) normSubject = "drama";
  else if (cleanTitle.includes("pe") || cleanTitle.includes("physical ed") || cleanSub.includes("pe")) normSubject = "pe";
  else if (cleanTitle.includes("kindergarten") || cleanTitle.includes("early years") || cleanTitle.includes("eyfs") || cleanTitle.includes("primary") || cleanSub.includes("primary")) normSubject = "primary";
  else if (cleanTitle.includes("french") || cleanTitle.includes("spanish") || cleanTitle.includes("german") || cleanTitle.includes("mandarin") || cleanTitle.includes("language")) normSubject = "languages";

  // 2. Identify Role Hierarchy Level
  let level = "teacher";
  if (cleanTitle.includes("head") || cleanTitle.includes("director") || cleanTitle.includes("principal") || cleanTitle.includes("coordinator") || cleanTitle.includes("lead")) {
    level = "leadership";
  } else if (cleanTitle.includes("assistant") || cleanTitle.includes("intern") || cleanTitle.includes("aid")) {
    level = "assistant";
  }

  return `fp_${cleanSchool}_${normSubject}_${level}`;
}

export async function saveScrapedJobs(schoolId: string, jobs: any[]) {
  if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
    return;
  }

  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  if (isAdmin) {
    const schoolRef = dbInstance.collection('schools').doc(schoolId);
    const schoolSnap = await schoolRef.get();
    const schoolData = schoolSnap.exists ? schoolSnap.data() : null;

    const jobsCol = schoolRef.collection('jobs');
    const now = admin.firestore.Timestamp.now();
    const defaultRollingDate = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    const existingSnap = await jobsCol.get();
    const existingDocsMap = new Map<string, any>();
    const fingerprintToDocMap = new Map<string, { id: string; data: any }>();

    existingSnap.docs.forEach((doc: any) => {
      const d = doc.data();
      existingDocsMap.set(doc.id, d);
      const fp = d.jobFingerprint || generateJobFingerprint(schoolId, d.title, d.subject);
      if (d.status === 'approved') {
        fingerprintToDocMap.set(fp, { id: doc.id, data: d });
      }
    });

    const writeBatch = dbInstance.batch();
    const { isSupportOrNonTeachingRole } = await import('@/lib/crawler/roleClassifier');
    for (const rawJob of jobs) {
      if (!rawJob || !rawJob.id) continue;
      if (isSupportOrNonTeachingRole(rawJob.title)) {
        continue;
      }
      const job = normalizeJobData(rawJob, schoolData);
      const newFingerprint = rawJob.jobFingerprint || generateJobFingerprint(schoolId, job.title, job.subject);
      const applyUrl = rawJob.applyUrl || rawJob.source_url || "";

      // 🔍 DEDUPLICATION CHECK: If approved vacancy with matching fingerprint already exists, merge links
      const existingMatch = fingerprintToDocMap.get(newFingerprint);
      if (existingMatch && existingMatch.id !== rawJob.id) {
        const matchRef = jobsCol.doc(existingMatch.id);
        const currentUrls: string[] = existingMatch.data.alternateUrls || [];
        if (existingMatch.data.applyUrl) currentUrls.push(existingMatch.data.applyUrl);
        if (applyUrl) currentUrls.push(applyUrl);
        const uniqueUrls = Array.from(new Set(currentUrls.filter(Boolean)));

        writeBatch.set(
          matchRef,
          {
            alternateUrls: uniqueUrls,
            lastVerifiedAt: now
          },
          { merge: true }
        );
        continue;
      }

      const ref = jobsCol.doc(job.id);
      const existing = existingDocsMap.get(job.id);

      const isExplicitDateProvided = Boolean(
        rawJob.closingDate &&
        (rawJob.closingDate instanceof admin.firestore.Timestamp ||
         (rawJob.closingDate instanceof Date && !isNaN(rawJob.closingDate.getTime())) ||
         (typeof rawJob.closingDate === 'string' && !isNaN(new Date(rawJob.closingDate).getTime())))
      );
      const isRolling = Boolean(rawJob.isRolling ?? rawJob.isRollingDeadline ?? !isExplicitDateProvided);

      let firestoreClosingDate: admin.firestore.Timestamp;
      if (isRolling) {
        let targetRollingDate = defaultRollingDate;
        if (existing?.lastVerifiedAt) {
          const lastVerifiedMillis = existing.lastVerifiedAt.toMillis ? existing.lastVerifiedAt.toMillis() : (existing.lastVerifiedAt.seconds * 1000);
          const daysElapsed = (Date.now() - lastVerifiedMillis) / (1000 * 60 * 60 * 24);
          if (daysElapsed >= 14) {
            targetRollingDate = defaultRollingDate;
          } else if (existing.closingDate && existing.closingDate.toMillis() > Date.now()) {
            targetRollingDate = existing.closingDate;
          }
        }
        firestoreClosingDate = targetRollingDate;
      } else if (rawJob.closingDate instanceof admin.firestore.Timestamp) {
        firestoreClosingDate = rawJob.closingDate;
      } else {
        const d = new Date(rawJob.closingDate);
        firestoreClosingDate = admin.firestore.Timestamp.fromDate(d);
      }

      const closingDateTime = firestoreClosingDate.toMillis();
      const isFuture = closingDateTime >= Date.now();
      const hasDirectUrl = Boolean(
        applyUrl &&
        typeof applyUrl === 'string' &&
        applyUrl.trim().length > 0 &&
        !applyUrl.includes('undefined') &&
        !applyUrl.includes('null')
      );

      const isManualOverride = Boolean(existing?.isManualOverride);
      let status = rawJob.status;

      // Historical year check (e.g. 2024, 2025 in URL or title)
      const histCheck = isHistoricalExpiredJob({
        title: job.title,
        url: applyUrl,
        publishedAtMillis: getMillis(rawJob.publishedAt || rawJob.firstDiscoveredAt)
      });

      if (isManualOverride && existing?.status) {
        status = existing.status;
      } else if (histCheck.isHistoricalExpired) {
        status = 'expired';
      } else if (!isFuture) {
        status = 'expired';
      }
      
      // 🛡️ STRICT CURRENT ADVERT ENFORCEMENT: Never write expired, past-date, or delisted jobs to live database
      if (!isFuture || status === 'expired' || status === 'delisted' || histCheck.isHistoricalExpired) {
        if (existing) {
          writeBatch.delete(ref);
        }
        continue;
      }

      // 🛡️ NO LINK -> NO LISTING MANDATE: If no valid direct URL, discard/delete immediately
      if (!hasDirectUrl) {
        if (existing) {
          writeBatch.delete(ref);
        }
        continue;
      }

      // 🛡️ EXPLICIT EXPIRY DATE MANDATE:
      // If no explicit closing date is specified, route to pending_review for manual checking
      if (!isExplicitDateProvided || isRolling) {
        status = 'pending_review';
      } else {
        const httpCheck = await verifyJobUrlHttp(applyUrl);
        if (httpCheck.status === 'delisted') {
          if (existing) writeBatch.delete(ref);
          continue;
        } else {
          status = 'approved';
        }
      }

      const firstDiscoveredAt = existing?.firstDiscoveredAt || rawJob.firstDiscoveredAt || now;

      // Compute lifespan duration in days for school analytics
      const discoveredTime = getMillis(firstDiscoveredAt);
      const closingTime = getMillis(firestoreClosingDate);
      const durationDays = Math.max(1, Math.round((closingTime - discoveredTime) / (1000 * 60 * 60 * 24)));

      // Data Archive Partitioning: move heavy unstructured text into compressed sub-object for expired/delisted jobs
      const isHistorical = status === 'expired' || status === 'delisted';
      const historicalMetadata = isHistorical ? {
        archivedAt: now,
        originalApplyUrl: applyUrl,
        rawText: sanitizeJobContent(rawJob.rawText || rawJob.textContent || rawJob.description || "") || null,
        rawHtml: sanitizeJobContent(rawJob.rawHtml || rawJob.html || "") || null,
        lifecycleReason: status === 'expired' ? 'closing_date_elapsed' : 'http_link_delisted'
      } : null;

      const alternateUrls = existing?.alternateUrls || (rawJob.alternateUrls || []);
      if (applyUrl && !alternateUrls.includes(applyUrl)) {
        alternateUrls.push(applyUrl);
      }

      writeBatch.set(
        ref,
        {
          id: job.id,
          title: job.title,
          sourceName: rawJob.sourceName || rawJob.source || "Web",
          applyUrl: applyUrl,
          alternateUrls,
          jobFingerprint: newFingerprint,
          closingDate: firestoreClosingDate,
          isRolling,
          firstDiscoveredAt,
          lastVerifiedAt: now,
          status,
          isManualOverride,
          durationDays,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          city: job.city,
          country: job.country,
          subject: job.subject,
          curriculum: job.curriculum,
          currency: job.currency,
          historicalMetadata,
          isHistorical,
          analysisData: job.analysisData,
          salaryRaw: job.salaryRaw,
          scrapedAt: now
        },
        { merge: true }
      );
    }
    await writeBatch.commit();
  } else {
    const { collection, getDocs, doc, writeBatch: fbWriteBatch, Timestamp, getDoc } = await import('firebase/firestore');
    const parentRef = doc(clientDb, 'schools', schoolId);
    const schoolSnap = await getDoc(parentRef);
    const schoolData = schoolSnap.exists() ? schoolSnap.data() : null;

    const jobsCol = collection(parentRef, 'jobs');
    const now = Timestamp.now();
    const defaultRollingDate = Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    const existingSnap = await getDocs(jobsCol);
    const existingDocsMap = new Map<string, any>();
    const fingerprintToDocMap = new Map<string, { id: string; data: any }>();

    existingSnap.docs.forEach((d) => {
      const data = d.data();
      existingDocsMap.set(d.id, data);
      const fp = data.jobFingerprint || generateJobFingerprint(schoolId, data.title, data.subject);
      if (data.status === 'approved') {
        fingerprintToDocMap.set(fp, { id: d.id, data });
      }
    });

    const batch = fbWriteBatch(clientDb);
    for (const rawJob of jobs) {
      if (!rawJob || !rawJob.id) continue;
      const job = normalizeJobData(rawJob, schoolData);
      const newFingerprint = rawJob.jobFingerprint || generateJobFingerprint(schoolId, job.title, job.subject);
      const applyUrl = rawJob.applyUrl || rawJob.source_url || "";

      // Deduplication check
      const existingMatch = fingerprintToDocMap.get(newFingerprint);
      if (existingMatch && existingMatch.id !== rawJob.id) {
        const matchRef = doc(jobsCol, existingMatch.id);
        const currentUrls: string[] = existingMatch.data.alternateUrls || [];
        if (existingMatch.data.applyUrl) currentUrls.push(existingMatch.data.applyUrl);
        if (applyUrl) currentUrls.push(applyUrl);
        const uniqueUrls = Array.from(new Set(currentUrls.filter(Boolean)));

        batch.set(
          matchRef,
          {
            alternateUrls: uniqueUrls,
            lastVerifiedAt: now
          },
          { merge: true }
        );
        continue;
      }

      const ref = doc(jobsCol, job.id);
      const existing = existingDocsMap.get(job.id);

      const isExplicitDateProvided = Boolean(
        rawJob.closingDate &&
        (rawJob.closingDate instanceof Timestamp ||
         (rawJob.closingDate instanceof Date && !isNaN(rawJob.closingDate.getTime())) ||
         (typeof rawJob.closingDate === 'string' && !isNaN(new Date(rawJob.closingDate).getTime())))
      );
      const isRolling = Boolean(rawJob.isRolling ?? rawJob.isRollingDeadline ?? !isExplicitDateProvided);

      let firestoreClosingDate: any;
      if (isRolling) {
        let targetRollingDate = defaultRollingDate;
        if (existing?.lastVerifiedAt) {
          const lastVerifiedMillis = existing.lastVerifiedAt.toMillis ? existing.lastVerifiedAt.toMillis() : (existing.lastVerifiedAt.seconds * 1000);
          const daysElapsed = (Date.now() - lastVerifiedMillis) / (1000 * 60 * 60 * 24);
          if (daysElapsed >= 14) {
            targetRollingDate = defaultRollingDate;
          } else if (existing.closingDate) {
            const existMillis = existing.closingDate.toMillis ? existing.closingDate.toMillis() : (existing.closingDate.seconds * 1000);
            if (existMillis > Date.now()) {
              targetRollingDate = existing.closingDate;
            }
          }
        }
        firestoreClosingDate = targetRollingDate;
      } else if (rawJob.closingDate instanceof Timestamp) {
        firestoreClosingDate = rawJob.closingDate;
      } else {
        const d = new Date(rawJob.closingDate);
        firestoreClosingDate = Timestamp.fromDate(d);
      }

      const closingDateTime = firestoreClosingDate.toMillis ? firestoreClosingDate.toMillis() : firestoreClosingDate.seconds * 1000;
      const isFuture = closingDateTime >= Date.now();
      const hasDirectUrl = Boolean(
        applyUrl &&
        typeof applyUrl === 'string' &&
        applyUrl.trim().length > 0 &&
        !applyUrl.includes('undefined') &&
        !applyUrl.includes('null')
      );

      const isManualOverride = Boolean(existing?.isManualOverride);
      let status = rawJob.status;

      const histCheck = isHistoricalExpiredJob({
        title: job.title,
        url: applyUrl,
        publishedAtMillis: getMillis(rawJob.publishedAt || rawJob.firstDiscoveredAt)
      });

      if (isManualOverride && existing?.status) {
        status = existing.status;
      } else if (histCheck.isHistoricalExpired) {
        status = 'expired';
      } else if (!isFuture) {
        status = 'expired';
      } else if (hasDirectUrl) {
        const httpCheck = await verifyJobUrlHttp(applyUrl);
        if (httpCheck.status === 'delisted') {
          status = 'delisted';
        } else {
          status = 'approved';
        }
      } else if (!status) {
        status = 'pending_review';
      }

      const firstDiscoveredAt = existing?.firstDiscoveredAt || rawJob.firstDiscoveredAt || now;

      const discoveredTime = getMillis(firstDiscoveredAt);
      const closingTime = getMillis(firestoreClosingDate);
      const durationDays = Math.max(1, Math.round((closingTime - discoveredTime) / (1000 * 60 * 60 * 24)));

      const isHistorical = status === 'expired' || status === 'delisted';
      const historicalMetadata = isHistorical ? {
        archivedAt: now,
        originalApplyUrl: applyUrl,
        rawText: sanitizeJobContent(rawJob.rawText || rawJob.textContent || rawJob.description || "") || null,
        rawHtml: sanitizeJobContent(rawJob.rawHtml || rawJob.html || "") || null,
        lifecycleReason: status === 'expired' ? 'closing_date_elapsed' : 'http_link_delisted'
      } : null;

      const alternateUrls = existing?.alternateUrls || (rawJob.alternateUrls || []);
      if (applyUrl && !alternateUrls.includes(applyUrl)) {
        alternateUrls.push(applyUrl);
      }

      batch.set(
        ref,
        {
          id: job.id,
          title: job.title,
          sourceName: rawJob.sourceName || rawJob.source || "Web",
          applyUrl: applyUrl,
          alternateUrls,
          jobFingerprint: newFingerprint,
          closingDate: firestoreClosingDate,
          isRolling,
          firstDiscoveredAt,
          lastVerifiedAt: now,
          status,
          isManualOverride,
          durationDays,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          city: job.city,
          country: job.country,
          subject: job.subject,
          curriculum: job.curriculum,
          currency: job.currency,
          historicalMetadata,
          isHistorical,
          analysisData: job.analysisData,
          salaryRaw: job.salaryRaw,
          scrapedAt: now
        },
        { merge: true }
      );
    }
    await batch.commit();
  }
}

/**
 * Fast historical query for school profile dashboards (filtered by expired/delisted status)
 */
export async function getSchoolHistoricalAnalytics(schoolId: string) {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  if (isAdmin) {
    const snap = await dbInstance
      .collection('schools')
      .doc(schoolId)
      .collection('jobs')
      .where('status', 'in', ['expired', 'delisted'])
      .orderBy('closingDate', 'desc')
      .limit(50)
      .get();

    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  } else {
    const { collection, getDocs, doc, query, where, orderBy, limit } = await import('firebase/firestore');
    const parentRef = doc(clientDb, 'schools', schoolId);
    const jobsCol = collection(parentRef, 'jobs');
    const q = query(jobsCol, where('status', 'in', ['expired', 'delisted']), orderBy('closingDate', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

// =====================================================================
// 🌐 DYNAMIC SCHEMA.ORG / JOBPOSTING JSON-LD GENERATOR & METADATA
// =====================================================================

export interface JsonLdJobPosting {
  "@context": string;
  "@type": string;
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization: {
    "@type": string;
    name: string;
    sameAs?: string;
  };
  jobLocation: {
    "@type": string;
    address: {
      "@type": string;
      addressLocality: string;
      addressCountry: string;
    };
  };
  baseSalary?: {
    "@type": string;
    currency: string;
    value: {
      "@type": string;
      minValue?: number;
      maxValue?: number;
      unitText: string;
    };
  };
}

/**
 * Builds Schema.org/JobPosting JSON-LD array for active vacancies to maximize Google Search visibility
 */
export function generateJobPostingJsonLd(jobs: any[]): JsonLdJobPosting[] {
  if (!jobs || !Array.isArray(jobs)) return [];

  return jobs.map(job => {
    const rawPosted = job.firstDiscoveredAt || job.scrapedAt || job.date_listed;
    let datePosted = new Date().toISOString();
    if (rawPosted) {
      if (rawPosted.seconds) datePosted = new Date(rawPosted.seconds * 1000).toISOString();
      else if (rawPosted instanceof Date) datePosted = rawPosted.toISOString();
      else if (!isNaN(new Date(rawPosted).getTime())) datePosted = new Date(rawPosted).toISOString();
    }

    const rawClosing = job.closingDate || job.closesDateRaw || job.date_closing;
    let validThrough: string | undefined = undefined;
    if (rawClosing) {
      if (rawClosing.seconds) validThrough = new Date(rawClosing.seconds * 1000).toISOString();
      else if (rawClosing instanceof Date) validThrough = rawClosing.toISOString();
      else if (!isNaN(new Date(rawClosing).getTime())) validThrough = new Date(rawClosing).toISOString();
    }

    const schoolName = job.schoolName || job.schoolname || "International School";
    const website = job.schoolWebsite || job.website || "https://leopardfishintel.com";
    const city = job.city || "International";
    const country = job.country || "Worldwide";
    const curriculum = job.curriculum || "International";
    const department = job.department || "Secondary";

    const description = `${job.title} vacancy at ${schoolName} located in ${city}, ${country}. Curriculum: ${curriculum}. Department: ${department}. Verified school intelligence, estimated savings potential, and compensation analytics available on Leopardfish Intel.`;

    const item: JsonLdJobPosting = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: job.title,
      description,
      datePosted,
      validThrough,
      employmentType: "FULL_TIME",
      hiringOrganization: {
        "@type": "Organization",
        name: schoolName,
        sameAs: website
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: country
        }
      }
    };

    if (job.analysisData?.salaryMin || job.savingsPotential) {
      item.baseSalary = {
        "@type": "MonetaryAmount",
        currency: job.analysisData?.currency || job.currency || "USD",
        value: {
          "@type": "QuantitativeValue",
          minValue: job.analysisData?.salaryMin || job.savingsPotential,
          maxValue: job.analysisData?.salaryMax || undefined,
          unitText: "MONTH"
        }
      };
    }

    return item;
  });
}

// =====================================================================
// 🔒 ENDPOINT SECURITY & CONCURRENCY LOCKING
// =====================================================================

/**
 * Validates Bearer Token against CRON_SECRET_KEY
 */
export function validateCronSecret(request: Request): boolean {
  const secretKey = process.env.CRON_SECRET_KEY || process.env.CRON_SECRET;
  if (!secretKey) {
    // If no secret key configured in local dev, allow only in development mode
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('x-cron-secret');
  if (!authHeader) return false;

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
  return token === secretKey.trim();
}

/**
 * Execution Concurrency Lock:
 * Checks and acquires a 15-minute distributed lock in Firestore under `system_locks/sweep_lock`.
 * Returns true if lock was successfully acquired, false if an existing lock is currently active.
 */
export async function acquireSweepLock(lockDurationMinutes: number = 15): Promise<boolean> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = Date.now();
  const lockExpiresAt = now + lockDurationMinutes * 60 * 1000;

  try {
    if (isAdmin) {
      const lockRef = dbInstance.collection('system_locks').doc('sweep_lock');
      const lockSnap = await lockRef.get();
      if (lockSnap.exists) {
        const data = lockSnap.data();
        if (data && data.expiresAt && now < data.expiresAt) {
          console.warn(`🔒 [SWEEP LOCK] Concurrent sweep locked until ${new Date(data.expiresAt).toISOString()}. Skipping duplicate run.`);
          return false;
        }
      }
      await lockRef.set({
        acquiredAt: now,
        expiresAt: lockExpiresAt,
        lockedBy: 'daily-sweep'
      });
      return true;
    } else {
      const { doc: cDoc, getDoc: cGetDoc, setDoc: cSetDoc } = await import('firebase/firestore');
      const lockRef = cDoc(clientDb, 'system_locks', 'sweep_lock');
      const lockSnap = await cGetDoc(lockRef);
      if (lockSnap.exists()) {
        const data = lockSnap.data();
        if (data && data.expiresAt && now < data.expiresAt) {
          console.warn(`🔒 [SWEEP LOCK] Concurrent sweep locked until ${new Date(data.expiresAt).toISOString()}. Skipping duplicate run.`);
          return false;
        }
      }
      await cSetDoc(lockRef, {
        acquiredAt: now,
        expiresAt: lockExpiresAt,
        lockedBy: 'daily-sweep'
      });
      return true;
    }
  } catch (err) {
    console.warn("Failed to acquire sweep concurrency lock, continuing with fallback:", err);
    return true;
  }
}

/**
 * Releases the sweep concurrency lock upon execution completion
 */
export async function releaseSweepLock(): Promise<void> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  try {
    if (isAdmin) {
      await dbInstance.collection('system_locks').doc('sweep_lock').delete();
    } else {
      const { doc: cDoc, deleteDoc: cDeleteDoc } = await import('firebase/firestore');
      await cDeleteDoc(cDoc(clientDb, 'system_locks', 'sweep_lock'));
    }
  } catch (err) {
    console.warn("Failed to release sweep lock:", err);
  }
}

// =====================================================================
// 💰 FINANCIAL SAFEGUARDS & REGIONAL SALARY BENCHMARKS
// =====================================================================

export const REGIONAL_SALARY_BENCHMARKS: Record<string, number> = {
  switzerland: 6500,
  "united arab emirates": 4800,
  qatar: 4600,
  "saudi arabia": 4500,
  kuwait: 4400,
  bahrain: 4200,
  oman: 4200,
  singapore: 5200,
  "hong kong": 5400,
  japan: 4200,
  china: 4500,
  "south korea": 4000,
  thailand: 3400,
  vietnam: 3300,
  malaysia: 3200,
  indonesia: 3000,
  czechia: 3200,
  germany: 3800,
  france: 3600,
  spain: 3200,
  italy: 3200,
  "united kingdom": 3800,
  "united states": 4200,
  brazil: 3000,
  argentina: 2800,
  egypt: 2600,
  jordan: 3000,
  default: 3500
};

export interface SafeguardedSavingsResult {
  baseSalary: number;
  calculatedSavings: number;
  isSalaryEstimated: boolean;
  currency: string;
  badgeText?: string;
}

/**
 * Calculates monthly projected savings with zero-NaN and volatile currency safeguards
 */
export function calculateSafeguardedSavings(params: {
  salaryInput?: any;
  schoolCountry?: string;
  housingProvided?: boolean;
  colData?: any;
  familyStatus?: string;
  currency?: string;
  paidInUSD?: boolean;
}): SafeguardedSavingsResult {
  const {
    salaryInput,
    schoolCountry,
    housingProvided,
    colData,
    familyStatus = "Single",
    currency = "USD",
    paidInUSD = false
  } = params;

  const canonCountry = canonicalCountryName(schoolCountry || "");
  const regionalBenchmark = REGIONAL_SALARY_BENCHMARKS[canonCountry] || REGIONAL_SALARY_BENCHMARKS.default;

  let rawSalaryNum = parseSalaryAmount(salaryInput);
  let isSalaryEstimated = false;
  let baseSalary = 0;

  if (rawSalaryNum && rawSalaryNum > 200 && !isNaN(rawSalaryNum)) {
    baseSalary = rawSalaryNum;
  } else {
    baseSalary = regionalBenchmark;
    isSalaryEstimated = true;
  }

  // Family status multiplier
  let rentKey = "rent1br";
  let scalar = 1.0;
  if (familyStatus === "Single") {
    rentKey = "rent1br";
    scalar = 1.0;
  } else if (familyStatus.includes("sole earner") || familyStatus.includes("dual income") || familyStatus.includes("Married")) {
    rentKey = "rent2br";
    scalar = 1.9;
  } else if (familyStatus.includes("+1")) {
    rentKey = "rent3br";
    scalar = 2.3;
  } else if (familyStatus.includes("+2")) {
    rentKey = "rent3br";
    scalar = 2.65;
  } else if (familyStatus.includes("+3")) {
    rentKey = "rent3br";
    scalar = 3.0;
  }

  let rentCost = 0;
  let otherCost = 0;
  let calculatedSavings = 0;

  if (colData) {
    rentCost = housingProvided ? 0 : (colData[rentKey] || 0);
    const groceries = colData.groceries || 0;
    const utilities = colData.utilities || 0;
    const mobilePhone = colData.mobilePhone || colData.mobile || 0;
    const internet = colData.internet || 0;
    const diningSocial = colData.diningSocial || colData.dining || 0;

    otherCost = (groceries + utilities + mobilePhone + internet + diningSocial) * scalar;

    // Volatile market guardrail (e.g. Argentine Peso ARS, Turkish Lira TRY, Egyptian Pound EGP)
    const isVolatile = canonCountry === "argentina" || canonCountry === "egypt" || currency === "ARS" || currency === "EGP" || currency === "TRY";
    const volatileMultiplier = (isVolatile && !paidInUSD) ? 0.25 : 1.0;

    const adjustedOutgoings = otherCost + rentCost;
    calculatedSavings = Math.max(0, Math.round(baseSalary - adjustedOutgoings));
    calculatedSavings = Math.round(calculatedSavings * volatileMultiplier);
  } else {
    calculatedSavings = Math.max(0, Math.round(baseSalary * 0.4));
  }

  if (isNaN(calculatedSavings) || calculatedSavings < 0) {
    calculatedSavings = 0;
  }

  const badgeText = isSalaryEstimated ? "Salary Unlisted / Estimated from Regional Averages" : undefined;

  return {
    baseSalary,
    calculatedSavings,
    isSalaryEstimated,
    currency: isSalaryEstimated ? "USD" : currency,
    badgeText
  };
}

// =====================================================================
// 🧹 GDPR & AUTOMATED DATA RETENTION PURGE (365-DAY EXPIRY)
// =====================================================================

/**
 * Iterates through historical vacancies expired or delisted for > 365 days,
 * purging full raw HTML/Markdown body text to satisfy GDPR data minimization
 * while retaining lightweight structured metadata (salary, subject, durationDays, closingDate).
 */
export async function purgeExpiredJobPayloads(): Promise<{ scanned: number; purged: number }> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const cutoffTimestamp = Date.now() - ONE_YEAR_MS;

  let scanned = 0;
  let purged = 0;

  try {
    if (isAdmin) {
      const snap = await dbInstance
        .collectionGroup('jobs')
        .where('status', 'in', ['expired', 'delisted'])
        .get();

      const batch = dbInstance.batch();
      snap.docs.forEach((d: any) => {
        scanned++;
        const data = d.data();
        const closingTime = getMillis(data.closingDate || data.firstDiscoveredAt);

        if (closingTime < cutoffTimestamp && (data.historicalMetadata?.rawHtml || data.historicalMetadata?.rawText || data.rawHtml || data.rawText)) {
          purged++;
          batch.update(d.ref, {
            'historicalMetadata.rawHtml': null,
            'historicalMetadata.rawText': null,
            'historicalMetadata.isPurgedForGDPR': true,
            'historicalMetadata.purgedAt': admin.firestore.Timestamp.now(),
            rawHtml: admin.firestore.FieldValue.delete(),
            rawText: admin.firestore.FieldValue.delete()
          });
        }
      });

      if (purged > 0) {
        await batch.commit();
      }
    } else {
      const { collectionGroup, getDocs, writeBatch: cBatch, deleteField, Timestamp, query, where } = await import('firebase/firestore');
      const q = query(
        collectionGroup(clientDb, 'jobs'),
        where('status', 'in', ['expired', 'delisted'])
      );
      const snap = await getDocs(q);
      const batch = cBatch(clientDb);

      snap.docs.forEach(d => {
        scanned++;
        const data = d.data();
        const closingTime = getMillis(data.closingDate || data.firstDiscoveredAt);

        if (closingTime < cutoffTimestamp && (data.historicalMetadata?.rawHtml || data.historicalMetadata?.rawText || data.rawHtml || data.rawText)) {
          purged++;
          batch.update(d.ref, {
            'historicalMetadata.rawHtml': null,
            'historicalMetadata.rawText': null,
            'historicalMetadata.isPurgedForGDPR': true,
            'historicalMetadata.purgedAt': Timestamp.now(),
            rawHtml: deleteField(),
            rawText: deleteField()
          });
        }
      });

      if (purged > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.error("GDPR retention purge failed:", err);
  }

  return { scanned, purged };
}

// =====================================================================
// ⏱️ SERVERLESS TIMEOUT BUDGET & CHUNKED CONTINUATION ENGINE
// =====================================================================

export const SERVERLESS_MAX_DURATION = 300; // 5 Minutes
export const EXECUTION_TIME_BUDGET_MS = 240 * 1000; // 240 Seconds (4 mins limit)
export const MAX_CHUNK_BATCH_SIZE = 5; // 5 Schools per worker chunk

export interface SweepExecutionCursor {
  lastProcessedSchoolId?: string;
  processedCount: number;
  totalTargets: number;
  startedAt: number;
  status: 'in_progress' | 'completed' | 'timeout_continued';
}

/**
 * Checks if current serverless execution is approaching the 240-second time budget
 */
export function isExecutionTimeBudgetExceeded(startTime: number, budgetMs: number = EXECUTION_TIME_BUDGET_MS): boolean {
  return (Date.now() - startTime) >= budgetMs;
}

/**
 * Saves sweep progress cursor in Firestore for continuation invocations
 */
export async function saveSweepContinuationCursor(cursorId: string, cursor: SweepExecutionCursor): Promise<void> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = Date.now();

  const payload = {
    ...cursor,
    updatedAt: now,
    expiresAt: now + (60 * 60 * 1000) // 1 Hour TTL
  };

  try {
    if (isAdmin) {
      await dbInstance.collection('sweep_cursors').doc(cursorId).set(payload, { merge: true });
    } else {
      const { doc: cDoc, setDoc: cSetDoc } = await import('firebase/firestore');
      const cursorRef = cDoc(clientDb, 'sweep_cursors', cursorId);
      await cSetDoc(cursorRef, payload, { merge: true });
    }
  } catch (err) {
    console.warn("Failed to persist sweep continuation cursor:", err);
  }
}

/**
 * Retrieves the existing progress cursor if continuing from a prior chunk
 */
export async function getSweepContinuationCursor(cursorId: string): Promise<SweepExecutionCursor | null> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  try {
    if (isAdmin) {
      const docSnap = await dbInstance.collection('sweep_cursors').doc(cursorId).get();
      if (!docSnap.exists) return null;
      return docSnap.data() as SweepExecutionCursor;
    } else {
      const { doc: cDoc, getDoc: cGetDoc } = await import('firebase/firestore');
      const cursorRef = cDoc(clientDb, 'sweep_cursors', cursorId);
      const docSnap = await cGetDoc(cursorRef);
      if (!docSnap.exists()) return null;
      return docSnap.data() as SweepExecutionCursor;
    }
  } catch (err) {
    console.warn("Failed to retrieve sweep continuation cursor:", err);
    return null;
  }
}

// =====================================================================
// 🔁 EXPONENTIAL BACKOFF RETRY & DEAD LETTER QUEUE (DLQ) PARTITIONING
// =====================================================================

export interface DeadLetterTaskEntry {
  schoolId: string;
  schoolName?: string;
  url?: string;
  httpStatus?: number;
  failureReason: string;
  attemptCount: number;
  timestamp?: any;
}

/**
 * Executes an async scraper action with up to 3 exponential backoff retries (2^attempt * 1000ms)
 */
export async function executeWithExponentialBackoff<T>(
  action: (attempt: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    schoolId?: string;
    schoolName?: string;
    url?: string;
    actionName?: string;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, schoolId = "", schoolName = "", url = "", actionName = "scrape" } = options;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action(attempt);
    } catch (err: any) {
      lastError = err;
      const delayMs = Math.pow(2, attempt) * 1000;
      console.warn(`⚠️ [RETRY ${attempt}/${maxAttempts}] ${actionName} failed for ${schoolName || schoolId || url}: ${err?.message || err}. Retrying in ${delayMs}ms...`);
      
      if (attempt < maxAttempts) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  // If all attempts failed, record to Dead Letter Queue (DLQ)
  await recordDeadLetterTask({
    schoolId,
    schoolName,
    url,
    failureReason: lastError?.message || String(lastError),
    httpStatus: lastError?.status || lastError?.statusCode || 500,
    attemptCount: maxAttempts
  });

  throw lastError;
}

/**
 * Writes an unrecoverable failure record to the `failed_sweep_tasks` DLQ collection
 */
export async function recordDeadLetterTask(entry: DeadLetterTaskEntry): Promise<void> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  const now = isAdmin ? admin.firestore.Timestamp.now() : (await import('firebase/firestore')).Timestamp.now();

  const payload = {
    schoolId: entry.schoolId || "",
    schoolName: entry.schoolName || "",
    url: entry.url || "",
    httpStatus: entry.httpStatus || 500,
    failureReason: entry.failureReason || "Max retries exceeded",
    attemptCount: entry.attemptCount || 3,
    timestamp: entry.timestamp || now,
    createdAt: now,
    status: 'pending_review'
  };

  try {
    if (isAdmin) {
      await dbInstance.collection('failed_sweep_tasks').add(payload);
    } else {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(clientDb, 'failed_sweep_tasks'), payload);
    }
    console.log(`📥 [DLQ] Recorded failed scrape task for ${entry.schoolName || entry.schoolId} to failed_sweep_tasks collection.`);
  } catch (err) {
    console.error("Failed to record Dead Letter Task to failed_sweep_tasks:", err);
  }
}

// =====================================================================
// 🏷️ VACANCY FRESHNESS & DIRECT APPLICATION HELPERS
// =====================================================================

export interface FreshnessBadgesResult {
  isVerifiedLiveToday: boolean;
  isRollingDeadline: boolean;
  isClosingSoon: boolean;
  badges: Array<{
    text: string;
    type: 'verified' | 'rolling' | 'closing_soon';
    color: string;
  }>;
}

/**
 * Computes live freshness indicators for public job cards:
 * - "Verified Live Today" (lastVerifiedAt <= 24 hours)
 * - "Rolling Deadline" (isRolling is true)
 * - "Closing Soon" (closingDate within 3 days)
 */
export function getVacancyFreshnessBadges(job: any): FreshnessBadgesResult {
  const now = Date.now();
  const badges: Array<{ text: string; type: 'verified' | 'rolling' | 'closing_soon'; color: string }> = [];

  // 1. "Verified Live Today" (within 24 hours)
  let isVerifiedLiveToday = false;
  const verifiedRaw = job?.lastVerifiedAt || job?.lastVerifiedAtRaw || job?.scrapedAt || job?.scrapedAtRaw;
  if (verifiedRaw) {
    const verifiedMillis = getMillis(verifiedRaw);
    if ((now - verifiedMillis) <= 24 * 60 * 60 * 1000) {
      isVerifiedLiveToday = true;
      badges.push({
        text: 'Verified Live Today',
        type: 'verified',
        color: 'emerald'
      });
    }
  }

  // 2. "Closing Soon" (closingDate <= 3 days and in the future)
  let isClosingSoon = false;
  const closingRaw = job?.closingDate || job?.closesDateRaw;
  if (closingRaw) {
    const closingMillis = getMillis(closingRaw);
    const diff = closingMillis - now;
    if (diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000) {
      isClosingSoon = true;
      badges.push({
        text: 'Closing Soon',
        type: 'closing_soon',
        color: 'orange'
      });
    }
  }

  // 3. "Rolling Deadline" (isRolling is true or no explicit closing date)
  const isRollingDeadline = Boolean(job?.isRolling ?? job?.isRollingDeadline ?? (!closingRaw && !isClosingSoon));
  if (isRollingDeadline) {
    badges.push({
      text: 'Rolling Deadline',
      type: 'rolling',
      color: 'blue'
    });
  }

  return {
    isVerifiedLiveToday,
    isRollingDeadline,
    isClosingSoon,
    badges
  };
}

/**
 * Resolves verified direct application destination URL
 */
export function getDirectApplicationUrl(job: any, fallbackSchoolWebsite?: string): string {
  const candidates = [
    job?.applyUrl,
    job?.directUrl,
    job?.source_url,
    job?.sourceUrl,
    job?.url,
    fallbackSchoolWebsite
  ];

  for (const url of candidates) {
    if (url && typeof url === 'string' && /^https?:\/\//i.test(url.trim()) && !url.includes('undefined') && !url.includes('null')) {
      return url.trim();
    }
  }

  return 'https://leopardfishintel.com/featured-jobs';
}

// =====================================================================
// 📊 SCHOOL VACANCY ANALYTICS & RECRUITMENT TIMELINE AGGREGATOR
// =====================================================================

export interface SchoolVacancyAnalytics {
  schoolId: string;
  totalVacanciesPosted: number;
  activeVacanciesCount: number;
  expiredVacanciesCount: number;
  delistedVacanciesCount: number;
  averageLifespanDays: number;
  subjectBreakdown: Record<string, { count: number; percentage: number }>;
  peakHiringMonths: Array<{ month: string; count: number; percentage: number }>;
  curriculumBreakdown: Record<string, { count: number; percentage: number }>;
  compensationAverages: {
    salaryMinAvg: number;
    salaryMaxAvg: number;
    currency: string;
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Aggregates historical vacancy metrics across all past and active postings for a school:
 * - Total Vacancies Posted (volume)
 * - Average Posting Lifespan in days
 * - Subject Breakdown percentage distribution
 * - Peak Hiring Window (highest creation volume months)
 */
export async function getSchoolVacancyAnalytics(schoolId: string): Promise<SchoolVacancyAnalytics> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();

  let jobs: any[] = [];

  try {
    if (isAdmin) {
      const snap = await dbInstance
        .collection('schools')
        .doc(schoolId)
        .collection('jobs')
        .get();

      jobs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } else {
      const { collection, getDocs, doc } = await import('firebase/firestore');
      const jobsRef = collection(doc(clientDb, 'schools', schoolId), 'jobs');
      const snap = await getDocs(jobsRef);
      jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.error("Failed to query historical school vacancies for analytics:", err);
  }

  const total = jobs.length;
  if (total === 0) {
    return {
      schoolId,
      totalVacanciesPosted: 0,
      activeVacanciesCount: 0,
      expiredVacanciesCount: 0,
      delistedVacanciesCount: 0,
      averageLifespanDays: 0,
      subjectBreakdown: {},
      peakHiringMonths: [],
      curriculumBreakdown: {},
      compensationAverages: { salaryMinAvg: 0, salaryMaxAvg: 0, currency: 'USD' }
    };
  }

  let activeCount = 0;
  let expiredCount = 0;
  let delistedCount = 0;
  let totalLifespanDays = 0;

  const subjectCounts: Record<string, number> = {};
  const curriculumCounts: Record<string, number> = {};
  const monthCounts: Record<number, number> = {};

  let salaryMinSum = 0;
  let salaryMinCount = 0;
  let salaryMaxSum = 0;
  let salaryMaxCount = 0;
  let primaryCurrency = 'USD';

  for (const job of jobs) {
    // 1. Status Breakdown
    const status = job.status || 'pending_review';
    if (status === 'approved') activeCount++;
    else if (status === 'expired') expiredCount++;
    else if (status === 'delisted') delistedCount++;

    // 2. Lifespan Days Calculation
    let days = job.durationDays;
    if (typeof days !== 'number' || days <= 0) {
      const start = getMillis(job.firstDiscoveredAt || job.scrapedAt);
      const end = getMillis(job.closingDate || job.historicalMetadata?.archivedAt || job.lastVerifiedAt);
      days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    }
    totalLifespanDays += days;

    // 3. Subject Classification
    let sub = job.subject || "General";
    if (sub.toLowerCase().includes("math")) sub = "Mathematics";
    else if (sub.toLowerCase().includes("sci") || sub.toLowerCase().includes("physic") || sub.toLowerCase().includes("chem") || sub.toLowerCase().includes("bio")) sub = "Sciences";
    else if (sub.toLowerCase().includes("eng") || sub.toLowerCase().includes("lit")) sub = "English & Humanities";
    else if (sub.toLowerCase().includes("prim") || sub.toLowerCase().includes("early")) sub = "Primary / EYFS";
    else if (sub.toLowerCase().includes("lead") || sub.toLowerCase().includes("head") || sub.toLowerCase().includes("dir")) sub = "Leadership";
    else if (sub.toLowerCase().includes("comp") || sub.toLowerCase().includes("ict")) sub = "Computing / Tech";
    else if (sub.toLowerCase().includes("art") || sub.toLowerCase().includes("music") || sub.toLowerCase().includes("drama")) sub = "Creative Arts";

    subjectCounts[sub] = (subjectCounts[sub] || 0) + 1;

    // 4. Curriculum Classification
    const cur = job.curriculum || "International";
    curriculumCounts[cur] = (curriculumCounts[cur] || 0) + 1;

    // 5. Hiring Month Window
    const creationTime = getMillis(job.firstDiscoveredAt || job.scrapedAt);
    const creationMonth = new Date(creationTime).getMonth(); // 0 - 11
    monthCounts[creationMonth] = (monthCounts[creationMonth] || 0) + 1;

    // 6. Compensation
    if (job.salaryMin) {
      salaryMinSum += job.salaryMin;
      salaryMinCount++;
    }
    if (job.salaryMax) {
      salaryMaxSum += job.salaryMax;
      salaryMaxCount++;
    }
    if (job.currency) {
      primaryCurrency = job.currency;
    }
  }

  // Format Subject Breakdown
  const subjectBreakdown: Record<string, { count: number; percentage: number }> = {};
  for (const [s, count] of Object.entries(subjectCounts)) {
    subjectBreakdown[s] = {
      count,
      percentage: Math.round((count / total) * 100)
    };
  }

  // Format Curriculum Breakdown
  const curriculumBreakdown: Record<string, { count: number; percentage: number }> = {};
  for (const [c, count] of Object.entries(curriculumCounts)) {
    curriculumBreakdown[c] = {
      count,
      percentage: Math.round((count / total) * 100)
    };
  }

  // Format Peak Hiring Months (sorted descending)
  const peakHiringMonths = Object.entries(monthCounts)
    .map(([mIndex, count]) => ({
      month: MONTH_NAMES[Number(mIndex)],
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  return {
    schoolId,
    totalVacanciesPosted: total,
    activeVacanciesCount: activeCount,
    expiredVacanciesCount: expiredCount,
    delistedVacanciesCount: delistedCount,
    averageLifespanDays: Math.round(totalLifespanDays / total),
    subjectBreakdown,
    peakHiringMonths,
    curriculumBreakdown,
    compensationAverages: {
      salaryMinAvg: salaryMinCount > 0 ? Math.round(salaryMinSum / salaryMinCount) : 0,
      salaryMaxAvg: salaryMaxCount > 0 ? Math.round(salaryMaxSum / salaryMaxCount) : 0,
      currency: primaryCurrency
    }
  };
}

// =====================================================================
// 🧹 ONE-TIME ADMIN CLEANUP: PURGE BLOG / NEWS / PAST-YEAR SCHROLE JOBS
// =====================================================================

/**
 * Searches for all currently 'approved' vacancies and marks any pointing to
 * news/blog articles or referencing past years (2024/2025) as 'delisted'.
 */
export async function purgeInvalidHistoricalJobs(): Promise<{ scanned: number; delisted: number; delistedTitles: string[] }> {
  const dbInstance = getAdminDb();
  const isAdmin = useAdmin();
  let scanned = 0;
  let delisted = 0;
  const delistedTitles: string[] = [];

  try {
    if (isAdmin) {
      const snap = await dbInstance.collectionGroup('jobs').where('status', '==', 'approved').get();
      const batch = dbInstance.batch();

      snap.docs.forEach((d: any) => {
        scanned++;
        const data = d.data();
        const url = (data.applyUrl || data.directUrl || data.source_url || "").toLowerCase();
        const title = (data.title || "").toLowerCase();
        const combined = `${title} ${url}`;

        const isBlogNews = isExcludedNewsOrBlogUrl(url) || 
                           url.includes('schrole.com/news') || 
                           url.includes('/blog') || 
                           url.includes('/articles') || 
                           url.includes('/press') || 
                           url.includes('/archives');

        const isPastYear = combined.includes('2024') || 
                           combined.includes('2025') || 
                           combined.includes('2023') ||
                           isHistoricalExpiredJob({ title: data.title, url }).isHistoricalExpired;

        if (isBlogNews || isPastYear) {
          delisted++;
          delistedTitles.push(`${data.title} (${data.city || ''}) -> ${isBlogNews ? 'blog/news' : 'past_year'}`);
          batch.set(d.ref, {
            status: 'delisted',
            delistReason: 'invalid_news_url_purge',
            delistedAt: admin.firestore.Timestamp.now(),
            lastVerifiedAt: admin.firestore.Timestamp.now()
          }, { merge: true });
        }
      });

      if (delisted > 0) {
        await batch.commit();
      }
    } else {
      const schools = await getCollectionDocs('schools');
      for (const school of schools) {
        const jobsSnap = await getDocs(collection(clientDb, 'schools', school.id, 'jobs'));
        if (jobsSnap.empty) continue;
        const batch = writeBatch(clientDb);
        let schoolDelisted = 0;

        jobsSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.status !== 'approved') return;
          scanned++;

          const url = (data.applyUrl || data.directUrl || data.source_url || "").toLowerCase();
          const title = (data.title || "").toLowerCase();
          const combined = `${title} ${url}`;

          const isBlogNews = isExcludedNewsOrBlogUrl(url) || 
                             url.includes('schrole.com/news') || 
                             url.includes('/blog') || 
                             url.includes('/articles') || 
                             url.includes('/press') || 
                             url.includes('/archives');

          const isPastYear = combined.includes('2024') || 
                             combined.includes('2025') || 
                             combined.includes('2023') ||
                             isHistoricalExpiredJob({ title: data.title, url }).isHistoricalExpired;

          if (isBlogNews || isPastYear) {
            delisted++;
            schoolDelisted++;
            delistedTitles.push(`${data.title} (${data.city || ''}) -> ${isBlogNews ? 'blog/news' : 'past_year'}`);
            batch.set(d.ref, {
              status: 'delisted',
              delistReason: 'invalid_news_url_purge',
              delistedAt: new Date(),
              lastVerifiedAt: new Date()
            }, { merge: true });
          }
        });

        if (schoolDelisted > 0) {
          await batch.commit();
        }
      }
    }
    console.log(`🧹 [PURGE COMPLETE] Scanned ${scanned} approved jobs, delisted ${delisted} invalid/news/past-year items.`);
  } catch (err) {
    console.error("Purge invalid historical jobs failed:", err);
  }

  return { scanned, delisted, delistedTitles };
}

