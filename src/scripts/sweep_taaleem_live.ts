/**
 * 🏫 SWEEP TAALEEM LIVE ATS DIRECT VACANCIES & CROSS-LINK CACHE
 */

import { syncTaaleemNetworkToCache } from "@/lib/crawler/sync-taaleem";

async function main() {
  console.log("🚀 Starting live Taaleem ATS network sweep & cross-linking...");
  const startTime = Date.now();
  const res = await syncTaaleemNetworkToCache();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✨ Finished Taaleem live sweep in ${elapsed}s:`);
  console.log(`   - Ingested Direct Taaleem Vacancies: ${res.ingested}`);
  console.log(`   - Cross-linked Dual-Listed TES Vacancies: ${res.crossLinked}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error running Taaleem sweep:", err);
  process.exit(1);
});
