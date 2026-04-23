/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: [
    '*.replit.dev',
    '*.replit.co',
    '*.pike.replit.dev',
    '*.kirk.replit.dev',
    '*.riker.replit.dev',
    '*.janeway.replit.dev',
    '*.spock.replit.dev',
    '*.picard.replit.dev',
  ],
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
