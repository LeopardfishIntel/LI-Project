import * as fs from "fs";
import * as path from "path";

/**
 * 🛰️ CANONICAL SCHOOL ID AUDITOR & INTEGRITY GUARDIAN
 *
 * Scans all TypeScript / JavaScript files across the application to ensure
 * that every hardcoded or referenced `FLIS\d{4}` ID strictly matches an active
 * school entry in the authoritative database export (`complete_school_fields_export.json`).
 *
 * Exits with status 1 if any unknown, stale, or mismatched IDs are discovered.
 */

function runAudit() {
  console.log("=================================================");
  console.log("🛡️ RUNNING CANONICAL FLIS ID INTEGRITY AUDIT");
  console.log("=================================================\n");

  const exportPath = path.resolve("./public/complete_school_fields_export.json");
  if (!fs.existsSync(exportPath)) {
    console.error("❌ Fatal: complete_school_fields_export.json not found!");
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
  const validSchools = new Map<string, any>();
  exportData.forEach((s: any) => {
    if (s.id) {
      validSchools.set(s.id.toUpperCase(), s);
    }
  });

  console.log(`✅ Loaded ${validSchools.size} canonical schools from authoritative export.`);

  function findSourceFiles(dir: string): string[] {
    let files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== "node_modules" && item.name !== ".next" && item.name !== ".git") {
          files = files.concat(findSourceFiles(fullPath));
        }
      } else if (/\.(ts|tsx|js)$/.test(item.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const sourceFiles = findSourceFiles("./src");
  console.log(`🔍 Scanning ${sourceFiles.length} source code files for FLIS ID integrity...\n`);

  const flisRegex = /\bFLIS\d{4}\b/gi;
  let invalidCount = 0;
  let totalChecked = 0;

  const HISTORICAL_MIGRATION_FILES = new Set(["src/scripts/merge_duplicates.ts"]);

  for (const file of sourceFiles) {
    const relPath = path.relative(".", file);
    if (HISTORICAL_MIGRATION_FILES.has(relPath)) continue;

    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(flisRegex);
      if (matches) {
        for (const m of matches) {
          totalChecked++;
          const upperId = m.toUpperCase();
          if (!validSchools.has(upperId)) {
            invalidCount++;
            console.error(`❌ INVALID/UNKNOWN ID [${upperId}] found in ${path.relative(".", file)}:${i + 1}`);
            console.error(`   Line: ${line.trim()}`);
          }
        }
      }
    }
  }

  console.log(`\n-------------------------------------------------`);
  console.log(`📊 Audit Result: Checked ${totalChecked} references.`);
  if (invalidCount > 0) {
    console.error(`🚨 FAILED: Found ${invalidCount} invalid or unregistered FLIS ID(s).`);
    process.exit(1);
  } else {
    console.log(`🎉 PASSED: All ${totalChecked} FLIS references map 100% to valid canonical schools.`);
    process.exit(0);
  }
}

runAudit();
