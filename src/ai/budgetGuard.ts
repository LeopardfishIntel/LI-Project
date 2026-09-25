/**
 * 🛡️ AI BUDGET GUARD & COST CIRCUIT BREAKER
 *
 * Tracks AI token usage and estimated spend in GBP across runtime executions.
 * Enforces a strict default £2.00 GBP safety limit before halting further AI calls and warning the user.
 */

// Exchange rate approx 1 GBP = 1.30 USD
const USD_PER_GBP = 1.30;

// Gemini 2.5 Flash standard pricing: $0.075 / 1M input tokens, $0.30 / 1M output tokens
const COST_PER_INPUT_TOKEN_USD = 0.075 / 1_000_000;
const COST_PER_OUTPUT_TOKEN_USD = 0.30 / 1_000_000;

export interface BudgetStatus {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  estimatedCostGbp: number;
  budgetLimitGbp: number;
  isBreakerTripped: boolean;
}

class AIBudgetManager {
  private totalCalls = 0;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private budgetLimitGbp = 2.00; // £2.00 GBP hard safety limit

  public setBudgetLimit(gbp: number) {
    this.budgetLimitGbp = gbp;
  }

  public getBudgetLimit(): number {
    return this.budgetLimitGbp;
  }

  public getEstimatedCostGbp(): number {
    const usd = (this.totalInputTokens * COST_PER_INPUT_TOKEN_USD) + (this.totalOutputTokens * COST_PER_OUTPUT_TOKEN_USD);
    return usd / USD_PER_GBP;
  }

  public getEstimatedCostUsd(): number {
    return (this.totalInputTokens * COST_PER_INPUT_TOKEN_USD) + (this.totalOutputTokens * COST_PER_OUTPUT_TOKEN_USD);
  }

  /**
   * Check before making an AI call. Throws or returns false if budget is exceeded.
   */
  public canExecute(estimatedInputTokens = 1000): boolean {
    const currentCostGbp = this.getEstimatedCostGbp();
    if (currentCostGbp >= this.budgetLimitGbp) {
      console.warn(`\n🚨 ================================================================`);
      console.warn(`🚨 [AI BUDGET GUARD WARNING] Safety limit reached: £${currentCostGbp.toFixed(4)} GBP (Cap: £${this.budgetLimitGbp.toFixed(2)} GBP).`);
      console.warn(`🚨 Halting automated AI calls to prevent credit depletion.`);
      console.warn(`🚨 ================================================================\n`);
      return false;
    }
    return true;
  }

  /**
   * Record usage after an AI call.
   */
  public recordUsage(inputTokens = 1000, outputTokens = 250): BudgetStatus {
    this.totalCalls++;
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;

    const costGbp = this.getEstimatedCostGbp();
    const isTripped = costGbp >= this.budgetLimitGbp;

    if (isTripped) {
      console.warn(`\n⚠️ [AI BUDGET GUARD] Spend threshold exceeded: £${costGbp.toFixed(4)} GBP >= £${this.budgetLimitGbp.toFixed(2)} GBP limit.`);
    }

    return this.getStatus();
  }

  public getStatus(): BudgetStatus {
    return {
      totalCalls: this.totalCalls,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      estimatedCostUsd: this.getEstimatedCostUsd(),
      estimatedCostGbp: this.getEstimatedCostGbp(),
      budgetLimitGbp: this.budgetLimitGbp,
      isBreakerTripped: this.getEstimatedCostGbp() >= this.budgetLimitGbp,
    };
  }

  public reset() {
    this.totalCalls = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }
}

export const aiBudgetGuard = new AIBudgetManager();

/**
 * Strips heavy script, style, SVG, and navigation bloat from raw HTML
 * reducing token payload size by ~85-90% before passing to AI models.
 */
export function cleanHtmlForAI(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15000); // 15k char cap (~3.5k tokens max)
}
