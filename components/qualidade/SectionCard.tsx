'use client';

import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
}

export const SectionCard = ({ title, trailing, children }: Props) => (
  <section className="bg-white dark:bg-boxdark rounded-xl border border-gray-100 dark:border-strokedark p-5 shadow-sm">
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-lg font-bold text-primary dark:text-white">{title}</h2>
      {trailing}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);
