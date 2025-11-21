'use client';

import { ReactNode } from "react";
import { MdArrowBack } from "react-icons/md";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children?: ReactNode;
}

export const PageHeader = ({ title, subtitle, onBack, children }: Props) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6">
    <div className="flex items-start gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="h-11 w-11 rounded-2xl border border-slate-200 flex items-center justify-center text-[var(--primary-600)] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          aria-label="Voltar"
        >
          <MdArrowBack size={22} />
        </button>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
    </div>
    {children && <div className="flex flex-wrap gap-3">{children}</div>}
  </div>
);
