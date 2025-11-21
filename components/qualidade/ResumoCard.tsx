'use client';

interface Props {
  label: string;
  value: string;
  highlight?: boolean;
}

export const ResumoCard = ({ label, value, highlight = false }: Props) => (
  <div
    className={`flex-1 rounded-2xl border p-4 ${highlight ? "bg-lime-50 border-lime-200" : "bg-slate-50 border-slate-200"}`}
  >
    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
    <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
  </div>
);
