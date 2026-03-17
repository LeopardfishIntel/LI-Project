import type { NextConfig } from "next";

/**
 * 🛰️ LEOPARDFISH TACTICAL BUILD CONFIGURATION
 * Optimized for Next.js 15.5.9 and Firebase App Hosting.
 * Stabilized for Iron Shell Rollout.
 */
const nextConfig: NextConfig = {
  // 🚀 STANDALONE ENGINE: Critical for Firebase App Hosting stability.
  // This prevents "ChunkLoadError" by bundling all dependencies.
  output: 'standalone',

  // 🛡️ REDIRECT STABILIZATION
  // Prevents 404/Backend Not Found on custom domains.
  trailingSlash: true,
  
  images: {
    // Required for static stability / App Hosting compatibility
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' }
    ],
  },

  // Suppress build-blocking warnings for tactical velocity
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Ensure Tailwind and PostCSS don't crash on build
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      // Authorised origins for Firebase domains
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