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
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    forceSwcTransforms: true,
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1/ecommerce/api/:path*',
      },
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1/ecommerce/api/v1/:path*',
      },
      {
        source: '/api/products/:path*',
        destination: 'http://127.0.0.1/ecommerce/api/products/:path*',
      },
      {
        source: '/api/products',
        destination: 'http://127.0.0.1/ecommerce/api/products',
      },
    ]
  },
}

export default nextConfig
