import type { NextConfig } from "next";

/**
 * 🛰️ TACTICAL CONFIGURATION v15.3 (FIXED)
 * Fix: Moved optimizePackageImports to 'experimental' to resolve build warnings.
 */
const nextConfig: NextConfig = {
  trailingSlash: true,
  
  // 📦 SERVER LOCKDOWN: Keeps AI logic on the server
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', '@genkit-ai/ai'],

  experimental: {
    // 🚀 PERFORMANCE: Restored your full optimization list here
    optimizePackageImports: [
      "lucide-react", "recharts", "@radix-ui/react-select", "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu", "@radix-ui/react-accordion", "@radix-ui/react-tabs",
      "@radix-ui/react-slot", "@radix-ui/react-label", "@radix-ui/react-checkbox",
      "@radix-ui/react-switch", "@radix-ui/react-radio-group", "@radix-ui/react-popover",
      "@radix-ui/react-tooltip", "@radix-ui/react-scroll-area", "@radix-ui/react-separator",
      "@radix-ui/react-progress"
    ],
  },

  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  webpack: (config, { dev }) => {
    if (dev) { config.cache = false; }
    return config;
  },
};

export default nextConfig;