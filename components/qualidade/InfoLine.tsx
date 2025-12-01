'use client';

interface Props {
  label: string;
  value?: string | number | null;
}

export const InfoLine = ({ label, value }: Props) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-800 dark:text-white">{value ?? "—"}</span>
  </div>
);
