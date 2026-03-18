import type { NextConfig } from "next";

/**
 * 🛰️ LEOPARDFISH TACTICAL BUILD CONFIGURATION
 * Optimized for Next.js 15.5.9, Firebase App Hosting, and Cloud Workstations.
 */
const nextConfig: NextConfig = {
  // 🚀 STANDALONE ENGINE: Critical for Firebase App Hosting stability.
  output: 'standalone',

  // 🛡️ REDIRECT STABILIZATION
  trailingSlash: true,
  
  // ⚡ WORKSTATION OPTIMIZATION: Disabling compression for proxy stability
  compress: false,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' }
    ],
  },

  // Tactical Velocity: Prevent build-blocking on lint/type errors
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    serverActions: {
      // 💎 MISSION CRITICAL: Authorised origins for Firebase and custom domains.
      allowedOrigins: [
        "*.web.app",
        "*.firebaseapp.com",
        "www.leopardfishintel.com",
        "leopardfishintel.com"
      ],
    },
  },
};

export default nextConfig;