import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  // Skip static generation for error pages to avoid context issues
  generateBuildId: async () => {
    return 'meridian-2.0-build'
  },
  // Configure server external packages
  serverExternalPackages: ['@supabase/supabase-js'],
  // Webpack configuration for better stability
  webpack: (config, { isServer }) => {
    // Optimize for better chunk loading
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          chunks: 'all'
        }
      }
    };
    
    return config;
  }
};

export default nextConfig;
