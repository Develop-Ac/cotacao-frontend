"use client";

import {
  FaSync,
  FaCaretDown,
  FaFilePdf,
  FaCalculator,
  FaCheckSquare,
  FaSquare,
  FaSearch,
  FaFilter
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
const LAUNCHED_SYNC_ENDPOINT = `${SERVICE_URL}/icms/nfe-lancadas/sync`;
const CALCULATE_ENDPOINT = `${SERVICE_URL}/icms/calculate`;
const DANFE_ENDPOINT = `${SERVICE_URL}/icms/danfe`;

const toInputDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function NotaFiscalList() {
  const router = useRouter();

  // Paginação no front
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Dados e estado
  const [items, setItems] = useState<NotaFiscalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [confirmSyncModalOpen, setConfirmSyncModalOpen] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    status: 'running' | 'completed' | 'failed';
    totalEncontradas: number;
    processadas: number;
    inseridas: number;
    ignoradas: number;
    progresso: number;
    logs: string[];
    errorMessage?: string;
  } | null>(null);

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
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90);
    return {
      start: toInputDate(start),
      end: toInputDate(end),
    };
  });

  // New Filters
  const [filterNumero, setFilterNumero] = useState("");
  const [filterEmitente, setFilterEmitente] = useState("");
  const [filterImposto, setFilterImposto] = useState("");
  const [filterEstado, setFilterEstado] = useState<"TODOS" | "DENTRO" | "FORA">("TODOS");
  const [filterModelo, setFilterModelo] = useState<"55" | "TODOS">("55");

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
    if (dataSource === 'UPLOAD') {
      fetch(`${SERVICE_URL}/icms/payment-status`)
        .then(r => r.json())
        .then(map => setStatusMap(map))
        .catch(console.error);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set("start", dateRange.start);
      if (dateRange.end) params.set("end", dateRange.end);
      const endpoint = params.toString() ? `${API_BASE}?${params.toString()}` : API_BASE;

      const res = await fetch(endpoint, {
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
  }, [dataSource, dateRange.start, dateRange.end]);

  // carrega ao montar
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // paginação no front
  const filteredItems = useMemo(() => {
    let filtered = items.filter(i => {
      // Filter by Launched Status
      if (!showLaunched && i.STATUS_ERP === 'LANCADA') return false;

      // Filter by Date
      if (!dateRange.start && !dateRange.end) return true;
      const d = new Date(i.DATA_EMISSAO);
      if (dateRange.start) {
        const startDate = new Date(`${dateRange.start}T00:00:00`);
        if (d < startDate) return false;
      }
      if (dateRange.end) {
        const endDate = new Date(`${dateRange.end}T23:59:59.999`);
        if (d > endDate) return false;
      }
      return true;
    });

    if (filterModelo !== 'TODOS') {
      filtered = filtered.filter(i => {
        const chave = i.CHAVE_NFE || '';
        // Modelo do documento na chave de acesso (posições 21-22, 1-based)
        const modelo = chave.length >= 22 ? chave.substring(20, 22) : '';
        return modelo === filterModelo;
      });
    }

    if (filterEstado !== 'TODOS') {
      filtered = filtered.filter(i => {
        const ufEmitente = i.CHAVE_NFE?.slice(0, 2) || '';
        const dentroMt = ufEmitente === '51';
        return filterEstado === 'DENTRO' ? dentroMt : !dentroMt;
      });
    }

    if (filterNumero) {
      filtered = filtered.filter(i => {
        const num = i.CHAVE_NFE ? i.CHAVE_NFE.substring(25, 34).replace(/^0+/, '') : "";
        return i.CHAVE_NFE.includes(filterNumero) || num.includes(filterNumero);
      });
    }

    if (filterEmitente) {
      const queryDigits = filterEmitente.replace(/\D/g, '');
      filtered = filtered.filter(i =>
        i.NOME_EMITENTE?.toLowerCase().includes(filterEmitente.toLowerCase()) ||
        (queryDigits.length > 0 && i.CPF_CNPJ_EMITENTE?.replace(/\D/g, '').includes(queryDigits))
      );
    }

    if (filterImposto) {
      filtered = filtered.filter(i => {
        const ip = i.TIPO_IMPOSTO || "";
        if (filterImposto === 'ST' && !ip.includes('ST')) return false;
        if (filterImposto === 'DIFAL' && !ip.includes('DIFAL')) return false;
        if (filterImposto === 'TRIBUTADA' && !ip.includes('Tributada')) return false;
        if (filterImposto === 'NENHUM' && ip !== "") return false;
        return true;
      });
    }

    return filtered;
  }, [items, showLaunched, dateRange, filterNumero, filterEmitente, filterImposto, filterEstado, filterModelo]);

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
    setDataSource('UPLOAD');
    try {
      const loadedItems: NotaFiscalRow[] = [];

      for (const file of Array.from(e.target.files)) {
        let xmlText: string;
        try {
          xmlText = await file.text();
        } catch {
          console.error(`Erro ao ler arquivo: ${file.name}`);
          continue;
        }

        // Extract chave_nfe (44 digits) from infNFe Id attribute
        const idMatch = xmlText.match(/infNFe[^>]+Id="NFe(\d{44})"/);
        if (!idMatch) {
          console.warn(`Arquivo ${file.name} não contém chave NF-e válida.`);
          continue;
        }
        const chave = idMatch[1];

        // Extract emitente block, then xNome and CNPJ within it
        const emitBlock = xmlText.match(/<emit>([\s\S]*?)<\/emit>/);
        const emitente = emitBlock?.[1].match(/<xNome>([^<]+)<\/xNome>/)?.[1] ?? 'Desconhecido';
        const cnpj = emitBlock?.[1].match(/<CNPJ>(\d+)<\/CNPJ>/)?.[1] ?? '';

        // Extract data emissao (NF-e 3.x uses dEmi, 4.0 uses dhEmi)
        const dataEmissao =
          xmlText.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1] ??
          xmlText.match(/<dEmi>([^<]+)<\/dEmi>/)?.[1] ??
          new Date().toISOString();

        // Extract valor total da NF-e
        const valorTotal = parseFloat(xmlText.match(/<vNF>([\d.]+)<\/vNF>/)?.[1] ?? '0');

        loadedItems.push({
          EMPRESA: 0,
          CHAVE_NFE: chave,
          NOME_EMITENTE: emitente,
          CPF_CNPJ_EMITENTE: cnpj,
          RG_IE_EMITENTE: '',
          DATA_EMISSAO: dataEmissao,
          TIPO_OPERACAO: 0,
          TIPO_OPERACAO_DESC: 'ENTRADA PRÓPRIA',
          STATUS_ERP: 'PENDENTE',
          XML_COMPLETO: xmlText,
          VALOR_TOTAL: valorTotal,
        });
      }

      if (loadedItems.length === 0) {
        alert('Nenhum arquivo XML com chave NF-e válida encontrado.');
        setDataSource('DATABASE');
      } else {
        setItems(loadedItems);
        setSelectedChaves(new Set());
      }
    } catch (err) {
      console.error('Erro ao carregar arquivos XML:', err);
      alert('Erro ao carregar os arquivos XML.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
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

      // We no longer bypass items that matched. EVERY item goes to selection.
      setTempResults({ matched: [], unmatched: allData });
      setViewState('UNMATCHED_SELECTION');

    } catch (e) {
      console.error(e);
      alert("Erro ao calcular.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmUnmatched = (selectedIndices: Set<number>, taxTypes: Record<number, 'ST' | 'DIFAL' | 'TRIBUTADA'>) => {
    if (!tempResults) return;

    // tempResults.unmatched arrays holds ALL items now (we passed allData into it)
    const finalized = tempResults.unmatched.reduce((acc, item, idx) => {
      if (selectedIndices.has(idx)) {
        acc.push({ ...item, impostoEscolhido: taxTypes[idx] });
      }
      return acc;
    }, [] as StCalculationResult[]);

    setResults(finalized);
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

  const handleOpenInvoiceDetails = (row: NotaFiscalRow) => {
    router.push(`/compras/notaFiscal/notaFiscal/${row.CHAVE_NFE}`);
  };

  const handleSyncLaunchedInvoices = async () => {
    try {
      setConfirmSyncModalOpen(false);
      setSyncModalOpen(true);
      setSyncStatus({
        status: 'running',
        totalEncontradas: 0,
        processadas: 0,
        inseridas: 0,
        ignoradas: 0,
        progresso: 0,
        logs: ['Iniciando sincronização...'],
      });

      const res = await fetch(LAUNCHED_SYNC_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
        } catch { }
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.jobId) {
        throw new Error('Não foi possível iniciar o job de sincronização.');
      }
      setSyncJobId(data.jobId);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao buscar NFs lançadas:", msg);
      setSyncStatus({
        status: 'failed',
        totalEncontradas: 0,
        processadas: 0,
        inseridas: 0,
        ignoradas: 0,
        progresso: 0,
        logs: ['Falha ao iniciar sincronização.'],
        errorMessage: msg,
      });
    }
  };

  useEffect(() => {
    if (!syncJobId) return;

    let canceled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`${LAUNCHED_SYNC_ENDPOINT}/${syncJobId}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) throw new Error(`Erro ao consultar status: ${res.status}`);

        const statusData = await res.json();
        if (canceled) return;

        if (statusData?.status) {
          setSyncStatus(statusData);

          if (statusData.status === 'running') {
            timer = setTimeout(poll, 1000);
          } else {
            await fetchAll();
          }
        } else {
          const notFoundMessage = statusData?.message || 'Status do job não disponível.';
          setSyncStatus(prev => ({
            status: 'failed',
            totalEncontradas: prev?.totalEncontradas ?? 0,
            processadas: prev?.processadas ?? 0,
            inseridas: prev?.inseridas ?? 0,
            ignoradas: prev?.ignoradas ?? 0,
            progresso: prev?.progresso ?? 0,
            logs: [...(prev?.logs ?? []), `Falha ao consultar status: ${notFoundMessage}`],
            errorMessage: notFoundMessage,
          }));
          setSyncJobId(null);
        }
      } catch (error) {
        if (canceled) return;
        setSyncStatus(prev => ({
          status: 'failed',
          totalEncontradas: prev?.totalEncontradas ?? 0,
          processadas: prev?.processadas ?? 0,
          inseridas: prev?.inseridas ?? 0,
          ignoradas: prev?.ignoradas ?? 0,
          progresso: prev?.progresso ?? 0,
          logs: [...(prev?.logs ?? []), 'Falha ao consultar status da sincronização.'],
          errorMessage: error instanceof Error ? error.message : String(error),
        }));
        setSyncJobId(null);
      }
    };

    poll();

    return () => {
      canceled = true;
      if (timer) clearTimeout(timer);
    };
  }, [syncJobId, fetchAll]);

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      {/* Header visible only in LIST or maybe always? keeping explicit for now */}
      {viewState === 'LIST' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h3 className="text-2xl font-semibold mb-1 text-black dark:text-white">Notas Fiscais de Entrada</h3>
            <p className="text-sm text-gray-500">Conciliação de Notas Fiscais e Cálculo de Guia Complementar</p>
          </div>

          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:text-gray-700 transition-all active:scale-95 disabled:opacity-50 dark:bg-meta-4 dark:text-gray-300 dark:border-strokedark"
              onClick={() => setConfirmSyncModalOpen(true)}
              disabled={dataSource === 'UPLOAD' || syncStatus?.status === 'running'}
              title="Buscar NFs lançadas na NF_ENTRADA_XML"
            >
              <FaFilter size={14} />
              <span className="text-sm">Buscar NFs lançadas</span>
            </button>

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
            <>
              {/* FILTERS BAR */}
              <div className="bg-white dark:bg-boxdark rounded-xl shadow-sm p-3 mb-6 border border-gray-100 dark:border-strokedark overflow-hidden">
                <div className="flex flex-nowrap items-center gap-2 w-full">
                  {/* Search Nota */}
                  <div className="flex items-center h-9 w-[14%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 overflow-hidden shadow-sm transition-all">
                    <div className="pl-2 pr-1.5 text-gray-400">
                      <FaSearch size={12} />
                    </div>
                    <input
                      type="text"
                      placeholder="Nº/Chave"
                      value={filterNumero}
                      onChange={(e) => setFilterNumero(e.target.value)}
                      className="w-full h-full bg-transparent outline-none text-xs text-black dark:text-white placeholder:text-gray-400 min-w-0"
                    />
                  </div>

                  {/* Search Emitente */}
                  <div className="flex items-center h-9 w-[14%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 overflow-hidden shadow-sm transition-all">
                    <div className="pl-2 pr-1.5 text-gray-400">
                      <FaSearch size={12} />
                    </div>
                    <input
                      type="text"
                      placeholder="Emitente/CNPJ"
                      value={filterEmitente}
                      onChange={(e) => setFilterEmitente(e.target.value)}
                      className="w-full h-full bg-transparent outline-none text-xs text-black dark:text-white placeholder:text-gray-400 min-w-0"
                    />
                  </div>

                  {/* Filter Imposto */}
                  <select
                    value={filterImposto}
                    onChange={(e) => setFilterImposto(e.target.value)}
                    className="h-9 w-[13%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 text-xs px-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm text-black dark:text-white transition-all"
                  >
                    <option value="">Filtro Imposto: Todos</option>
                    <option value="ST">Somente ICMS ST</option>
                    <option value="DIFAL">Somente DIFAL</option>
                    <option value="TRIBUTADA">Tributada</option>
                    <option value="NENHUM">Não Selecionado / Sem Imposto</option>
                  </select>

                  <select
                    value={filterModelo}
                    onChange={(e) => setFilterModelo(e.target.value as "55" | "TODOS")}
                    className="h-9 w-[12%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 text-xs px-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm text-black dark:text-white transition-all"
                  >
                    <option value="55">Modelo 55</option>
                    <option value="TODOS">Todos modelos</option>
                  </select>

                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as "TODOS" | "DENTRO" | "FORA")}
                    className="h-9 w-[17%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 text-xs px-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm text-black dark:text-white transition-all"
                  >
                    <option value="TODOS">Estado: Todos</option>
                    <option value="DENTRO">Somente Dentro do Estado (MT)</option>
                    <option value="FORA">Somente Fora do Estado</option>
                  </select>

                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="h-9 w-[15%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 text-xs px-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm text-black dark:text-white transition-all"
                    title="Data de emissão inicial"
                    aria-label="Data de emissão inicial"
                  />

                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="h-9 w-[15%] min-w-0 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 text-xs px-2 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm text-black dark:text-white transition-all"
                    title="Data de emissão final"
                    aria-label="Data de emissão final"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-boxdark rounded-xl shadow-md border border-gray-100 dark:border-strokedark">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/20 rounded-t-xl">
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {dataSource === 'DATABASE' ? 'Notas Fiscais de Entrada' : 'Arquivos Carregados'}
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

                <div className="max-w-full overflow-x-auto">
                  <table className="text-left border-collapse table-fixed min-w-full">
                    <thead className="sticky top-[0px] z-20 shadow-sm bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300 text-xs uppercase font-semibold">
                      <tr>
                        <th className="py-4 px-4 w-[50px] text-center border-b border-gray-200 dark:border-strokedark">
                          <button onClick={toggleSelectAll} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                            {isAllSelected ? <FaCheckSquare size={16} /> : <FaSquare size={16} />}
                          </button>
                        </th>
                        <th className="w-[140px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Status Cálculo</th>
                        <th className="w-[120px] py-4 px-4 text-right border-b border-gray-200 dark:border-strokedark">Valor Guia</th>
                        <th className="w-[200px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Nota Fiscal / Chave</th>
                        <th className="w-[300px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Emitente</th>
                        <th className="w-[100px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Data</th>
                        <th className="w-[110px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Situação</th>
                        <th className="w-[130px] py-4 px-4 border-b border-gray-200 dark:border-strokedark">Op. Fiscal</th>
                        <th className="w-[120px] py-4 px-4 border-b border-gray-200 dark:border-strokedark text-center">Tipo Imposto</th>
                        <th className="w-[80px] py-4 px-4 border-b border-gray-200 dark:border-strokedark text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-strokedark text-sm">
                      {paged.map((row, idx) => {
                        const isSelected = selectedChaves.has(row.CHAVE_NFE);
                        const numNota = row.CHAVE_NFE ? row.CHAVE_NFE.substring(25, 34).replace(/^0+/, '') : "N/A";

                        return (
                          <tr
                            key={row.CHAVE_NFE ?? idx}
                            onClick={() => handleOpenInvoiceDetails(row)}
                            className={`group transition-colors relative border-b border-gray-50 dark:border-strokedark cursor-pointer ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-meta-4'}`}
                            title="Clique para abrir detalhes da nota"
                          >
                            <td className="py-3 px-4 text-center align-top pt-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(row.CHAVE_NFE);
                                }}
                                className={`transition-colors ${isSelected ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                {isSelected ? <FaCheckSquare size={16} /> : <FaSquare size={16} />}
                              </button>
                            </td>
                            <td className="py-3 px-4 align-top pt-4">
                              <div className="flex flex-col gap-1.5 items-start">
                                {statusMap[row.CHAVE_NFE] ? (
                                  <span title={statusMap[row.CHAVE_NFE].status} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border cursor-help 
                                            ${statusMap[row.CHAVE_NFE].status.includes('Tem Guia') ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30' :
                                      statusMap[row.CHAVE_NFE].status.includes('Tributado') ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10'}`}>
                                    {statusMap[row.CHAVE_NFE].status.includes('Tem Guia') ? <><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>Tem Guia</> :
                                      statusMap[row.CHAVE_NFE].status.includes('Tributado') ? <><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Tributado</> : <><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Verificado</>}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Pendente</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right align-top pt-4">
                              <div className="flex flex-col items-end">
                                {statusMap[row.CHAVE_NFE] && statusMap[row.CHAVE_NFE].valor > 0 ? (
                                  <span className="text-sm font-mono text-red-600 dark:text-red-400 font-bold">
                                    R$ {statusMap[row.CHAVE_NFE].valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400 font-medium">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top pt-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-black dark:text-white flex items-center gap-1">
                                  Nº {numNota}
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider" title={row.CHAVE_NFE}>
                                  {row.CHAVE_NFE.substring(0, 4)} {row.CHAVE_NFE.substring(4, 20)}...
                                </span>
                                {row.VALOR_TOTAL ? <span className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">Vlr NFe: R$ {row.VALOR_TOTAL.toFixed(2)}</span> : null}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top pt-4 text-sm">
                              <p className="font-semibold text-gray-800 dark:text-gray-200 leading-tight">{row.NOME_EMITENTE}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{row.CPF_CNPJ_EMITENTE}</p>
                            </td>
                            <td className="py-3 px-4 align-top pt-4">
                              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{fmtDate(row.DATA_EMISSAO)}</p>
                            </td>
                            <td className="py-3 px-4 align-top pt-4">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 min-w-[80px] rounded-full text-[10px] font-bold uppercase tracking-wide border ${row.STATUS_ERP === 'LANCADA' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                {row.STATUS_ERP === 'LANCADA' ? 'LANÇADA' : 'PENDENTE'}
                              </span>
                            </td>
                            <td className="py-3 px-4 align-top pt-4">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 min-w-[100px] rounded-full text-[10px] font-bold uppercase tracking-wide border ${row.TIPO_OPERACAO === 0 ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400'}`} title={row.TIPO_OPERACAO_DESC}>
                                {row.TIPO_OPERACAO === 0 ? 'Saída' : 'Entrada'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center align-top pt-4">
                              {row.TIPO_IMPOSTO ? (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold border 
                                  ${row.TIPO_IMPOSTO === 'Tributada' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300' :
                                    row.TIPO_IMPOSTO.includes('DIFAL') && row.TIPO_IMPOSTO.includes('ST') ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300' :
                                    row.TIPO_IMPOSTO.includes('DIFAL') ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300' :
                                      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                  {row.TIPO_IMPOSTO}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center align-top pt-4">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPdf(row);
                                  }}
                                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                  title="Baixar PDF DANFE"
                                >
                                  <FaFilePdf className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && paged.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-12 px-4 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 dark:bg-meta-4/50 p-4 rounded-full mb-3">
                                <FaSearch size={24} className="text-gray-400" />
                              </div>
                              <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum registro encontrado</p>
                              <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                Tente ajustar seus filtros de busca ou recarregar os dados.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {loading && (
                        <tr><td colSpan={10} className="py-10 px-4 text-center text-gray-500">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <FaSync className="animate-spin text-primary" size={24} />
                            <p>Carregando notas fiscais...</p>
                          </div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-strokedark bg-gray-50/30 dark:bg-meta-4/10 rounded-b-xl">
                  <div className="text-sm text-gray-600">Total: <b>{total}</b> · Página <b>{page}</b> de <b>{totalPages}</b></div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
                    <button className="px-3 py-1.5 border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors" onClick={() => setPage(p => (p < totalPages ? p + 1 : p))} disabled={page >= totalPages}>Próxima</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {viewState === 'UNMATCHED_SELECTION' && tempResults && (
            <UnmatchedSelection
              unmatchedItems={tempResults.unmatched}
              onConfirm={handleConfirmUnmatched}
              onCancel={handleBackToList}
            />
          )}

          {viewState === 'RESULTS' && results && (
            <StCalculationResults
              results={results}
              originalItems={items}
              selectedInvoices={selectedChaves}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList();
                fetchAll();
              }}
            />
          )}
        </div>
      </div>

      {syncModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-boxdark border border-gray-100 dark:border-strokedark shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-strokedark">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Log da Busca de NFs Lançadas</h4>
              <button
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-strokedark text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4"
                onClick={() => {
                  if (syncStatus?.status !== 'running') {
                    setSyncModalOpen(false);
                    setSyncJobId(null);
                  }
                }}
                disabled={syncStatus?.status === 'running'}
              >
                Fechar
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 dark:border-strokedark p-3">
                  <p className="text-xs text-gray-500">Encontradas</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{syncStatus?.totalEncontradas ?? 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-strokedark p-3">
                  <p className="text-xs text-gray-500">Processadas</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{syncStatus?.processadas ?? 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-strokedark p-3">
                  <p className="text-xs text-gray-500">Inseridas</p>
                  <p className="text-lg font-semibold text-emerald-600">{syncStatus?.inseridas ?? 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-strokedark p-3">
                  <p className="text-xs text-gray-500">Ignoradas</p>
                  <p className="text-lg font-semibold text-amber-600">{syncStatus?.ignoradas ?? 0}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progresso</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{syncStatus?.progresso ?? 0}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-meta-4 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, syncStatus?.progresso ?? 0))}%` }}
                  />
                </div>
              </div>

              {syncStatus?.errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                  {syncStatus.errorMessage}
                </div>
              )}

              <div className="rounded-lg border border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 p-3 h-52 overflow-auto">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Eventos</p>
                <div className="space-y-1">
                  {(syncStatus?.logs ?? []).map((log, idx) => (
                    <p key={`${idx}-${log}`} className="text-xs font-mono text-gray-700 dark:text-gray-300">{log}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmSyncModalOpen && (
        <div className="fixed inset-0 z-[71] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-boxdark border border-gray-100 dark:border-strokedark shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-strokedark">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmar busca de NFs lançadas</h4>
            </div>

            <div className="px-5 py-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Essa consulta pode demorar alguns minutos, dependendo do volume de notas no ERP.
              </p>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Após iniciar, o processo não poderá ser cancelado.
              </p>
              <p>
                Deseja continuar?
              </p>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 dark:border-strokedark flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-strokedark text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4"
                onClick={() => setConfirmSyncModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                onClick={handleSyncLaunchedInvoices}
                disabled={syncStatus?.status === 'running'}
              >
                Iniciar busca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
