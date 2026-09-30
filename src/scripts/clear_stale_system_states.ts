/**
 * 🧹 SYSTEM MAINTENANCE — Clear Stale System States
 *
 * 1. Resets stuck `isRevalidating: true` flags across school documents
 *    left behind by legacy background workers / function timeouts.
 * 2. Clears expired circuit breaker cooling status in `crawler_engine_status`.
 *
 * Usage:
 *   npx tsx src/scripts/clear_stale_system_states.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function main() {
  console.log("🧹 [STALE STATE CLEANUP] Starting system cleanup...\n");

  // 1. Reset stuck isRevalidating schools
  console.log("📡 Checking for schools with stuck isRevalidating flags...");
  const stuckSnap = await db.collection("schools").where("isRevalidating", "==", true).get();
  console.log(`Found ${stuckSnap.size} schools with isRevalidating == true.`);

  if (!stuckSnap.empty) {
    let batch = db.batch();
    let batchCount = 0;
    let totalCleared = 0;

    for (const docSnap of stuckSnap.docs) {
      batch.update(docSnap.ref, { isRevalidating: false });
      batchCount++;
      totalCleared++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Cleared isRevalidating flag on ${totalCleared} schools.`);
  }

  // 2. Clear expired circuit breakers
  console.log("\n📡 Checking crawler_engine_status for expired cooling periods...");
  const engineSnap = await db.collection("crawler_engine_status").get();
  let enginesReset = 0;

  for (const docSnap of engineSnap.docs) {
    const data = docSnap.data();
    if (data.isCooling && data.coolingUntilMillis && data.coolingUntilMillis < Date.now()) {
      console.log(`Resetting expired circuit breaker for engine: ${docSnap.id} (expired at ${new Date(data.coolingUntilMillis).toISOString()})`);
      await docSnap.ref.update({
        isCooling: false,
        coolingResetAt: new Date().toISOString(),
      });
      enginesReset++;
    }
  }

  console.log(`✅ Reset ${enginesReset} expired engine circuit breakers.`);
  console.log("\n🎉 Stale system states successfully cleared!");
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
