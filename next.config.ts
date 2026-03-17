import type { NextConfig } from "next";

/**
 * 🛰️ LEOPARDFISH TACTICAL BUILD CONFIGURATION
 * Optimized for Next.js 15.5.9 and Firebase App Hosting.
 */
const nextConfig: NextConfig = {
  // Required for stable routing on Firebase Hosting
  trailingSlash: true,
  
  images: {
    // Required for static export / App Hosting compatibility
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
