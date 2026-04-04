import type { NextConfig } from "next";

/**
 * 🛰️ TACTICAL CONFIGURATION v15.1
 * Logic: Optimised for Firebase App Hosting & Cloud Workstation stability.
 * Resolution: Disables Webpack cache to prevent ENOENT filesystem corruption errors.
 */
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🛡️ TACTICAL CACHE SHIELD:
  // Disables the Webpack filesystem cache in development to resolve ENOENT errors
  // caused by corrupted cache files in the .next directory.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  // 🚀 PERFORMANCE OPTIMIZATION:
  // Reduces module processing time for high-density pages by pruning unused exports.
  // This addresses the "2322 modules" bloat seen in server logs.
  experimental: {
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
  },
};

export default nextConfig;
