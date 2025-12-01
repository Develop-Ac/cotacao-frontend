'use client';

import { ReactNode } from "react";
import { MdClose } from "react-icons/md";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const widths: Record<NonNullable<Props["width"]>, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export const FormModal = ({ open, title, onClose, children, footer, width = "sm" }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full rounded-3xl bg-white dark:bg-boxdark shadow-2xl border border-gray-100 dark:border-strokedark py-6 pr-6 pl-8 ${widths[width]}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-gray-200 dark:border-strokedark flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
            aria-label="Fechar"
          >
            <MdClose size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-4 pr-1 py-1">{children}</div>
        </div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};
