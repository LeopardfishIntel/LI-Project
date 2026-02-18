/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/tax-calculator',
        destination: '/financial-forecaster',
        permanent: true,
      },
      {
        source: '/true-costs',
        destination: '/financial-forecaster',
        permanent: true,
      },
      {
        source: '/evaluate',
        destination: '/financial-forecaster',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
