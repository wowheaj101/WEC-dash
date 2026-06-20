/** @type {import('next').NextConfig} */
const nextConfig = {
  // @wec/core ships TypeScript source (no build step); Next must transpile it.
  transpilePackages: ['@wec/core'],
  async rewrites() {
    return [
      {
        source: '/api/griiip/:path*',
        destination: 'https://insights.griiip.com/:path*',
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      }
    }
    return config
  },
}
module.exports = nextConfig
