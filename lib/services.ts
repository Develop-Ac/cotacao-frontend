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

const sanitize = (value?: string | null) => value?.trim().replace(/\/+$/, "");

export const getServiceBase = (service: ServiceKey): string => {
  switch (service) {
    case "compras": return sanitize(process.env.NEXT_PUBLIC_COMPRAS_SERVICE_BASE) || "";
    case "estoque": return sanitize(process.env.NEXT_PUBLIC_ESTOQUE_SERVICE_BASE) || "";
    case "expedicao": return sanitize(process.env.NEXT_PUBLIC_EXPEDICAO_SERVICE_BASE) || "";
    case "oficina": return sanitize(process.env.NEXT_PUBLIC_OFICINA_SERVICE_BASE) || "";
    case "sac": return sanitize(process.env.NEXT_PUBLIC_SAC_SERVICE_BASE) || "";
    case "sistema": return sanitize(process.env.NEXT_PUBLIC_SISTEMA_SERVICE_BASE) || "";
    case "metabase": return sanitize(process.env.NEXT_PUBLIC_METABASE_BASE) || "";
    case "qualidade": return sanitize(process.env.NEXT_PUBLIC_QUALIDADE_API_BASE) || "";
    case "calculadoraSt": return sanitize(process.env.NEXT_PUBLIC_CALCULADORA_ST_BASE) || "";
    case "atendimentoLog": return sanitize(process.env.NEXT_PUBLIC_ATENDIMENTO_LOG_URL) || "";
    case "analiseEstoque": return sanitize(process.env.NEXT_PUBLIC_ANALISE_ESTOQUE_BASE) || "";
    case "feed": return sanitize(process.env.NEXT_PUBLIC_FEED_SERVICE_BASE) || "";
    default: return "";
  }
};

const join = (base: string, path?: string) => {
  if (!path) return base;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
};

export const serviceUrl = (service: ServiceKey, path?: string) => join(getServiceBase(service), path);
