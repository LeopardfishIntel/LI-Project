import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');
const artifactPath = '/Users/roger.keen/.gemini/antigravity-ide/brain/63ac4345-83e5-4993-a7b2-abf84d292e0d/canonical_school_benchmarks_462.json';

const mergePairs = [
  { keepId: 'FLIS0264', dropId: 'FLIS0428', name: 'Haileybury Almaty' },
  { keepId: 'FLIS0290', dropId: 'FLIS0429', name: 'Haileybury Astana' },
  { keepId: 'FLIS0267', dropId: 'FLIS0449', name: 'Greengates School' }
];

async function mergeDuplicateSchools() {
  console.log('🔄 Merging duplicate school records...');

  const raw = fs.readFileSync(exportPath1, 'utf-8');
  const schools: any[] = JSON.parse(raw);

  const schoolMap = new Map<string, any>(schools.map(s => [s.id, s]));

  for (const pair of mergePairs) {
    const primary = schoolMap.get(pair.keepId);
    const secondary = schoolMap.get(pair.dropId);

    if (primary && secondary) {
      console.log(`Merging ${pair.dropId} -> ${pair.keepId} (${pair.name})`);

      // Combine aliases and metadata
      const aliases = new Set<string>([...(primary.aliases || []), ...(secondary.aliases || []), secondary.name, pair.dropId]);
      aliases.delete(primary.name);
      primary.aliases = Array.from(aliases);

      if (!primary.tesEmployerSlug && secondary.tesEmployerSlug) primary.tesEmployerSlug = secondary.tesEmployerSlug;
      if (!primary.tesOrganizationId && secondary.tesOrganizationId) primary.tesOrganizationId = secondary.tesOrganizationId;
      if (!primary.careersPageUrl && secondary.careersPageUrl) primary.careersPageUrl = secondary.careersPageUrl;

      // Update Firestore primary
      await db.collection('schools').doc(pair.keepId).set({
        ...primary,
        aliases: primary.aliases,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Delete secondary doc from Firestore
      await db.collection('schools').doc(pair.dropId).delete();
      console.log(`Deleted ${pair.dropId} from Firestore.`);

      // Remove from map
      schoolMap.delete(pair.dropId);
    }
  }

  const finalSchools = Array.from(schoolMap.values());
  console.log(`Remaining unique schools count: ${finalSchools.length}`);

  // Save back to JSON files
  fs.writeFileSync(exportPath1, JSON.stringify(finalSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(finalSchools, null, 2));

  const simplified = finalSchools.map(s => ({
    id: s.id,
    name: s.name,
    country: s.country,
    city: s.city || null,
    currency: s.currency,
    salary_scale_5yr_net_monthly: s.salary_scale_5yr_net ?? null,
    salary_benchmark_category: s.salary_benchmark_category || 'PENDING',
    salary_confidence: s.salary_confidence || 'Pending',
    salary_source_year: s.salary_source_year || '2025/2026'
  }));
  fs.writeFileSync(artifactPath, JSON.stringify(simplified, null, 2));

  console.log('✅ Merges complete and synchronized across Firestore and JSON exports!');
}

mergeDuplicateSchools().catch(err => {
  console.error('❌ Merge failed:', err);
  process.exit(1);
});
