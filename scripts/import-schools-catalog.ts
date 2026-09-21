import fs from "fs";
import path from "path";
import { getAdminDb } from "../src/firebase/admin";
import { SchoolRecordSchema, SchoolRecord } from "../src/types/school-catalog-schema";

const isDryRun = process.argv.includes("--dry-run");

async function importSchoolsCatalog() {
  const db = getAdminDb();
  if (!db) {
    console.error("❌ Database connection failed. Check service account keys or environment.");
    process.exit(1);
  }

  const jsonPath = path.join(process.cwd(), "src/lib/data/schools-catalog.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const schools: unknown[] = JSON.parse(rawData);

  console.log(`\n🔍 ${isDryRun ? "[DRY RUN] " : ""}Validating ${schools.length} school records...`);

  const validRecords: SchoolRecord[] = [];
  let validationErrors = 0;

  for (const item of schools) {
    const parseResult = SchoolRecordSchema.safeParse(item);
    if (!parseResult.success) {
      validationErrors++;
      console.error(`❌ Validation error on ${(item as any)?.id || "UNKNOWN"}:`, parseResult.error.format());
      continue;
    }
    validRecords.push(parseResult.data);
    console.log(`  ✓ Validated: ${parseResult.data.id} - ${parseResult.data.schoolname}`);
  }

  console.log(`\n📊 Summary: ${validRecords.length} / ${schools.length} valid records.`);
  if (validationErrors > 0) {
    console.log(`⚠️ Skipped ${validationErrors} invalid records.`);
  }

  if (isDryRun) {
    console.log("\n🧪 Dry run complete. No changes written to Firestore.\n");
    return;
  }

  // Chunk array into batches of 400 (well below Firestore 500 limit)
  const CHUNK_SIZE = 400;
  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    const chunk = validRecords.slice(i, i + CHUNK_SIZE);
    
    // Check if db is admin SDK or fallback
    if (typeof db.batch === "function") {
      const batch = db.batch();
      chunk.forEach((school) => {
        const docRef = db.collection("schools").doc(school.id);
        batch.set(docRef, { ...school, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    } else {
      // Direct doc setting fallback
      for (const school of chunk) {
        const docRef = db.collection("schools").doc(school.id);
        await docRef.set({ ...school, updatedAt: new Date().toISOString() }, { merge: true });
      }
    }

    console.log(`🚀 Committed batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} records)`);
  }

  console.log(`\n🎉 Import successful! Total records updated: ${validRecords.length}\n`);
}

importSchoolsCatalog().catch((err) => {
  console.error("❌ Import script error:", err);
  process.exit(1);
});
