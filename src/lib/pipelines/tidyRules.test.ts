import { isTidyable, tidyReferenceMillis, REJECTED_KEEP_DAYS, MERGED_KEEP_DAYS } from "./tidyRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } }
const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 6);

check("approved is never tidied", !isTidyable({ status: "approved", createdAtMillis: now - 400 * DAY }, now));
check("pending is never tidied", !isTidyable({ status: "pending_review", createdAtMillis: now - 400 * DAY }, now));
check("expired is not touched here", !isTidyable({ status: "expired", createdAtMillis: now - 400 * DAY }, now));
check("rejected yesterday is kept (memory)", !isTidyable({ status: "rejected", reviewedAt: new Date(now - 1 * DAY) }, now));
check(`rejected ${REJECTED_KEEP_DAYS - 1} days ago is kept`, !isTidyable({ status: "rejected", reviewedAt: new Date(now - (REJECTED_KEEP_DAYS - 1) * DAY) }, now));
check(`rejected ${REJECTED_KEEP_DAYS} days ago goes`, isTidyable({ status: "rejected", reviewedAt: new Date(now - REJECTED_KEEP_DAYS * DAY) }, now));
check("rejected: review time wins over first-added time", !isTidyable({ status: "rejected", reviewedAt: new Date(now - 2 * DAY), createdAtMillis: now - 300 * DAY }, now));
check("rejected: engine refreshing updatedAtMillis does not keep it forever", isTidyable({ status: "rejected", createdAtMillis: now - 90 * DAY, updatedAtMillis: now - 1000 }, now));
check("merged 3 days old is kept", !isTidyable({ status: "merged", createdAtMillis: now - 3 * DAY }, now));
check(`merged ${MERGED_KEEP_DAYS} days old goes`, isTidyable({ status: "merged", createdAtMillis: now - MERGED_KEEP_DAYS * DAY }, now));
check("merged kept alive by refreshes does not matter", isTidyable({ status: "MERGED", ingestedAtMillis: now - 20 * DAY, updatedAtMillis: now }, now));
check("no date at all -> treated as old", isTidyable({ status: "rejected" }, now) && isTidyable({ status: "merged" }, now));
check("Firestore-style timestamp understood", tidyReferenceMillis({ status: "rejected", reviewedAt: { toMillis: () => 12345 } }) === 12345);
check("seconds-style timestamp understood", tidyReferenceMillis({ status: "rejected", reviewedAt: { seconds: 100 } }) === 100000);
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
