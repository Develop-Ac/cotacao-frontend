'use client';

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { NovaGarantiaForm } from "@/components/qualidade/NovaGarantiaForm";

export default function NovaGarantiaPage() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Nova Garantia" subtitle="Registre rapidamente uma nova ocorrência" onBack={() => router.back()} />
      <NovaGarantiaForm variant="page" />
    </div>
  );
}
