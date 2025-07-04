/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image domains
  images: {
    domains: ['images.unsplash.com', 'assets.aceternity.com'],
  },
  
  // Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  webpack(config) {
    config.module.exprContextCritical = false;      // suppress that specific warning
    return config;
  },
}

export default nextConfig; 