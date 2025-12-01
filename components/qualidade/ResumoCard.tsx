'use client';

interface Props {
  label: string;
  value: string;
  highlight?: boolean;
}

export const ResumoCard = ({ label, value, highlight = false }: Props) => (
  <div
    className={`flex-1 rounded-2xl border p-4 ${highlight
        ? "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800"
        : "bg-gray-50 dark:bg-meta-4 border-gray-200 dark:border-strokedark"
      }`}
  >
    <p className={`text-xs uppercase tracking-wide font-semibold ${highlight ? "text-lime-700 dark:text-lime-400" : "text-gray-500 dark:text-gray-400"}`}>{label}</p>
    <p className={`text-lg font-bold mt-1 ${highlight ? "text-lime-900 dark:text-white" : "text-gray-900 dark:text-white"}`}>{value}</p>
  </div>
);
