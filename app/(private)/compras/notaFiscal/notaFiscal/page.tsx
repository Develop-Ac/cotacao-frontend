"use client";

import {
  FaSync,
  FaCaretDown,
} from "react-icons/fa";
import { FaFilePdf } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";
import { serviceUrl } from "@/lib/services";

// ===============================
// Tipos esperados da API
// ===============================
type NotaFiscalRow = {
  EMPRESA: number;
  CHAVE_NFE: string;
  CPF_CNPJ_EMITENTE: string;
  NOME_EMITENTE: string;
  RG_IE_EMITENTE: string;
  DATA_EMISSAO: string; // ISO
  TIPO_OPERACAO: number;
  TIPO_OPERACAO_DESC: string;
};

const COMPRAS_BASE = serviceUrl("compras");
const API_BASE = `${COMPRAS_BASE}/compras/nota-fiscal/nfe-distribuicao`;
const DANFE_ENDPOINT = `${COMPRAS_BASE}/compras/nota-fiscal/danfe`;

export default function NotaFiscalList() {
  // Removed custom button constants to use standard classes


  // Paginação no front
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Dados e estado
  const [items, setItems] = useState<NotaFiscalRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Dropdown PageSize
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement | null>(null);

  // Abort para evitar race-condition ao recarregar tudo
  const abortRef = useRef<AbortController | null>(null);

  // Fecha o dropdown ao clicar fora / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!pageSizeRef.current) return;
      if (!pageSizeRef.current.contains(e.target as Node)) {
        setPageSizeOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPageSizeOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // ---------- CARREGAMENTO ----------
  const fetchAll = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
        } catch { }
        throw new Error(msg);
      }

      const json: unknown = await res.json();

      // Se vier array simples, beleza — já temos tudo
      if (Array.isArray(json)) {
        setItems(json as NotaFiscalRow[]);
      } else if (json && typeof json === "object") {
        setItems([json as NotaFiscalRow]);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao carregar notas fiscais:", msg);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // carrega ao montar
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // paginação no front
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const pageSizes: (10 | 20 | 50)[] = [10, 20, 50];

  // Helper para data
  const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  return (
    <div className="main-panel min-h-screen text-black dark:text-white">
      <div className="content-wrapper p-2">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0 text-black dark:text-white">Notas Fiscais Distribuição</h3>
          <div className="flex items-center gap-2">
            {/* Recarregar */}
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 dark:bg-meta-4 dark:text-white dark:border-strokedark"
              onClick={fetchAll}
              disabled={loading}
              title="Recarregar do servidor"
            >
              <FaSync className={loading ? "animate-spin" : ""} size={18} />
              <span className="text-sm font-medium hidden md:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Listagem */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark">
              {/* PageSize dropdown */}
              <div className="flex items-center justify-end mb-4">
                <div className="relative" ref={pageSizeRef}>
                  <button
                    className="h-10 border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white flex items-center gap-2"
                    aria-haspopup="listbox"
                    aria-expanded={pageSizeOpen}
                    onClick={() => setPageSizeOpen((v) => !v)}
                  >
                    <span className="mr-1">{pageSize} itens</span>
                    <FaCaretDown />
                  </button>
                  {pageSizeOpen && (
                    <div className="absolute right-0 mt-2 w-28 bg-white border rounded shadow z-10" role="listbox" tabIndex={-1}>
                      {pageSizes.map((n) => (
                        <button
                          key={n}
                          role="option"
                          aria-selected={pageSize === (n as 10 | 20 | 50)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${pageSize === n ? "bg-gray-50 font-semibold" : ""
                            }`}
                          onClick={() => {
                            setPageSize(n as 10 | 20 | 50);
                            setPage(1);
                            setPageSizeOpen(false);
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Info topo */}
              <div className="text-sm text-gray-600 mb-2">
                Registros carregados: <b>{items.length}</b>
              </div>

              {/* Tabela */}
              <div className="max-w-full overflow-x-auto border border-stroke dark:border-strokedark rounded-lg">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 text-left dark:bg-meta-4">
                      <th className="min-w-[150px] py-3 px-4 text-sm font-medium text-black dark:text-white xl:pl-11">
                        Chave NFe
                      </th>
                      <th className="min-w-[150px] py-3 px-4 text-sm font-medium text-black dark:text-white">
                        CPF/CNPJ Emitente
                      </th>
                      <th className="min-w-[150px] py-3 px-4 text-sm font-medium text-black dark:text-white">
                        Nome Emitente
                      </th>
                      <th className="min-w-[120px] py-3 px-4 text-sm font-medium text-black dark:text-white">
                        RG/IE Emitente
                      </th>
                      <th className="min-w-[120px] py-3 px-4 text-sm font-medium text-black dark:text-white">
                        Data Emissão
                      </th>
                      <th className="min-w-[120px] py-3 px-4 text-sm font-medium text-black dark:text-white">
                        Tipo Operação Desc
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-black dark:text-white text-center">
                        PDF
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, idx) => (
                      <tr key={row.CHAVE_NFE ?? idx} className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                        <td className="py-3 px-4 pl-9 xl:pl-11">
                          <h5 className="text-sm font-medium text-black dark:text-white">
                            {row.CHAVE_NFE}
                          </h5>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-black dark:text-white">
                            {row.CPF_CNPJ_EMITENTE}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-black dark:text-white">
                            {row.NOME_EMITENTE}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-black dark:text-white">
                            {row.RG_IE_EMITENTE}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-black dark:text-white">
                            {fmtDate(row.DATA_EMISSAO)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-black dark:text-white">
                            {row.TIPO_OPERACAO_DESC}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Baixar PDF DANFE"
                            onClick={async () => {
                              try {
                                const res = await fetch(`${DANFE_ENDPOINT}?chaveNfe=${row.CHAVE_NFE}`, {
                                  method: "GET",
                                  headers: { Accept: "application/pdf" },
                                });
                                if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `danfe-${row.CHAVE_NFE}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              } catch (e) {
                                alert("Falha ao baixar PDF DANFE");
                              }
                            }}
                          >
                            <FaFilePdf className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && paged.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-5 px-4 text-center text-gray-500 dark:text-gray-400">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                    {loading && (
                      <tr>
                        <td colSpan={7} className="py-5 px-4 text-center text-gray-500 dark:text-gray-400">
                          Carregando...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação (front) */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Total: <b>{items.length}</b> · Página <b>{page}</b> de <b>{totalPages}</b>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    Anterior
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                    disabled={page >= totalPages || loading}
                  >
                    Próxima
                  </button>
                </div>
              </div>
              {/* /Paginação */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
