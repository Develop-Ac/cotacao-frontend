import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'http',
        hostname: 's3-acesso.acacessorios.local',
      },
      {
        protocol: 'http',
        hostname: 's3-painel.acacessorios.local',
      },
      {
        protocol: 'https',
        hostname: 's3-acesso.acacessorios.local',
      },
      {
        protocol: 'https',
        hostname: 's3-painel.acacessorios.local',
      },
    ],
  },
};

export default nextConfig;
