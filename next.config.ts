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

// Check if we are running in a build phase or dev server to log
if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
  console.log('\n\x1b[36m%s\x1b[0m', '--------------------------------------------------');
  console.log('\x1b[36m%s\x1b[0m', '🚀  Carregando Configurações de Microserviços (ENV)');
  console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');

  const services = [
    "NEXT_PUBLIC_COMPRAS_SERVICE_BASE",
    "NEXT_PUBLIC_ESTOQUE_SERVICE_BASE",
    "NEXT_PUBLIC_EXPEDICAO_SERVICE_BASE",
    "NEXT_PUBLIC_OFICINA_SERVICE_BASE",
    "NEXT_PUBLIC_SAC_SERVICE_BASE",
    "NEXT_PUBLIC_SISTEMA_SERVICE_BASE",
    "NEXT_PUBLIC_METABASE_BASE",
    "NEXT_PUBLIC_QUALIDADE_API_BASE",
    "NEXT_PUBLIC_CALCULADORA_ST_BASE",
    "NEXT_PUBLIC_ATENDIMENTO_LOG_URL",
    "NEXT_PUBLIC_ANALISE_ESTOQUE_BASE",
    "NEXT_PUBLIC_FEED_SERVICE_BASE",
  ];

  services.forEach(key => {
    const val = process.env[key];
    const status = val ? `\x1b[32m${val}\x1b[0m` : '\x1b[31m(NÃO DEFINIDO)\x1b[0m';
    console.log(`✅  ${key.padEnd(35)}: ${status}`);
  });
  console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------\n');
}

export default nextConfig;
