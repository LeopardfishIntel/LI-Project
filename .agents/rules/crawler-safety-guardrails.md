# 🛡️ CRAWLER & ENTITY MATCHING PROTECTION GUARDRAILS

## MANDATORY AGENT CONSTRAINTS & RULES

Whenever inspecting, editing, or refactoring crawler adaptors (`src/lib/crawler/adaptors/`), entity matching (`entityMatcher.ts`), school whitelist (`schoolWhitelist.ts`), or job card rendering (`featured-jobs/page.tsx`):

### 1. Mandatory Test Execution
- You MUST run `npm test` and `npm run typecheck` before declaring any task complete.
- ALL 17 unit tests in `entityMatcher.test.ts` MUST pass with 0 failures.

### 2. Strict Geographic Isolation (Country & City Lock)
- NEVER weaken or bypass country or city validation rules.
- A job listing in one country (e.g. France, Saudi Arabia, India) MUST NEVER be matched to a database school in another country (e.g. China, Spain, Portugal).

### 3. STRICT NO-FUZZY MATCHING (HARDCODED EXACT MATCHES ONLY)
- NEVER use fuzzy string score estimation (`Jaro-Winkler` or Levenshtein score thresholds).
- Entity matching MUST be 100% hardcoded via:
  1. Exact platform IDs / URL employer slugs (`tesEmployerSlug`, `tesOrganizationId`).
  2. Exact canonical school names (`school.name` / `school.schoolname`).
  3. Explicitly configured school aliases (`school.aliases` whitelist).
  4. Exact core brand token equality after stripping generic stop words (`extractCoreName`).

### 4. Zero-Fuzzy DOM Domain Lock
- Always prioritize exact canonical domain matching (`extractCanonicalDomain`) from embedded DOM links before attempting text matching.

### 5. Multi-Engine Job Pill & Evaluation Link Preservation
- Maintain multi-engine source deduplication using `Map<string, string>`.
- Ensure `buildEvalUrl()` dynamically passes the active engine filter tab URL to the financial forecaster.
