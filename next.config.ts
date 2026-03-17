import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🛰️ FIREBASE APP HOSTING PROTOCOLS
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
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
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // 🛡️ CSRF PROTECTION FOR PRODUCTION DOMAINS
    serverActions: {
      allowedOrigins: [
        "*.web.app",
        "*.firebaseapp.com"
      ],
    },
  },
};

export default nextConfig;
