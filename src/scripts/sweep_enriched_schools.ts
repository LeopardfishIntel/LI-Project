import fs from 'fs';
import path from 'path';
import { searchVacancies } from '../ai/flows/search-vacancies-flow';
import { getAdminDb } from '../firebase/admin';

async function main() {
  console.log(`================================================================`);
  console.log(`🚀 TARGETED VACANCY SWEEP: NEWLY ENRICHED SCHOOLS (FLIS0330–FLIS0451)`);
  console.log(`================================================================\n`);

  const filePath = path.resolve(process.cwd(), 'complete_school_fields_export.json');
  const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Target schools: FLIS0330 through FLIS0451
  const targets = data.filter(s => s.id >= 'FLIS0330' && s.id <= 'FLIS0451');
  console.log(`🎯 Identified ${targets.length} target institutions for this sweep.\n`);

  const startTime = Date.now();
  let totalJobsFound = 0;
  let successfulSchools = 0;
  let failedSchools = 0;
  const results: Array<{ id: string; name: string; city: string; country: string; jobsCount: number; status: string; error?: string }> = [];

  for (let i = 0; i < targets.length; i++) {
    const s = targets[i];
    const prefix = `[${i + 1}/${targets.length}] [${s.id}] ${s.name || s.schoolname}`;
    console.log(`\n▶️ ${prefix} (${s.city}, ${s.country})...`);

    try {
      const res = await searchVacancies({
        schoolName: s.name || s.schoolname,
        city: s.city,
        country: s.country,
      });

      const jobsCount = res.scrapedJobsCount || 0;
      totalJobsFound += jobsCount;
      successfulSchools++;

      results.push({
        id: s.id,
        name: s.name || s.schoolname,
        city: s.city,
        country: s.country,
        jobsCount,
        status: 'SUCCESS'
      });

      console.log(`   ✅ Complete. Discovered ${jobsCount} verified active vacancies.`);
    } catch (err: any) {
      failedSchools++;
      console.error(`   ❌ Failed to sweep ${s.id}:`, err?.message || err);
      results.push({
        id: s.id,
        name: s.name || s.schoolname,
        city: s.city,
        country: s.country,
        jobsCount: 0,
        status: 'FAILED',
        error: err?.message || String(err)
      });
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n================================================================`);
  console.log(`✨ TARGETED SWEEP COMPLETED in ${durationSec}s`);
  console.log(`📊 Summary:`);
  console.log(`   • Total Schools Swept: ${targets.length}`);
  console.log(`   • Successful: ${successfulSchools}`);
  console.log(`   • Failed: ${failedSchools}`);
  console.log(`   • Total Live Vacancies Discovered/Committed: ${totalJobsFound}`);
  console.log(`================================================================\n`);

  // Top schools with open vacancies
  const schoolsWithJobs = results.filter(r => r.jobsCount > 0);
  if (schoolsWithJobs.length > 0) {
    console.log(`🏆 Institutions with Active Open Vacancies:`);
    schoolsWithJobs.sort((a, b) => b.jobsCount - a.jobsCount);
    schoolsWithJobs.forEach(s => {
      console.log(`   • [${s.id}] ${s.name} (${s.city}, ${s.country}): ${s.jobsCount} open jobs`);
    });
  }
}

main().catch(err => {
  console.error("Fatal error during targeted sweep:", err);
  process.exit(1);
});
