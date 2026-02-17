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
    serverComponentsExternalPackages: ['better-sqlite3', 'knex', '@mastra/core', '@copilotkit/runtime', 'antlr4ng'],
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

      // Ensure better-sqlite3 native module is properly bundled
      // This is critical for Alpine/Docker builds
      config.externals = config.externals || [];
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
