type ServiceKey =
  | "compras"
  | "estoque"
  | "expedicao"
  | "oficina"
  | "sac"
  | "sistema"
  | "metabase"
  | "qualidade"
  | "atendimentoLog";

const FALLBACKS: Record<ServiceKey, string> = {
  compras: "http://compras-service.acacessorios.local",
  estoque: "http://estoque-service.acacessorios.local",
  expedicao: "http://expedicao-service.acacessorios.local",
  oficina: "http://oficina-service.acacessorios.local",
  sac: "http://sac-service.acacessorios.local",
  sistema: "http://sistema-service.acacessorios.local",
  metabase: "http://bi.acacessorios.local",
  qualidade: "http://garantia-service.acacessorios.local/api",
  atendimentoLog: "http://atendimento-log.acacessorios.com.br",
};

const envNames: Record<ServiceKey, string> = {
  compras: "NEXT_PUBLIC_COMPRAS_SERVICE_BASE",
  estoque: "NEXT_PUBLIC_ESTOQUE_SERVICE_BASE",
  expedicao: "NEXT_PUBLIC_EXPEDICAO_SERVICE_BASE",
  oficina: "NEXT_PUBLIC_OFICINA_SERVICE_BASE",
  sac: "NEXT_PUBLIC_SAC_SERVICE_BASE",
  sistema: "NEXT_PUBLIC_SISTEMA_SERVICE_BASE",
  metabase: "NEXT_PUBLIC_METABASE_BASE",
  qualidade: "NEXT_PUBLIC_QUALIDADE_API_BASE",
  atendimentoLog: "NEXT_PUBLIC_ATENDIMENTO_LOG_URL",
};

const sanitize = (value?: string | null) => value?.trim().replace(/\/+$/, "");

const serviceBases = Object.keys(FALLBACKS).reduce(
  (acc, key) => {
    const typed = key as ServiceKey;
    const envValue = process.env[envNames[typed]];
    acc[typed] = sanitize(envValue) || FALLBACKS[typed];
    return acc;
  },
  {} as Record<ServiceKey, string>,
);

const join = (base: string, path?: string) => {
  if (!path) return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
};

export const getServiceBase = (service: ServiceKey) => serviceBases[service];
export const serviceUrl = (service: ServiceKey, path?: string) => join(getServiceBase(service), path);
