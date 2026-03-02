/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@campaignsites/ui', '@campaignsites/types'],
  images: {
    domains: ['localhost'],
  },
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
