/**
 * 🛡️ DOSSIER DATA INTEGRITY AUDIT
 * This test suite performs a deep-scan of the Comparison Matrix to ensure no
 * technical leaks (null, undefined, [object Object]) are visible to the user.
 * It verifies that missing data points use the authoritative "—" fallback.
 */
describe('Comparison Matrix Integrity Audit', () => {
  beforeEach(() => {
    // Navigate to the Decision sector
    cy.visit('/compare');
  });

  it('Ensures no technical string literals are leaked in the UI', () => {
    // Select all potential text containers within the comparison dossiers
    cy.get('span, div, p').each(($el) => {
      const text = $el.text().trim();
      
      const technicalBlacklist = [
        'undefined',
        'null',
        '[object Object]',
        'NaN',
        'undefined undefined'
      ];

      technicalBlacklist.forEach(forbidden => {
        // Precise match check
        expect(text, `Technical leak detected: "${forbidden}" found in element.`).to.not.equal(forbidden);
        
        // Internal containment check
        expect(text.toLowerCase(), `Technical leak detected: "${forbidden}" found within content: "${text}"`)
          .to.not.contain(forbidden.toLowerCase());
      });
    });
  });

  it('Verifies the presence of the authoritative fallback signature "—"', () => {
    // Confirm that the system is using the dash fallback for incomplete dossiers
    cy.contains('—').should('be.visible');
  });

  it('Confirms Tactical Ember background compliance (#020617)', () => {
    // Ensure the viewport background remains anchored to Deep Void
    cy.get('body').should('have.css', 'background-color', 'rgb(2, 6, 23)');
  });
});
