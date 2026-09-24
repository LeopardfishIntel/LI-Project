import fs from 'fs';
import path from 'path';
import { MARITAL_ADVISORIES, getCoupleAdvisory } from '../lib/marital-advisories';
import { mockCostOfLivingData } from '../lib/mock-col-data';
import { NEW_LOCATIONS_COST_OF_LIVING } from '../lib/data/new-destinations-data';

function runGapAnalysis() {
  const filePath = path.resolve(process.cwd(), 'complete_school_fields_export.json');
  if (!fs.existsSync(filePath)) {
    console.error("Export JSON not found:", filePath);
    return;
  }

  const schools: any[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`\n================================================================`);
  console.log(`🔍 LEOPARDFISH INTEL — COMPREHENSIVE DATABASE GAP REPORT`);
  console.log(`📊 Total Registered Schools: ${schools.length}`);
  console.log(`================================================================\n`);

  // 1. GEOGRAPHY
  const allCountries = new Map<string, number>();
  const allCities = new Map<string, number>();
  schools.forEach(s => {
    const c = (s.country || '').trim();
    const city = (s.city || '').trim();
    if (c) allCountries.set(c, (allCountries.get(c) || 0) + 1);
    if (city) allCities.set(city, (allCities.get(city) || 0) + 1);
  });

  console.log(`📍 Geographical Coverage: ${allCountries.size} Countries, ${allCities.size} Unique Cities`);

  // 2. FIELD COMPLETENESS STATS
  const stats: Record<string, { present: number; missing: number; pct: string }> = {};
  const CRITICAL_FIELDS = [
    'name',
    'country',
    'city',
    'salaryRange',
    'housingprovision',
    'housing_status',
    'savingspotential',
    'package_descriptor',
    'curriculum',
    'website',
    'careersUrl',
    'atsProvider',
    'revalidationStatus',
    'lastScrapedAt'
  ];

  CRITICAL_FIELDS.forEach(f => {
    let present = 0;
    schools.forEach(s => {
      const v = s[f];
      if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'n/a') {
        present++;
      }
    });
    const missing = schools.length - present;
    const pct = ((present / schools.length) * 100).toFixed(1) + '%';
    stats[f] = { present, missing, pct };
  });

  console.log(`\n--- 1. CORE DATA FIELD AUDIT ---`);
  console.table(stats);

  // 3. ATS & CAREER PORTAL GAPS
  const missingCareers: any[] = [];
  const missingAts: any[] = [];
  const activeScraped: any[] = [];

  schools.forEach(s => {
    if (!s.careersUrl || String(s.careersUrl).trim() === '') {
      missingCareers.push({ id: s.id, name: s.name, country: s.country });
    }
    if (!s.atsProvider || String(s.atsProvider).trim() === '') {
      missingAts.push({ id: s.id, name: s.name, country: s.country });
    }
    if (s.lastScrapedAt) {
      activeScraped.push(s);
    }
  });

  console.log(`\n--- 2. CAREER PORTAL & SCRAPER GAPS ---`);
  console.log(`• Schools with Valid Careers URL: ${schools.length - missingCareers.length} / ${schools.length} (${(((schools.length - missingCareers.length) / schools.length) * 100).toFixed(1)}%)`);
  console.log(`• Schools Missing Careers URL: ${missingCareers.length} (${((missingCareers.length / schools.length) * 100).toFixed(1)}%)`);
  console.log(`• Schools without Explicit ATS Provider Tag: ${missingAts.length} (${((missingAts.length / schools.length) * 100).toFixed(1)}%)`);
  console.log(`• Schools with Automated Scrape Telemetry: ${activeScraped.length}`);

  // 4. MARITAL ADVISORY COVERAGE
  const advisoryKeys = Object.keys(MARITAL_ADVISORIES);
  const countriesMissingAdvisories: string[] = [];
  const schoolsMissingAdvisories: { id: string; name: string; country: string }[] = [];

  Array.from(allCountries.keys()).forEach(country => {
    const adv = getCoupleAdvisory(country);
    if (adv.country.toLowerCase() === 'global / unlisted destination') {
      countriesMissingAdvisories.push(country);
    }
  });

  schools.forEach(s => {
    if (s.country) {
      const adv = getCoupleAdvisory(s.country);
      if (adv.country.toLowerCase() === 'global / unlisted destination') {
        schoolsMissingAdvisories.push({ id: s.id, name: s.name || s.schoolname, country: s.country });
      }
    }
  });

  console.log(`\n--- 3. MARITAL & LEGAL ADVISORY GAPS ---`);
  console.log(`• Total Destination Profiles Covered in Advisory Matrix: ${advisoryKeys.length} Countries`);
  console.log(`• School Countries using Fallback Advisory: ${countriesMissingAdvisories.length}`);
  if (countriesMissingAdvisories.length > 0) {
    console.log(`  Missing: ${countriesMissingAdvisories.sort().join(', ')}`);
  } else {
    console.log(`  ✅ 100% of all registered school countries have dedicated marital & visa legal guidance!`);
  }

  // 5. COST OF LIVING (COL) GAPS
  const colCities = new Set<string>();
  mockCostOfLivingData.forEach(c => {
    if (c.locationName) colCities.add(c.locationName.trim().toLowerCase());
  });
  const colCountries = new Set<string>(Object.keys(NEW_LOCATIONS_COST_OF_LIVING));

  const schoolsWithoutDirectColCity: any[] = [];
  const schoolsWithoutCountryCol: any[] = [];

  schools.forEach(s => {
    const city = (s.city || '').trim().toLowerCase();
    const country = (s.country || '').trim().toLowerCase();

    let cityMatch = false;
    colCities.forEach(c => {
      if (city && (city.includes(c) || c.includes(city))) cityMatch = true;
    });
    if (!cityMatch) {
      schoolsWithoutDirectColCity.push(s);
    }

    let countryMatch = false;
    colCountries.forEach(c => {
      if (country && (country.includes(c) || c.includes(country))) countryMatch = true;
    });
    // Check if in mockCostOfLivingData countries
    mockCostOfLivingData.forEach(m => {
      if (m.countryName && country && (country.includes(m.countryName.toLowerCase()) || m.countryName.toLowerCase().includes(country))) {
        countryMatch = true;
      }
    });

    if (!countryMatch) {
      schoolsWithoutCountryCol.push(s);
    }
  });

  console.log(`\n--- 4. COST OF LIVING (COL) GAPS ---`);
  console.log(`• Schools with Direct Match City COL Index: ${schools.length - schoolsWithoutDirectColCity.length} / ${schools.length} (${(((schools.length - schoolsWithoutDirectColCity.length) / schools.length) * 100).toFixed(1)}%)`);
  console.log(`• Schools falling back to Country/Regional Benchmark COL: ${schoolsWithoutDirectColCity.length} (${((schoolsWithoutDirectColCity.length / schools.length) * 100).toFixed(1)}%)`);
  
  // Top cities that would benefit from dedicated COL indexes
  const missingCityFreq = new Map<string, number>();
  schoolsWithoutDirectColCity.forEach(s => {
    const key = `${s.city}, ${s.country}`;
    missingCityFreq.set(key, (missingCityFreq.get(key) || 0) + 1);
  });

  const topMissingCities = Array.from(missingCityFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`\nTop 10 Cities with high school density needing dedicated COL indexes:`);
  topMissingCities.forEach(([city, count]) => {
    console.log(`  • ${city}: ${count} schools`);
  });

  console.log(`\n================================================================\n`);
}

runGapAnalysis();
