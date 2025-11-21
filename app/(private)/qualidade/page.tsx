'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAddCircleOutline, MdMailOutline, MdRefresh, MdSearch, MdFilterList } from "react-icons/md";
import { QualidadeApi } from "@/lib/qualidade/api";
import { Garantia } from "@/lib/qualidade/types";
import { STATUS_FLOW } from "@/lib/qualidade/status";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { GarantiaCard } from "@/components/qualidade/GarantiaCard";
import { StatusChip } from "@/components/qualidade/StatusChip";
import { FormModal } from "@/components/qualidade/FormModal";
import { NovaGarantiaForm } from "@/components/qualidade/NovaGarantiaForm";

export default function QualidadeHome() {
  const router = useRouter();
  const [items, setItems] = useState<Garantia[]>([]);
  const [filtered, setFiltered] = useState<Garantia[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [novaGarantiaOpen, setNovaGarantiaOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const carregar = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await QualidadeApi.listarGarantias();
      setItems(
        [...data].sort((a, b) => {
          if (a.temNovaInteracao && !b.temNovaInteracao) return -1;
          if (!a.temNovaInteracao && b.temNovaInteracao) return 1;
          return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar garantias.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleNovaGarantiaSuccess = useCallback(() => {
    setNovaGarantiaOpen(false);
    carregar();
  }, [carregar]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const termo = search.trim().toLowerCase();
    const list = items.filter((item) => {
      const text = `${item.nomeFornecedor} ${item.notaInterna} ${item.nfsCompra ?? ""}`.toLowerCase();
      const textMatch = termo.length === 0 || text.includes(termo);
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.status);
      return textMatch && statusMatch;
    });
    setFiltered(list);
  }, [items, search, statusFilter]);

  useEffect(() => {
    const handleClick = (evt: MouseEvent) => {
      if (!dropdownRef.current?.contains(evt.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [dropdownOpen]);

  const toggleStatus = (code: number) => {
    setStatusFilter((prev) => (prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]));
  };

  const statusLabel = useMemo(() => {
    if (statusFilter.length === 0) return "Todos os status";
    if (statusFilter.length === 1) return "1 selecionado";
    return `${statusFilter.length} selecionados`;
  }, [statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <FormModal
        open={novaGarantiaOpen}
        title="Nova Garantia"
        onClose={() => setNovaGarantiaOpen(false)}
        width="lg"
      >
        <NovaGarantiaForm
          variant="modal"
          onSuccess={handleNovaGarantiaSuccess}
          onCancel={() => setNovaGarantiaOpen(false)}
        />
      </FormModal>
      <PageHeader title="Central de Garantias" subtitle="Monitoramento em tempo real dos processos">
        <ActionButton
          label="Nova Garantia"
          icon={<MdAddCircleOutline size={18} />}
          shape="rounded"
          onClick={() => setNovaGarantiaOpen(true)}
        />
        <ActionButton
          label="e-mail"
          variant="ghost"
          icon={<MdMailOutline size={18} />}
          shape="rounded"
          onClick={() => router.push("/qualidade/caixa")}
        />
      </PageHeader>

      <div
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
        ref={dropdownRef}
      >
        <div className="flex flex-wrap gap-4">
          <label className="flex-1 min-w-[240px] relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por fornecedor, NI ou NF"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:border-[var(--primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <MdFilterList size={18} />
              <span>{statusLabel}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto z-10">
                {STATUS_FLOW.map((status) => (
                  <label
                    key={status.code}
                    className="flex items-center justify-between px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <span className="flex-1">{status.label}</span>
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status.code)}
                      onChange={() => toggleStatus(status.code)}
                      className="h-4 w-4 accent-[var(--primary-600)]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <ActionButton
            label="Atualizar"
            icon={<MdRefresh size={18} />}
            variant="ghost"
            onClick={carregar}
            loading={refreshing}
            className="rounded-xl px-4 py-2.5"
          />
        </div>
        {statusFilter.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {statusFilter.map((code) => {
              const status = STATUS_FLOW.find((item) => item.code === code);
              if (!status) return null;
              return (
                <StatusChip
                  key={code}
                  label={status.label}
                  color={status.color}
                  background={status.background}
                />
              );
            })}
            <button
              type="button"
              onClick={() => setStatusFilter([])}
              className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
              Limpar filtros
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-900">Nenhuma garantia encontrada</p>
            <p className="text-sm text-slate-500 mt-2">Ajuste os filtros ou tente atualizar a lista.</p>
          </div>
        ) : (
          filtered.map((garantia) => (
            <GarantiaCard key={garantia.id} garantia={garantia} onClick={() => router.push(`/qualidade/${garantia.id}`)} />
          ))
        )}
      </div>
    </div>
  );
}
