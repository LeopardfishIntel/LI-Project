# 🛡️ Antigravity & Leopardfish Intel Guidelines

## 1. Environment & Non-Interactive Execution Rules
- **Non-Interactive Commands**: Always run package managers, scripts, and installs with non-interactive flags (e.g., `npx -y`, `npm init -y`, `apt install -y`) to prevent sub-agent execution timeouts.
- **Port Management**: The Next.js dev server runs locally on port `:3000`. If a port conflict occurs, kill background tasks and restart `npm run dev`.
- **Context Preservation**: Avoid excessive single-thread conversational buildup. Transition complex multi-phase milestones to new conversational threads once changes are committed to git.

## 2. Antigravity Troubleshooting Procedures
1. **Workspace Scope**: Ensure the active workspace points directly to `/Users/roger.keen/Antigravity LI Project/LI-Project`.
2. **Rate Limits & Model Throttling**: Use `Gemini 3.7 Flash` as the primary operational model for high throughput.
3. **UI / CDP Socket Refresh**: When the browser agent reports CDP socket errors on port 9222, execute `Developer: Reload Window` (`Cmd + Shift + P`).

## 3. Vacancy Discovery & Grounding Rules
- **Direct Advert Deep-Links**: TES and aggregator links must link directly to the specific job advert (`https://www.tes.com/jobs/vacancy/[slug]-[id]`) or the dedicated school employer hub (`https://www.tes.com/jobs/employer/[slug]-[id]`).
- **Forbidden URLs**: Bare unfiltered international directories (`https://www.tes.com/jobs/browse/international`) are strictly rejected in all scraping flows.
- **Lifecycle Triage**:
  * Jobs with future closing dates (`closingDate >= today`) are saved as `status: 'pending_review'`.
  * Jobs with past closing dates (`closingDate < today`) are automatically saved as `status: 'expired'` and archived for historical school turnover metrics.
