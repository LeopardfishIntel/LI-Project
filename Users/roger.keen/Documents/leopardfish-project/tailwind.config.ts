import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-inter)", "sans-serif"],
        headline: ["var(--font-montserrat)", "sans-serif"],
      },
      colors: {
        background: "#020617",
        primary: "#f97316",
        accent: "#007FFF",
        border: "rgba(255, 255, 255, 0.1)", // Explicit mapping to resolve border-border syntax errors
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;