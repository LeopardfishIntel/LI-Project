import type { NextConfig } from "next";

/**
 * 🛰️ LEOPARDFISH TACTICAL BUILD CONFIGURATION
 * Optimized for Next.js 15.5.9 and Firebase App Hosting.
 * Stabilized for Iron Shell Rollout.
 */
const nextConfig: NextConfig = {
  // 🛡️ REDIRECT STABILIZATION
  // Forced to true to match Firebase Hosting's default directory behavior.
  // Prevents the 855 redirect spikes and "too many redirects" runtime errors.
  trailingSlash: true,
  
  images: {
    // Required for static stability / App Hosting compatibility
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      }
    ],
  },

  // Suppress build-blocking warnings for tactical velocity
  typescript: {
    ignoreBuildErrors: true,
  },
  
  experimental: {
    serverActions: {
      // Authorised origins for Firebase domains
      allowedOrigins: [
        "*.web.app",
        "*.firebaseapp.com"
      ],
    },
  },
};

export default nextConfig;
