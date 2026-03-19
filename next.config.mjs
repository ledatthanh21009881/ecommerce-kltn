/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['res.cloudinary.com', 'img.vietqr.io', 'file.hstatic.net'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'file.hstatic.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    forceSwcTransforms: true,
  },
  reactStrictMode: false,
  async rewrites() {
    // IMPORTANT:
    // Do NOT rewrite `/api/backend/*` to an external backend.
    // We implement `/api/backend/*` via Next Route Handlers under `app/api/backend/*`.
    // Rewriting it would bypass those handlers and break on VPS (previously hardcoded to localhost:8000).
    const BACKEND =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:8000'

    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND}/api/v1/:path*`,
      },
      {
        source: '/api/user/:path*',
        destination: `${BACKEND}/api/user/:path*`,
      },
      {
        source: '/api/products/:path*',
        destination: `${BACKEND}/api/products/:path*`,
      },
      {
        source: '/api/products',
        destination: `${BACKEND}/api/products`,
      },
    ]
  },
}

export default nextConfig
