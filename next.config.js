/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  distDir: '.next',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

