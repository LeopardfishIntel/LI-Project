/**
 * 🌙 FULL OVERNIGHT GUARDIAN JOBS COMPREHENSIVE BATCH CRAWLER
 *
 * Exhaustively crawls:
 * 1. All paginated international education directories on jobs.theguardian.com
 * 2. All 254 FLIS international schools in 10 paced batches
 * 3. Matches and ingests accredited pedagogical roles into featured_jobs_cache
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';
import { matchSchoolEntity } from '../src/lib/crawler/entityMatcher';

interface GuardianScrapedJob {
  title: string;
  applyUrl: string;
  recruiter: string;
  location: string;
  salary: string;
  desc: string;
}

const BATCH_SIZE = 25;

async function scrapePageListings(page: Page): Promise<GuardianScrapedJob[]> {
  return await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li.lister__item, div.lister__item, article.lister__item'));
    return items.map(el => {
      const titleLink = el.querySelector('h3 a, a.lister__header') as HTMLAnchorElement;
      const recruiter = (el.querySelector('.lister__meta-item--recruiter, .lister__meta-item') as HTMLElement)?.innerText?.trim() || '';
      const location = (el.querySelector('.lister__meta-item--location') as HTMLElement)?.innerText?.trim() || '';
      const salary = (el.querySelector('.lister__meta-item--salary') as HTMLElement)?.innerText?.trim() || '';
      const desc = (el.querySelector('.lister__description') as HTMLElement)?.innerText?.trim() || '';
      return {
        title: titleLink?.innerText?.trim() || '',
        applyUrl: titleLink?.href || '',
        recruiter,
        location,
        salary,
        desc
      };
    }).filter(j => j.title && j.applyUrl);
  });
}

async function scrapePaginatedUrl(browser: Browser, baseUrl: string, maxPages = 15): Promise<GuardianScrapedJob[]> {
  const page = await browser.newPage();
  const allJobs: GuardianScrapedJob[] = [];
  const seenUrls = new Set<string>();

  for (let p = 1; p <= maxPages; p++) {
    const url = baseUrl.includes('?') ? `${baseUrl}&page=${p}` : `${baseUrl}?page=${p}`;
    console.log(`   [PAGE ${p}] Fetching: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const jobs = await scrapePageListings(page);
      if (jobs.length === 0) {
        console.log(`   [PAGE ${p}] 0 listings found. Reached end of pagination.`);
        break;
      }

      let newCount = 0;
      for (const j of jobs) {
        if (!seenUrls.has(j.applyUrl)) {
          seenUrls.add(j.applyUrl);
          allJobs.push(j);
          newCount++;
        }
      }
      console.log(`   [PAGE ${p}] Extracted ${jobs.length} items (${newCount} new unique).`);

      const hasNext = await page.evaluate(() => {
        return !!document.querySelector('.paginator__item--next, a[rel="next"]');
      });
      if (!hasNext) {
        console.log(`   [PAGE ${p}] No Next Page button found.`);
        break;
      }
      await new Promise(r => setTimeout(r, 600));
    } catch (err: any) {
      console.warn(`   ⚠️ Warning on page ${p}: ${err.message}`);
      break;
    }
  }

  await page.close();
  return allJobs;
}

async function runOvernightGuardianSweep() {
  const startTime = Date.now();
  console.log('==================================================================');
  console.log('🌙 STARTING FULL OVERNIGHT GUARDIAN JOBS COMPREHENSIVE SWEEP');
  console.log('==================================================================');

  const exportPath = path.resolve(process.cwd(), 'complete_school_fields_export.json');
  const schools = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  console.log(`Loaded ${schools.length} FLIS school records.`);

  const browser = await chromium.launch({ headless: true });
  const collectedJobs: GuardianScrapedJob[] = [];
  const seenApplyUrls = new Set<string>();

  // PHASE 1: DEEP PAGINATED GLOBAL CATEGORIES
  console.log('\n--- PHASE 1: Crawling Global Paginated Guardian Hubs ---');
  const globalHubs = [
    { name: 'International Schools (Broad)', url: 'https://jobs.theguardian.com/searchjobs/?Keywords=international+school', maxPages: 15 },
    { name: 'Education & Schools (International)', url: 'https://jobs.theguardian.com/jobs/education-schools/international/', maxPages: 10 },
    { name: 'British International Schools', url: 'https://jobs.theguardian.com/searchjobs/?Keywords=british+international+school', maxPages: 10 },
    { name: 'Teaching Abroad', url: 'https://jobs.theguardian.com/searchjobs/?Keywords=teaching+abroad', maxPages: 8 },
    { name: 'IB World Schools', url: 'https://jobs.theguardian.com/searchjobs/?Keywords=ib+world+school', maxPages: 6 }
  ];

  for (const hub of globalHubs) {
    console.log(`\n🔎 [HUB] Scanning ${hub.name}...`);
    const hubJobs = await scrapePaginatedUrl(browser, hub.url, hub.maxPages);
    for (const j of hubJobs) {
      if (!seenApplyUrls.has(j.applyUrl)) {
        seenApplyUrls.add(j.applyUrl);
        collectedJobs.push(j);
      }
    }
  }
  console.log(`\n✅ Phase 1 complete: ${collectedJobs.length} unique raw Guardian job postings collected.`);

  // PHASE 2: MATCHING GLOBAL POSTINGS AGAINST 254 FLIS SCHOOLS
  console.log('\n--- PHASE 2: Matching Collected Hub Postings against FLIS Registry ---');
  const matchedBySchool: Record<string, GuardianScrapedJob[]> = {};
  let hubMatchCount = 0;

  for (const job of collectedJobs) {
    for (const s of schools) {
      const match = matchSchoolEntity(s, {
        candidateText: `${job.recruiter} ${job.location} ${job.title} ${job.desc}`,
        sourceUrl: job.applyUrl,
        city: job.location
      });

      if (match.isMatch) {
        if (!matchedBySchool[s.id]) matchedBySchool[s.id] = [];
        matchedBySchool[s.id].push(job);
        hubMatchCount++;
        console.log(`🎯 Matched [${s.id}] ${s.name} -> ${job.title} (${job.applyUrl})`);
        break;
      }
    }
  }
  console.log(`Matched ${hubMatchCount} postings from global hub crawl.`);

  // PHASE 3: 254 FLIS SCHOOL TARGETED QUERY BATCHES
  console.log('\n--- PHASE 3: Sweeping 254 FLIS Schools in 10 Targeted Batches ---');
  const targetedPage = await browser.newPage();
  const totalBatches = Math.ceil(schools.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batchSchools = schools.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    console.log(`\n📦 [BATCH ${b + 1}/${totalBatches}] Processing schools ${b * BATCH_SIZE + 1} to ${Math.min((b + 1) * BATCH_SIZE, schools.length)}...`);

    for (const s of batchSchools) {
      const cleanName = (s.name || s.schoolname || '').replace(/International School|School|College|Academy/gi, '').trim();
      const query = cleanName.length > 3 ? cleanName : (s.name || s.schoolname);
      if (!query || query.length < 3) continue;

      const searchUrl = `https://jobs.theguardian.com/searchjobs/?Keywords=${encodeURIComponent(query)}`;
      try {
        await targetedPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const jobs = await scrapePageListings(targetedPage);
        const filteredJobs = jobs.filter(j => {
          const fullText = `${j.title} ${j.recruiter} ${j.location} ${j.desc}`.toLowerCase();
          const nameMatch = fullText.includes((s.name || '').toLowerCase()) || (cleanName.length > 4 && fullText.includes(cleanName.toLowerCase()));
          const locMatch = !s.city || fullText.includes((s.city || '').toLowerCase()) || fullText.includes((s.country || '').toLowerCase());
          return nameMatch && locMatch;
        });

        if (filteredJobs.length > 0) {
          if (!matchedBySchool[s.id]) matchedBySchool[s.id] = [];
          for (const fj of filteredJobs) {
            if (!matchedBySchool[s.id].some(existing => existing.applyUrl === fj.applyUrl)) {
              matchedBySchool[s.id].push(fj);
              console.log(`   🎯 [BATCH MATCH] [${s.id}] ${s.name} -> ${fj.title}`);
            }
          }
        }
      } catch (err: any) {
        // Continue to next school on timeout
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  await targetedPage.close();
  await browser.close();

  // PHASE 4: INGESTION PIPELINE & PERSISTENCE
  console.log('\n--- PHASE 4: Running Multi-Engine Pipeline Ingestion ---');
  let totalAccepted = 0;
  let totalRejected = 0;
  const ingestionSummary: Array<{ id: string; name: string; accepted: number; rejected: number }> = [];

  for (const [schoolId, jobs] of Object.entries(matchedBySchool)) {
    const s = schools.find((x: any) => x.id === schoolId);
    const rawRecords = jobs.map(j => ({
      rawTitle: j.title,
      source: 'GUARDIAN',
      applyUrl: j.applyUrl,
      city: s?.city || '',
      country: s?.country || '',
      schoolId,
      schoolName: s?.name || schoolId,
      datePosted: new Date().toISOString().split('T')[0],
      closingDate: null,
      status: 'approved' as const
    }));

    const result = await runIngestionPipeline(schoolId, rawRecords);
    totalAccepted += result.accepted;
    totalRejected += result.rejected;
    ingestionSummary.push({
      id: schoolId,
      name: s?.name || schoolId,
      accepted: result.accepted,
      rejected: result.rejected
    });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n==================================================================');
  console.log('🎉 OVERNIGHT GUARDIAN JOBS SWEEP COMPLETE');
  console.log('==================================================================');
  console.log(`Total Duration: ${durationSec}s`);
  console.log(`Total Schools Evaluated: ${schools.length}`);
  console.log(`Schools with Live Guardian Vacancies: ${ingestionSummary.length}`);
  console.log(`Total Verified Teaching Roles Ingested: ${totalAccepted}`);
  console.log(`Non-Academic / Stale Dropped: ${totalRejected}`);
  console.log('------------------------------------------------------------------');
  ingestionSummary.forEach(row => {
    console.log(` • [${row.id}] ${row.name}: ${row.accepted} accepted (${row.rejected} rejected)`);
  });
  console.log('==================================================================\n');
}

runOvernightGuardianSweep().catch(console.error);
