/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker builds
  // This creates a minimal build with only necessary files
  output: 'standalone',

  // Disable ESLint during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript type checking during builds (optional)
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'knex'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Copy migrations to standalone build
    if (isServer) {
      const CopyPlugin = require('copy-webpack-plugin');
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: 'src/lib/db/migrations',
              to: 'lib/db/migrations',
            },
          ],
        })
      );
    }

    return config;
  },
};

module.exports = nextConfig;
