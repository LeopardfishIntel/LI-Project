import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Defining 'headline' so 'font-headline' becomes a valid class
        headline: ['Inter', 'sans-serif'], 
      },
      colors: {
        primary: "#f97316",    // Leopardfish Orange
        background: "#020617", // Deep Navy
        azure: "#007FFF",      // Intel Blue
        border: "rgba(255, 255, 255, 0.1)", // Hard-coded Border Fix
      },
      fontWeight: {
        black: "900",
      },
      letterSpacing: {
        tighter: "-0.05em",
      },
    },
  },
  plugins: [],
};
export default config;