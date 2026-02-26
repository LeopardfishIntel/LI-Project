/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // <-- makes it static
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;