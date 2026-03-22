import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Leopardfish Tactical Palette
        primary: "#f97316",    // Orange
        background: "#020617", // Deep Navy
        azure: "#007FFF",      // Intel Blue
        foreground: "#ffffff",
        // The Border Fix: Critical for Firebase App Hosting stability
        border: "rgba(255, 255, 255, 0.1)",
      },
      fontWeight: {
        black: '900',
      },
      letterSpacing: {
        tighter: '-0.05em',
      },
    },
  },
  plugins: [],
};

export default config;