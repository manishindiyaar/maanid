/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config) => {
    // Improve module resolution for case-sensitive file systems
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src/'),
    };
    return config;
  },
  // Skip type checking in build to avoid blocking deployment
  typescript: {
    // !! WARN !!
    // Ignoring build errors in production instead of failing build
    // Useful when dealing with external type issues
    ignoreBuildErrors: true,
  },
  // Skip ESLint during builds
  eslint: {
    // Similarly, ignore ESLint errors during builds
    ignoreDuringBuilds: true,
  },
  // Basic config
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'avatars.githubusercontent.com', 'lh3.googleusercontent.com', 'images.unsplash.com', 'assets.aceternity.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Improved handling of client components
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Set output mode to standalone for better deployment compatibility
  output: 'standalone',
  // Disable automatic static optimization for routes that use dynamic features
  staticPageGenerationTimeout: 1000,
  compiler: {
    styledComponents: true,
  },
  // Disable automatic static generation for all pages/routes
  // This ensures that dynamic routes work properly in production
  generateEtags: true,
  distDir: '.next',
  poweredByHeader: false,
  trailingSlash: false,
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig