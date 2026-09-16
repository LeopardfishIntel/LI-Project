# 🔒 FROZEN MODULES — DO NOT ALTER WITHOUT EXPLICIT PERMISSION
- src/lib/search/gems.ts
- src/lib/crawler/adaptors/gems-adaptor.ts
- scripts/discover-gems-entities.ts
- src/lib/crawler/titleSanitizer.ts
- src/lib/crawler/adaptors/tes-adaptor.ts
- scripts/sweep-tes-jobs-only.ts
- src/lib/pipelines/pipeline1-ingestion.ts

# STRICT GEMS ENGINE RULES:
1. DO NOT modify, refactor, or touch any files listed under FROZEN MODULES unless explicitly commanded by the prompt.
2. DO NOT alter ATS company string mappings, key aliasing logic, or WAF fallback parameters in the GEMS pipeline.
3. If an edit is requested for GEMS engine components, verify types with `npx tsc --noEmit` before proposing commits.

# STRICT TES DIRECT ENGINE RULES:
1. DO NOT modify, refactor, or tamper with the dual-tier TES extraction logic (JSON-LD + Playwright DOM fallback).
2. DO NOT remove or bypass `isSupportOrNonTeachingRole()` guardrails in `tes-adaptor.ts`.
3. DO NOT alter concurrency throttle parameters (`concurrency = 5`) for deep closing date inspection.
4. DO NOT disable the dynamic "Load More" expansion loop or the `purgeStaleTesVacancies` garbage collection routines.
5. If changes are requested for TES components, verify types with `npm run typecheck` and run unit tests (`npm run test`) before proposing commits.
