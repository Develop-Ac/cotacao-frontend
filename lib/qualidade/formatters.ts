const dateFormatter = new Intl.DateTimeFormat("pt-BR");
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const relativeFmt = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export const formatDate = (value?: string | null): string => {
  if (!value) return "--";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "--" : dateFormatter.format(d);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "--";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "--" : dateTimeFormatter.format(d);
};

export const formatCurrency = (value?: number | null): string => {
  if (value == null) return "--";
  return currencyFormatter.format(value);
};

export const relativeTimeFromNow = (value?: string | null): string => {
  if (!value) return "";
  const now = Date.now();
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "";
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return relativeFmt.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFmt.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return relativeFmt.format(diffDays, "day");
  }
  const diffMonths = Math.round(diffDays / 30);
  return relativeFmt.format(diffMonths, "month");
};

export const stripHtml = (value?: string | null): string =>
  (value ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

export const parseCurrencyInput = (value: string): number | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const parseBrDate = (value: string): Date | null => {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};
