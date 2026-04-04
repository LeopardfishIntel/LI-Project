import type { NextConfig } from "next";

/**
 * 🛰️ TACTICAL CONFIGURATION v15.1
 * Logic: Optimised for Firebase App Hosting & Cloud Workstation stability.
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
  // Reduces module processing time for high-density pages.
  experimental: {
    optimizePackageImports: ["lucide-react", "@/firebase"],
  },
};

export default nextConfig;
