import { getServiceBase } from "@/lib/services";

const fallbackApiBase = getServiceBase("qualidade");

const sanitize = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
};

export const QUALIDADE_API_BASE = sanitize(process.env.NEXT_PUBLIC_QUALIDADE_API_BASE) ?? fallbackApiBase;
export const QUALIDADE_EMAIL_SYNC_URL = process.env.NEXT_PUBLIC_QUALIDADE_EMAIL_SYNC_URL?.trim();
