/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  // Bloquea que la gente vea tu código fuente real en consola (Production maps)
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
