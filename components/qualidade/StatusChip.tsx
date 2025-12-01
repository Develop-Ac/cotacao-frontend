'use client';

interface Props {
  label: string;
  color: string;
  background?: string;
}

export const StatusChip = ({ label, color, background }: Props) => {
  const isLong = label.length > 25;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-bold uppercase tracking-wide whitespace-nowrap ${isLong ? "text-[10px]" : "text-xs"
        }`}
      style={{ borderColor: color, color, backgroundColor: background ?? `${color}22` }}
    >
      {label}
    </span>
  );
};
