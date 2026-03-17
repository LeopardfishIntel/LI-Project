describe('Dossier Data Integrity Audit', () => {
  beforeEach(() => {
    // Direct access to the Comparison Matrix
    cy.visit('/compare');
  });

  it('Ensures no technical data leaks (null/undefined) are visible in the Comparison Matrix', () => {
    // Wait for the matrix to initialize and render dossiers
    cy.get('h1').should('contain', '3. Compare schools');
    
    // Select all potential text containers within the comparison sector
    // We scan spans and divs which hold the metric values
    cy.get('span, div').each(($el) => {
      const text = $el.text();
      
      // Blacklist of build-breaking or malformed technical strings
      const technicalLeaks = [
        'undefined', 
        'null', 
        '[object Object]', 
        'NaN'
      ];
      
      technicalLeaks.forEach(term => {
        // Precise match check
        expect(text.trim(), `Technical leak detected: "${term}" should not be visible.`).to.not.equal(term);
        
        // Case-insensitive containment check
        const lowerText = text.toLowerCase();
        const lowerTerm = term.toLowerCase();
        expect(lowerText, `Technical leak detected: "${term}" found inside content: "${text}"`).to.not.contain(lowerTerm);
      });
    });
  });

  it('Verifies that missing or pending data uses the authoritative fallback signature "—"', () => {
    // In a dynamic matrix, if data is missing, we mandate the use of the dash fallback.
    // We check that the UI is providing this fallback instead of empty space or technical errors.
    cy.contains('—').should('be.visible');
  });

  it('Verifies Tactical Ember color compliance', () => {
    // Ensure the background has not drifted from Deep Void (#020617)
    cy.get('body').should('have.css', 'background-color', 'rgb(2, 6, 23)');
  });
});
