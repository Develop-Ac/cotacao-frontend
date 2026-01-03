"use client";

import {
  FaSync,
  FaCaretDown,
  FaFilePdf,
  FaCalculator,
  FaCheckSquare,
  FaSquare
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { serviceUrl } from "@/lib/services";
import { NotaFiscalRow, StCalculationResult } from "@/types/icms";
import StCalculationResults from "./components/StCalculationResults";
import UnmatchedSelection from "./components/UnmatchedSelection";

// ===============================
// Constants
// ===============================
const COMPRAS_BASE = serviceUrl("compras");
const SERVICE_URL = serviceUrl("calculadoraSt");
const API_BASE = `${SERVICE_URL}/icms/nfe-distribuicao`;
const CALCULATE_ENDPOINT = `${SERVICE_URL}/icms/calculate`;
const DANFE_ENDPOINT = `${SERVICE_URL}/icms/danfe`;

export default function NotaFiscalList() {
  // Paginação no front
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Dados e estado
  const [items, setItems] = useState<NotaFiscalRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection
  const [selectedChaves, setSelectedChaves] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<StCalculationResult[] | null>(null);

  // Persistence State
  const [statusMap, setStatusMap] = useState<Record<string, { status: string, valor: number }>>({});

  // Flow State
  const [viewState, setViewState] = useState<'LIST' | 'UNMATCHED_SELECTION' | 'RESULTS'>('LIST');
  const [tempResults, setTempResults] = useState<{ matched: StCalculationResult[], unmatched: StCalculationResult[] } | null>(null);

  // Filters
  const [dataSource, setDataSource] = useState<'DATABASE' | 'UPLOAD'>('DATABASE');
  const [showLaunched, setShowLaunched] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

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
  const fetchAll = useCallback(async () => {
    if (dataSource === 'UPLOAD') return; // Don't fetch if in upload mode

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

      if (Array.isArray(json)) {
        setItems(json as NotaFiscalRow[]);
      } else if (json && typeof json === "object") {
        setItems([json as NotaFiscalRow]);
      } else {
        setItems([]);
      }

      // Fetch Status Map too
      fetch(`${SERVICE_URL}/icms/payment-status`)
        .then(r => r.json())
        .then(map => setStatusMap(map))
        .catch(console.error);

    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao carregar notas fiscais:", msg);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [dataSource]);

  // carrega ao montar
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // paginação no front
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      // Filter by Launched Status
      if (!showLaunched && i.STATUS_ERP === 'LANCADA') return false;

      // Filter by Date
      if (!dateRange.start && !dateRange.end) return true;
      const d = new Date(i.DATA_EMISSAO);
      if (dateRange.start && d < new Date(dateRange.start)) return false;
      if (dateRange.end && d > new Date(dateRange.end)) return false;
      return true;
    });
  }, [items, showLaunched, dateRange]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize); // Paginate filteredItems
  }, [filteredItems, page, pageSize]);

  const pageSizes: (10 | 20 | 50)[] = [10, 20, 50];

  // Helper para data
  const fmtDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  // --- SELETION LOGIC ---
  const toggleSelect = (chave: string) => {
    const next = new Set(selectedChaves);
    if (next.has(chave)) next.delete(chave);
    else next.add(chave);
    setSelectedChaves(next);
  };

  const toggleSelectAll = () => {
    if (selectedChaves.size === paged.length && paged.length > 0) {
      setSelectedChaves(new Set());
    } else {
      const next = new Set<string>();
      paged.forEach(r => next.add(r.CHAVE_NFE));
      setSelectedChaves(next);
    }
  };

  const isAllSelected = paged.length > 0 && paged.every(r => selectedChaves.has(r.CHAVE_NFE));

  // --- UPLOAD LOGIC ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setLoading(true);
    // Placeholder logic for now
    // In real impl, we would read files, parse XML, and populate 'items'
    // simulating the structure from DB.
    setTimeout(() => {
      setItems([]); // Clear DB items
      // Parse logic here...
      alert("Mock: Arquivos carregados logicamente (Feature em dev)");
      setLoading(false);
      setDataSource('UPLOAD');
    }, 1000);
  };

  // --- CALCULATION LOGIC ---
  const handleCalculate = async () => {
    setAnalyzing(true);
    try {
      const selectedRows = items.filter(r => selectedChaves.has(r.CHAVE_NFE));
      const xmls = selectedRows.map(r => r.XML_COMPLETO).filter(Boolean) as string[];

      if (xmls.length === 0) {
        alert("Nenhum XML disponível para as notas selecionadas.");
        setAnalyzing(false);
        return;
      }

      const res = await fetch(CALCULATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ xmls })
      });

      if (!res.ok) throw new Error("Erro ao calcular.");

      const allData: StCalculationResult[] = await res.json();

      // Ensure we trim to avoid whitespace issues
      const matched = allData.filter(r => r.matchType && r.matchType !== 'Não Encontrado');
      const unmatched = allData.filter(r => !r.matchType || r.matchType === 'Não Encontrado');

      if (unmatched.length > 0) {
        setTempResults({ matched, unmatched });
        setViewState('UNMATCHED_SELECTION');
      } else {
        setResults(matched);
        setViewState('RESULTS');
      }

    } catch (e) {
      console.error(e);
      alert("Erro ao calcular.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmUnmatched = (selectedIndices: Set<number>) => {
    if (!tempResults) return;

    const selectedUnmatched = tempResults.unmatched.filter((_, idx) => selectedIndices.has(idx));
    const finalResults = [...tempResults.matched, ...selectedUnmatched];

    setResults(finalResults);
    setViewState('RESULTS');
  };

  const handleBackToList = () => {
    setResults(null);
    setTempResults(null);
    setViewState('LIST');
  };

  // --- DOWNLOAD PDF LOGIC ---
  const handleDownloadPdf = async (row: NotaFiscalRow) => {
    if (!row.XML_COMPLETO) {
      alert("XML não disponível para esta nota.");
      return;
    }
    try {
      const res = await fetch(DANFE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xml: row.XML_COMPLETO })
      });
      if (!res.ok) throw new Error("Erro ao gerar PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DANFE_${row.CHAVE_NFE}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erro ao baixar PDF. Verifique o console.");
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      {/* Header visible only in LIST or maybe always? keeping explicit for now */}
      {viewState === 'LIST' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h3 className="text-2xl font-semibold mb-1 text-black dark:text-white">ICMS ST - Portaria 195/2019</h3>
            <p className="text-sm text-gray-500">Conciliação de Notas Fiscais e Cálculo de Guia Complementar</p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="flex bg-gray-100 dark:bg-meta-4 rounded-lg p-1 mr-4">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dataSource === 'DATABASE' ? 'bg-white shadow text-primary dark:bg-boxdark dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => { setDataSource('DATABASE'); fetchAll(); }}
              >
                Banco de Dados
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dataSource === 'UPLOAD' ? 'bg-white shadow text-primary dark:bg-boxdark dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Upload XML
                <input type="file" id="file-upload" multiple accept=".xml" className="hidden" onChange={handleFileUpload} />
              </button>
            </div>

            {selectedChaves.size > 0 && (
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
                onClick={handleCalculate}
                disabled={analyzing}
              >
                <FaCalculator size={16} />
                <span>Calcular ({selectedChaves.size})</span>
              </button>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-300 mr-4">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showLaunched}
                  onChange={e => setShowLaunched(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${showLaunched ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showLaunched ? 'transform translate-x-4' : ''}`}></div>
              </div>
              Exibir Lançadas
            </label>

            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-gray-700 border border-gray-200 hover:text-primary hover:border-primary shadow-sm transition-all active:scale-95 disabled:opacity-50 dark:bg-meta-4 dark:text-white dark:border-strokedark dark:hover:border-primary"
              onClick={fetchAll}
              disabled={loading || dataSource === 'UPLOAD'}
              title="Recarregar do servidor"
            >
              <FaSync className={loading ? "animate-spin" : ""} size={18} />
            </button>
          </div>
        </div>
      )}

      <div id="list">
        <div className="w-full">
          {viewState === 'LIST' && (
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {dataSource === 'DATABASE' ? 'Notas Recentes (Entrada Própria)' : 'Arquivos Carregados'}
                </div>
                <div className="relative" ref={pageSizeRef}>
                  <button
                    className="h-10 border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white flex items-center gap-2"
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
                          className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${pageSize === n ? "bg-gray-50 font-semibold" : ""}`}
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

              <div className="max-w-full overflow-x-auto border border-stroke dark:border-strokedark rounded-lg">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 text-left dark:bg-meta-4">
                      <th className="py-3 px-4 w-[50px] text-center">
                        <button onClick={toggleSelectAll} className="text-gray-600 dark:text-gray-300 hover:text-blue-600">
                          {isAllSelected ? <FaCheckSquare /> : <FaSquare />}
                        </button>
                      </th>
                      <th className="min-w-[140px] py-3 px-4 text-xs font-medium text-black dark:text-white">Status</th>
                      <th className="min-w-[100px] py-3 px-4 text-xs font-medium text-black dark:text-white text-right">Valor Guia</th>
                      <th className="w-[140px] py-3 px-4 text-xs font-medium text-black dark:text-white whitespace-nowrap">Chave NFe</th>
                      <th className="w-[300px] py-3 px-4 text-xs font-medium text-black dark:text-white">Emitente</th>
                      <th className="w-[100px] py-3 px-4 text-xs font-medium text-black dark:text-white">Data</th>
                      <th className="w-[90px] py-3 px-4 text-xs font-medium text-black dark:text-white">Situação</th>
                      <th className="w-[90px] py-3 px-4 text-xs font-medium text-black dark:text-white">Operação</th>
                      <th className="py-3 px-4 text-xs font-medium text-black dark:text-white text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row, idx) => {
                      const isSelected = selectedChaves.has(row.CHAVE_NFE);
                      return (
                        <tr key={row.CHAVE_NFE ?? idx} className={`border-b border-stroke dark:border-strokedark transition-colors ${isSelected ? 'bg-blue-50 dark:bg-opacity-10' : 'hover:bg-gray-50 dark:hover:bg-meta-4'}`}>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => toggleSelect(row.CHAVE_NFE)} className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                              {isSelected ? <FaCheckSquare /> : <FaSquare />}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {statusMap[row.CHAVE_NFE] ? (
                              <span title={statusMap[row.CHAVE_NFE].status} className={`inline-block px-2 py-1 text-xs rounded-full cursor-help 
                                        ${statusMap[row.CHAVE_NFE].status.includes('Tem Guia') ? 'bg-red-100 text-red-700' :
                                  statusMap[row.CHAVE_NFE].status.includes('Tributado') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {statusMap[row.CHAVE_NFE].status.includes('Tem Guia') ? '⚠️ Tem Guia' :
                                  statusMap[row.CHAVE_NFE].status.includes('Tributado') ? '⚪ Tributado' : '⚪ Verificado'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {statusMap[row.CHAVE_NFE] && statusMap[row.CHAVE_NFE].valor > 0 ? (
                              <span className="text-xs font-mono text-red-600 font-bold">
                                R$ {statusMap[row.CHAVE_NFE].valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <h5 className="text-xs font-medium text-black dark:text-white font-mono whitespace-nowrap">{row.CHAVE_NFE}</h5>
                            {row.VALOR_TOTAL ? <div className="text-xs text-green-600 mt-1">R$ {row.VALOR_TOTAL.toFixed(2)}</div> : null}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-black dark:text-white font-semibold whitespace-normal leading-tight">{row.NOME_EMITENTE}</p>
                            <p className="text-xs text-gray-500">{row.CPF_CNPJ_EMITENTE}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-black dark:text-white">{fmtDate(row.DATA_EMISSAO)}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center px-2 py-1 min-w-[80px] rounded-md text-xs font-semibold border ${row.STATUS_ERP === 'LANCADA' ? 'bg-purple-600/10 text-purple-600 border-purple-600/20' : 'bg-yellow-600/10 text-yellow-600 border-yellow-600/20'}`}>
                              {row.STATUS_ERP === 'LANCADA' ? 'LANÇADA' : 'PENDENTE'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center px-2 py-1 min-w-[100px] rounded-md text-xs font-semibold border ${row.TIPO_OPERACAO === 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                              {row.TIPO_OPERACAO_DESC}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center flex justify-center gap-2">
                            <button onClick={() => handleDownloadPdf(row)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400" title="Baixar PDF DANFE"><FaFilePdf className="w-5 h-5" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && paged.length === 0 && (
                      <tr><td colSpan={9} className="py-5 px-4 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                    )}
                    {loading && (
                      <tr><td colSpan={9} className="py-5 px-4 text-center text-gray-500">Carregando...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">Total: <b>{total}</b> · Página <b>{page}</b> de <b>{totalPages}</b></div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border hover:bg-gray-50 rounded" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
                  <button className="px-3 py-1.5 border hover:bg-gray-50 rounded" onClick={() => setPage(p => (p < totalPages ? p + 1 : p))} disabled={page >= totalPages}>Próxima</button>
                </div>
              </div>
            </div>
          )}

          {viewState === 'UNMATCHED_SELECTION' && tempResults && (
            <UnmatchedSelection
              unmatchedItems={tempResults.unmatched}
              onConfirm={handleConfirmUnmatched}
              onCancel={handleBackToList}
            />
          )}

          {viewState === 'RESULTS' && results && (
            <StCalculationResults results={results} originalItems={items} selectedInvoices={selectedChaves} onBack={handleBackToList} />
          )}
        </div>
      </div>
    </div>
  );
}