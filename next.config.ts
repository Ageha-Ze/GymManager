/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // Comprehensive Supabase domains
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in https://api.supabase.io",
              "worker-src 'self' blob:",
            ].join('; ')
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig