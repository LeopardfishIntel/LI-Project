import type { NextConfig } from "next";

/**
 * 🛰️ TACTICAL CONFIGURATION v15.3
 * Resolved: Moved experimental flags to top-level for Next.js 15 compatibility.
 */
const nextConfig: NextConfig = {
  trailingSlash: true,
  
  // 📦 SERVER LOCKDOWN: Keeps AI logic on the server (Top-level in v15)
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', '@genkit-ai/ai'],

  // 🚀 PERFORMANCE: Faster compilation for heavy UI libraries (Top-level in v15)
  optimizePackageImports: [
    "lucide-react", 
    "recharts",
    "@radix-ui/react-select",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-accordion",
    "@radix-ui/react-tabs",
    "@radix-ui/react-slot",
    "@radix-ui/react-label",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-switch",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-popover",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-separator",
    "@radix-ui/react-progress"
  ],

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 🛡️ TACTICAL CACHE SHIELD
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;