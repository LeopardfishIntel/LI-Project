/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true, // <--- Add this
  images: {
    unoptimized: true,
  },
};

export default nextConfig;


