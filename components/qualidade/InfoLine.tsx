'use client';

interface Props {
  label: string;
  value?: string | number | null;
}

export const InfoLine = ({ label, value }: Props) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-slate-800">{value ?? "—"}</span>
  </div>
);
