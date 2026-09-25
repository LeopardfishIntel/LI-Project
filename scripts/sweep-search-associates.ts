/**
 * CLI Runner: Search Associates Leadership Sweeper & Turnover Auditor
 * Scheduled for: Tuesdays & Thursdays
 */
import { scrapeSearchAssociatesLeadership } from "../src/lib/crawler/search-associates-leadership";

async function main() {
  try {
    const result = await scrapeSearchAssociatesLeadership();
    console.log("Execution Result:", result);
    process.exit(0);
  } catch (err) {
    console.error("Critical Failure:", err);
    process.exit(1);
  }
}

main();
