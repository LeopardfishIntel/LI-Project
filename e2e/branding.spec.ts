import { test, expect } from '@playwright/test';

/**
 * 🛡️ LEOPARDFISH BRANDING COMPLIANCE AUDIT
 * This test suite verifies the /compare route against the Tactical Ember design system.
 * It ensures all brand colors are hard-coded HEX values and typography is standardised.
 */
test.describe('Leopardfish Tactical Branding Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the decision-making sector
    await page.goto('/compare');
  });

  test('Verify Primary CTA uses hard-coded Tactical Ember HEX (#f97316)', async ({ page }) => {
    // The "Run analysis" button is the mission-critical CTA in the comparison matrix
    const primaryCTA = page.getByRole('button', { name: /run analysis/i });
    
    // Ensure the CTA is active and visible
    await expect(primaryCTA).toBeVisible();

    // 1. Colour Check: Verify computed background is exact RGB for #f97316
    const bgColor = await primaryCTA.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(249, 115, 22)');

    // 2. Variable Shield: Fail if the element uses Tailwind's variable-based primary class
    // Variable-based classes usually start with 'bg-primary' or 'text-primary'
    const classList = await primaryCTA.evaluate((el) => Array.from(el.classList));
    expect(classList, 'Brand drift detected: Element uses variable-based bg-primary instead of hard-coded HEX.').not.toContain('bg-primary');
  });

  test('Verify Typography Standardisation (font-black, tracking-tighter)', async ({ page }) => {
    // Audit all top-level headlines for brand authority
    const headlines = page.locator('h1, h2');
    const count = await headlines.count();
    
    expect(count, 'Protocol Failure: No H1 or H2 headlines found on /compare dossiers.').toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const headline = headlines.nth(i);
      const classList = await headline.evaluate((el) => Array.from(el.classList));
      
      // 1. Weight Signature
      expect(classList, `Headline ${i} must have font-black for brand authority.`).toContain('font-black');
      
      // 2. Kerning Signature
      expect(classList, `Headline ${i} must have tracking-tighter for tactical impact.`).toContain('tracking-tighter');
      
      // 3. Variable Shield: Ensure colors are hard-coded, not derived from CSS variables
      expect(classList, 'Brand drift detected: Headline uses variable-based text-primary.').not.toContain('text-primary');
      expect(classList, 'Brand drift detected: Headline uses variable-based text-muted-foreground.').not.toContain('text-muted-foreground');
    }
  });

  test('Verify Viewport Background Integrity (#020617)', async ({ page }) => {
    // Verify the main viewport background matches the Deep Void signature
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    expect(bodyBg, 'Background Drift detected: Body does not match #020617 (Deep Void)').toBe('rgb(2, 6, 23)');
  });
});