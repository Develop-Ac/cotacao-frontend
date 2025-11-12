"use client";

import {
  FaSync,
  FaCaretDown,
} from "react-icons/fa";
import { FaFilePdf } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";

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

const API_BASE = "http://intranetbackend.acacessorios.local/compras/nota-fiscal/nfe-distribuicao";

export default function NotaFiscalList() {
  const BTN =
    "h-12 px-4 inline-flex items-center justify-center gap-2 rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  const BTN_SQUARE =
    "h-10 w-10 md:h-12 md:w-12 inline-flex items-center justify-center rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

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
        } catch {}
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
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Notas Fiscais Distribuição</h3>
          <div className="flex items-center gap-2">
            {/* Recarregar */}
            <button className={BTN_SQUARE} onClick={fetchAll} disabled={loading} title="Recarregar do servidor">
              <FaSync className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Listagem */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* PageSize dropdown */}
              <div className="flex items-center justify-end mb-4">
                <div className="relative" ref={pageSizeRef}>
                  <button
                    className={BTN}
                    aria-haspopup="listbox"
                    aria-expanded={pageSizeOpen}
                    onClick={() => setPageSizeOpen((v) => !v)}
                  >
                    <span className="mr-1">{pageSize}</span>
                    <FaCaretDown />
                  </button>
                  {pageSizeOpen && (
                    <div className="absolute right-0 mt-2 w-28 bg-white border rounded shadow z-10" role="listbox" tabIndex={-1}>
                      {pageSizes.map((n) => (
                        <button
                          key={n}
                          role="option"
                          aria-selected={pageSize === (n as 10 | 20 | 50)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                            pageSize === n ? "bg-gray-50 font-semibold" : ""
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
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="p-2 text-start">Empresa</th>
                      <th className="p-2 text-start">Chave NFe</th>
                      <th className="p-2 text-start">CPF/CNPJ Emitente</th>
                      <th className="p-2 text-start">Nome Emitente</th>
                      <th className="p-2 text-start">RG/IE Emitente</th>
                      <th className="p-2 text-start">Data Emissão</th>
                      <th className="p-2 text-start">Tipo Operação</th>
                      <th className="p-2 text-start">Tipo Operação Desc</th>
                      <th className="p-2 text-center">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, idx) => (
                      <tr key={row.CHAVE_NFE ?? idx} className="border-t">
                        <td className="p-4">{row.EMPRESA}</td>
                        <td className="p-4">{row.CHAVE_NFE}</td>
                        <td className="p-4">{row.CPF_CNPJ_EMITENTE}</td>
                        <td className="p-4">{row.NOME_EMITENTE}</td>
                        <td className="p-4">{row.RG_IE_EMITENTE}</td>
                        <td className="p-4">{fmtDate(row.DATA_EMISSAO)}</td>
                        <td className="p-4">{row.TIPO_OPERACAO}</td>
                        <td className="p-4">{row.TIPO_OPERACAO_DESC}</td>
                        <td className="p-4 text-center">
                          <button
                            className={BTN_SQUARE}
                            title="Baixar PDF DANFE"
                            onClick={async () => {
                              try {
                                const res = await fetch(`http://intranetbackend.acacessorios.local/compras/nota-fiscal/danfe?chaveNfe=${row.CHAVE_NFE}`, {
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
                            <FaFilePdf />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && paged.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-gray-500">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                    {loading && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-gray-500">
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
                    className={BTN}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    Anterior
                  </button>
                  <button
                    className={BTN}
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
