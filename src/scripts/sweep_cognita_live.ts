/**
 * 🛸 SWEEP COGNITA LIVE ATS VACANCIES & SYNC FEATURED CACHE
 */

import { syncCognitaNetworkToCache } from "@/lib/search/cognita";

async function main() {
  console.log("🚀 Starting live Cognita ATS network sweep & cache sync...");
  const startTime = Date.now();
  const res = await syncCognitaNetworkToCache();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✨ Finished Cognita live sweep in ${elapsed}s:`);
  console.log(`   - Ingested Direct Cognita Vacancies: ${res.ingested}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error running Cognita sweep:", err);
  process.exit(1);
});
