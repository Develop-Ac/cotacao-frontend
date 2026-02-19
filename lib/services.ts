type ServiceKey =
  | "compras"
  | "estoque"
  | "expedicao"
  | "oficina"
  | "sac"
  | "sistema"
  | "metabase"
  | "qualidade"
  | "calculadoraSt"
  | "atendimentoLog"
  | "analiseEstoque"
  | "feed";

const envNames: Record<ServiceKey, string> = {
  compras: "NEXT_PUBLIC_COMPRAS_SERVICE_BASE",
  estoque: "NEXT_PUBLIC_ESTOQUE_SERVICE_BASE",
  expedicao: "NEXT_PUBLIC_EXPEDICAO_SERVICE_BASE",
  oficina: "NEXT_PUBLIC_OFICINA_SERVICE_BASE",
  sac: "NEXT_PUBLIC_SAC_SERVICE_BASE",
  sistema: "NEXT_PUBLIC_SISTEMA_SERVICE_BASE",
  metabase: "NEXT_PUBLIC_METABASE_BASE",
  qualidade: "NEXT_PUBLIC_QUALIDADE_API_BASE",
  calculadoraSt: "NEXT_PUBLIC_CALCULADORA_ST_BASE",
  atendimentoLog: "NEXT_PUBLIC_ATENDIMENTO_LOG_URL",
  analiseEstoque: "NEXT_PUBLIC_ANALISE_ESTOQUE_BASE",
  feed: "NEXT_PUBLIC_FEED_SERVICE_BASE",
};

const sanitize = (value?: string | null) => value?.trim().replace(/\/+$/, "");

export const getServiceBase = (service: ServiceKey) => {
  const envName = envNames[service];
  const envValue = process.env[envName];
  return sanitize(envValue) || "";
};

const join = (base: string, path?: string) => {
  if (!path) return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
};

export const serviceUrl = (service: ServiceKey, path?: string) => join(getServiceBase(service), path);
