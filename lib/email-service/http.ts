import { EMAIL_SERVICE_API_BASE } from "./config";

const withBase = (path: string): string => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!EMAIL_SERVICE_API_BASE) {
    throw new Error("Variavel NEXT_PUBLIC_EMAIL_SERVICE_API_BASE nao configurada.");
  }
  return `${EMAIL_SERVICE_API_BASE}${normalized}`;
};

export const emailApiFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(withBase(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = await response.clone().json();
      if (payload?.message) {
        detail = String(payload.message);
      }
    } catch {
      // noop
    }
    throw new Error(detail);
  }

  return response;
};

export const toQueryString = (params: Record<string, unknown>): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    query.set(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : "";
};
