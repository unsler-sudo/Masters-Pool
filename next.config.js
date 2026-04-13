/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14: tell the compiler not to bundle these server-only packages
  experimental: {
    serverComponentsExternalPackages: [
      'playwright-core',
      '@sparticuz/chromium',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep these out of the server bundle entirely
      const existing = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...existing,
        'playwright-core',
        '@sparticuz/chromium',
        'chromium-bidi',
      ];
    }
    // playwright lists electron as an optional peer dep — stub it out
    config.resolve.alias = {
      ...config.resolve.alias,
      electron: false,
    };
    return config;
  },
};
module.exports = nextConfig;
