import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { searchTeachAwayDbSchools } from "./src/lib/search/teachaway";

async function run() {
  console.log("🛸 Running Teach Away DB Search Engine...");
  const start = Date.now();
  const results = await searchTeachAwayDbSchools();
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`⏱️ Completed in ${duration} seconds.`);
  console.log(`
✅ Surfaced ${results.length} DB-grounded Teach Away job matches:`);
  console.log(JSON.stringify(results, null, 2));
}

run();
