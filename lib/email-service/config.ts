const sanitize = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
};

export const EMAIL_SERVICE_API_BASE =
  sanitize(process.env.NEXT_PUBLIC_EMAIL_SERVICE_API_BASE) ??
  sanitize(process.env.NEXT_PUBLIC_QUALIDADE_API_BASE) ??
  "";
