/**
 * 🛰️ CZECH HUB ADAPTOR (UNIFIED DELEGATION)
 *
 * Delegates live vacancy extraction to the unified School Website Adaptor.
 * Official career landing pages for Prague & Czech schools are crawled directly
 * via Playwright DOM tracing with verified ATS/portal handling.
 */

import type { AdaptorInput, RawJobRecord } from './raw-job.types';
import { runSchoolWebsiteAdaptor } from './school-website-adaptor';

export async function runCzechHubAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  console.log(`ℹ️ [CZECH HUB ADAPTOR] Delegating live crawl to School Website Adaptor for ${input.schoolName}...`);
  return runSchoolWebsiteAdaptor(input);
}
