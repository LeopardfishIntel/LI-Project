import { defineConfig } from "cypress";

/**
 * 🛰️ LEOPARDFISH CYPRESS CONFIGURATION
 * Optimized for local tactical audits on port 9002.
 */
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:9002",
    supportFile: false,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Logic for tactical event listeners can be injected here
    },
  },
});
