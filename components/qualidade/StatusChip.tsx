'use client';

interface Props {
  label: string;
  color: string;
  background?: string;
}

export const StatusChip = ({ label, color, background }: Props) => (
  <span
    className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide"
    style={{ borderColor: color, color, backgroundColor: background ?? `${color}22` }}
  >
    {label}
  </span>
);
