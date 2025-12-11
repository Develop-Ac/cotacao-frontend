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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    const termo = search.trim().toLowerCase();
    const list = items.filter((item) => {
      const text = `${item.nomeFornecedor} ${item.notaInterna} ${item.nfsCompra ?? ""}`.toLowerCase();
      const textMatch = termo.length === 0 || text.includes(termo);
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(item.status);
      return textMatch && statusMatch;
    });
    setFiltered(list);
    setPage(1); // Reset page on filter change
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
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white">
            <a href="/" className="hover:text-primary transition-colors">Intranet</a> / Central de Garantias
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitoramento dos processos
          </p>
        </div>

        <div className="flex gap-3">
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
        </div>
      </div>

      <div
        className="bg-white dark:bg-boxdark rounded-xl border border-gray-100 dark:border-strokedark p-5 shadow-sm space-y-4"
        ref={dropdownRef}
      >
        <div className="flex flex-wrap gap-4">
          <label className="flex-1 min-w-[240px] relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por fornecedor, NI ou NF"
              className="w-full rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
            />
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-form-strokedark px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 bg-white dark:bg-form-input"
            >
              <MdFilterList size={18} />
              <span>{statusLabel}</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark shadow-lg max-h-80 overflow-y-auto z-10">
                {STATUS_FLOW.map((status) => (
                  <label
                    key={status.code}
                    className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer"
                  >
                    <span className="flex-1">{status.label}</span>
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status.code)}
                      onChange={() => toggleStatus(status.code)}
                      className="h-4 w-4 accent-primary rounded border-gray-300"
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
            className="rounded-lg px-4 py-2.5"
          />
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500 dark:text-gray-400">Itens por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
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
              className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
            >
              Limpar filtros
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-48 rounded-xl bg-white dark:bg-boxdark border border-gray-100 dark:border-strokedark animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark p-12 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Nenhuma garantia encontrada</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ajuste os filtros ou tente atualizar a lista.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice((page - 1) * pageSize, page * pageSize).map((garantia) => (
              <GarantiaCard key={garantia.id} garantia={garantia} onClick={() => router.push(`/qualidade/${garantia.id}`)} />
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-strokedark">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando página <span className="font-semibold text-black dark:text-white">{page}</span> de <span className="font-semibold text-black dark:text-white">{Math.ceil(filtered.length / pageSize)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.ceil(filtered.length / pageSize)) }, (_, i) => {
                const totalPages = Math.ceil(filtered.length / pageSize);
                let pNum = page;
                if (totalPages <= 5) {
                  pNum = i + 1;
                } else if (page <= 3) {
                  pNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pNum = totalPages - 4 + i;
                } else {
                  pNum = page - 2 + i;
                }

                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${page === pNum
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4"
                      }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page === Math.ceil(filtered.length / pageSize)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>

  );
}
