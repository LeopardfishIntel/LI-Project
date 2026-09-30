/**
 * 🏫 SCRIPT: Add Park House English School Legal Entity Name
 *
 * Adds "Muntazeh English School SPC" to FLIS0281's `legalNames` array in Firestore.
 * This allows matchSchoolEntity() to unambiguously resolve Workday ISP jobs
 * issued under the school's legal entity name.
 *
 * SAFETY: Dry run by default. Zero writes without `--commit`.
 * Idempotent: uses FieldValue.arrayUnion and checks existing state.
 *
 * Usage:
 *   npx tsx src/scripts/add_park_house_legal_name.ts          (dry run)
 *   npx tsx src/scripts/add_park_house_legal_name.ts --commit (apply write)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");
const SCHOOL_ID = "FLIS0281";
const LEGAL_NAME_TO_ADD = "Muntazeh English School SPC";

async function main() {
  console.log("🏫 [LEGAL NAME UPDATE] Checking Park House English School (FLIS0281)...");
  console.log(`Mode: ${COMMIT ? "🔴 COMMIT (LIVE WRITES)" : "🟢 DRY RUN (READ ONLY)"}\n`);

  const schoolRef = db.collection("schools").doc(SCHOOL_ID);
  const snap = await schoolRef.get();

  if (!snap.exists) {
    console.error(`❌ School ${SCHOOL_ID} not found in database!`);
    process.exit(1);
  }

  const data = snap.data() || {};
  const currentLegalNames: string[] = Array.isArray(data.legalNames)
    ? data.legalNames
    : Array.isArray(data.legal_names)
    ? data.legal_names
    : [];

  console.log(`School Name:         ${data.name || data.schoolname}`);
  console.log(`City / Country:      ${data.city}, ${data.country}`);
  console.log(`Current legalNames:  ${JSON.stringify(currentLegalNames)}`);

  if (currentLegalNames.includes(LEGAL_NAME_TO_ADD)) {
    console.log(`\n✅ "${LEGAL_NAME_TO_ADD}" is ALREADY present in legalNames for ${SCHOOL_ID}. No change needed.`);
    return;
  }

  console.log(`\n➕ Legal name to add: "${LEGAL_NAME_TO_ADD}"`);

  if (!COMMIT) {
    console.log("\n--------------------------------------------------------");
    console.log("ℹ️  Dry run complete. Zero Firestore writes were made.");
    console.log("👉 Run with --commit to apply this change to Firestore.");
    console.log("--------------------------------------------------------");
    return;
  }

  console.log("📡 Committing update to Firestore...");
  await schoolRef.update({
    legalNames: FieldValue.arrayUnion(LEGAL_NAME_TO_ADD),
    updatedAt: new Date().toISOString()
  });

  console.log(`🎉 Successfully added "${LEGAL_NAME_TO_ADD}" to ${SCHOOL_ID} legalNames.`);
}

main().catch((err) => {
  console.error("❌ Error running add_park_house_legal_name:", err);
  process.exit(1);
});
