# 🔒 FROZEN MODULES — DO NOT ALTER WITHOUT EXPLICIT PERMISSION
- src/lib/search/gems.ts
- src/lib/crawler/adaptors/gems-adaptor.ts
- scripts/discover-gems-entities.ts
- src/lib/crawler/titleSanitizer.ts

# STRICT GEMS ENGINE RULES:
1. DO NOT modify, refactor, or touch any files listed under FROZEN MODULES unless explicitly commanded by the prompt.
2. DO NOT alter ATS company string mappings, key aliasing logic, or WAF fallback parameters in the GEMS pipeline.
3. If an edit is requested for GEMS engine components, verify types with `npx tsc --noEmit` before proposing commits.
