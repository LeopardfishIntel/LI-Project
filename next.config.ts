// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true, // Critical for Firebase routing
  images: {
    unoptimized: true, // Prevents 404s on optimized image routes in App Hosting
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }]
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;