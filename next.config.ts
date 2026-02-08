import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  turbopack: {}, // Silence Next.js 16 Turbopack warning
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallback for Node.js modules in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        buffer: require.resolve('buffer/'),
      };
    }
    return config;
  },
};

export default nextConfig;
