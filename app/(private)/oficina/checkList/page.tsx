"use client";

import {
  FaPlusSquare,
  FaTrash,
  FaEdit,
  FaFilePdf,
  FaSync,
  FaListUl,
  FaCaretDown,
  FaFilter,
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";

// ===============================
// Tipos esperados da API
// ===============================
type ChecklistRow = {
  id: string | number;
  osInterna?: string | null;
  dataHoraEntrada?: string | null; // ISO
  combustivelPercentual?: number | null;
  createdAt?: string | null; // ISO
  clienteNome?: string | null; // se você derivar de JSON no backend
  veiculoPlaca?: string | null; // idem
};

type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

const API_BASE = "http://localhost:8000/oficina/checklists";

export default function ChecklistsList() {
  // Filtros e paginação
  const [qOsInterna, setQOsInterna] = useState("");
  const [qPlaca, setQPlaca] = useState("");
  const [qDataDe, setQDataDe] = useState("");
  const [qDataAte, setQDataAte] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Dados e estado
  const [itens, setItens] = useState<ChecklistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Dropdown PageSize
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const pageSizeRef = useRef<HTMLDivElement | null>(null);

    const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function downloadChecklistPdf(id: string) {
    try {
      setDownloadingId(id);

      const res = await fetch(`http://localhost:8000/oficina/checklists/${id}/pdf`, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!res.ok) {
        // tenta ler JSON de erro se existir
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const err = await res.json();
          if (err?.message) msg = Array.isArray(err.message) ? err.message.join(", ") : err.message;
        } catch {}
        throw new Error(msg);
      }

      // tenta extrair o filename do Content-Disposition
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
      const filenameFromHeader = match ? decodeURIComponent(match[1]) : null;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filenameFromHeader || `checklist-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Falha ao baixar PDF:", msg);
      alert(msg || "Falha ao baixar PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  // === CLASSES REUTILIZÁVEIS ===
  const BTN =
    "h-12 px-4 inline-flex items-center justify-center gap-2 rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";

  const BTN_SQUARE =
    "h-12 w-12 inline-flex items-center justify-center rounded text-white font-semibold " +
    "bg-gradient-to-r from-blue-500 to-purple-600 " +
    "hover:from-blue-600 hover:to-purple-700 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";

  // Fecha o dropdown ao clicar fora / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!pageSizeRef.current) return;
      if (!pageSizeRef.current.contains(e.target as Node)) {
        setPageSizeOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPageSizeOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Helpers
  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR");
  };

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (qOsInterna.trim()) p.set("osInterna", qOsInterna.trim());
    if (qPlaca.trim()) p.set("placa", qPlaca.trim());
    if (qDataDe) p.set("dataDe", qDataDe);
    if (qDataAte) p.set("dataAte", qDataAte);
    return p.toString();
  }, [page, pageSize, qOsInterna, qPlaca, qDataDe, qDataAte]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?${qs}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      const text = await res.text();
      if (!text) {
        setItens([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        setItens(json);
        setTotal(json.length);
        setTotalPages(1);
      } else {
        const pageResp = json as PaginatedResponse<ChecklistRow>;
        setItens(Array.isArray(pageResp.data) ? pageResp.data : []);
        setTotal(pageResp.total ?? 0);
        setTotalPages(pageResp.totalPages ?? 1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Erro ao listar checklists:", msg);
      setItens([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const onSearch = () => {
    setPage(1);
    fetchList();
  };

  const onClear = () => {
    setQOsInterna("");
    setQPlaca("");
    setQDataDe("");
    setQDataAte("");
    setPage(1);
  };

  const exportCSV = () => {
    if (!itens?.length) return;
    const headers = [
      "ID",
      "OS Interna",
      "Data/Hora Entrada",
      "Cliente",
      "Placa",
      "Combustível (%)",
      "Criado em",
    ];
    const rows = itens.map((r) => [
      r.id ?? "",
      r.osInterna ?? "",
      fmtDateTime(r.dataHoraEntrada),
      r.clienteNome ?? "",
      r.veiculoPlaca ?? "",
      (r.combustivelPercentual ?? "") as any,
      fmtDateTime(r.createdAt),
    ]);
    const csv =
      [headers, ...rows]
        .map((line) =>
          line
            .map((v) => {
              const s = String(v ?? "");
              return `"${s.replace(/"/g, '""')}"`;
            })
            .join(";")
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.download = `checklists-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageSizes: (10 | 20 | 50)[] = [10, 20, 50];

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">
            Checklists (Oficina)
          </h3>

          <div className="flex gap-6">
            {/* Novo (placeholder) */}
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_new_menu"
                className={BTN_SQUARE}
                title="Novo"
                onClick={() => alert("Ir para tela de criação (implemente).")}
              >
                <FaPlusSquare className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">NOVO</span>
            </div>

            {/* Lixeira (placeholder) */}
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_trash_menu"
                className={BTN_SQUARE}
                title="Lixeira"
                onClick={() => alert("Lixeira não implementada.")}
              >
                <FaTrash className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">LIXEIRA</span>
            </div>
          </div>
        </div>

        {/* Listagem */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                {/* Filtro avançado (placeholder) */}
                <button
                  className={BTN}
                  onClick={() => alert("Filtro avançado não implementado.")}
                >
                  <FaFilter />
                  <span>Filtro Avançado</span>
                </button>

                {/* Filtros rápidos */}
                <div className="flex flex-1 max-w-5xl mx-2 gap-2 flex-wrap">
                  <input
                    type="text"
                    value={qOsInterna}
                    onChange={(e) => setQOsInterna(e.target.value)}
                    className="flex-1 min-w-[160px] h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="OS Interna"
                  />
                  <input
                    type="text"
                    value={qPlaca}
                    onChange={(e) => setQPlaca(e.target.value)}
                    className="flex-1 min-w-[140px] h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Placa"
                  />
                  <input
                    type="date"
                    value={qDataDe}
                    onChange={(e) => setQDataDe(e.target.value)}
                    className="h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Data De"
                  />
                  <input
                    type="date"
                    value={qDataAte}
                    onChange={(e) => setQDataAte(e.target.value)}
                    className="h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="Data Até"
                  />
                  <button className={`${BTN}`} onClick={onSearch}>
                    Pesquisar
                  </button>
                  <button
                    className="h-12 px-4 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700"
                    onClick={onClear}
                  >
                    Limpar
                  </button>
                </div>

                {/* CSV, recarregar, pageSize, colunas */}
                <div className="flex items-center gap-2">
                  <button className={BTN} onClick={exportCSV}>
                    <FaFilePdf />
                    <span>CSV</span>
                  </button>

                  <button className={BTN} onClick={fetchList} disabled={loading}>
                    <FaSync className={loading ? "animate-spin" : ""} />
                  </button>

                  {/* PageSize dropdown */}
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
                      <div
                        className="absolute right-0 mt-2 w-24 bg-white border rounded shadow z-10"
                        role="listbox"
                        tabIndex={-1}
                      >
                        {([10, 20, 50] as const).map((n) => (
                          <button
                            key={n}
                            role="option"
                            aria-selected={pageSize === n}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                              pageSize === n ? "bg-gray-50 font-semibold" : ""
                            }`}
                            onClick={() => {
                              setPageSize(n);
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

                  {/* Colunas (placeholder) */}
                  <div className="relative">
                    <button
                      className={BTN}
                      onClick={() => alert("Seletor de colunas não implementado.")}
                    >
                      <FaListUl className="mr-1" />
                      <FaCaretDown />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="p-2 w-8">
                        <input type="checkbox" />
                      </th>
                      <th className="p-2 text-start">OS Interna</th>
                      <th className="p-2 text-start">Data/Hora Entrada</th>
                      <th className="p-2 text-start">Cliente</th>
                      <th className="p-2 text-start">Placa</th>
                      <th className="p-2 text-start">Combustível (%)</th>
                      <th className="p-2 text-start">Criado em</th>
                      <th className="p-2 text-center" style={{ width: "120px" }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((row, idx) => (
                      <tr key={String(row.id ?? idx)} className="border-t">
                        <td className="p-4">
                          <input type="checkbox" />
                        </td>
                        <td className="p-4">{row.osInterna ?? "-"}</td>
                        <td className="p-4">{fmtDateTime(row.dataHoraEntrada)}</td>
                        <td className="p-4">{row.clienteNome ?? "-"}</td>
                        <td className="p-4">{row.veiculoPlaca ?? "-"}</td>
                        <td className="p-4">
                          {row.combustivelPercentual ?? "-"}
                        </td>
                        <td className="p-4">{fmtDateTime(row.createdAt)}</td>
                        <td className="p-4 text-center">
                            <button
                            className="mx-1 h-10 w-10 inline-flex items-center justify-center rounded"
                            title="Baixar PDF"
                            onClick={() => downloadChecklistPdf(String(row.id))}
                            disabled={downloadingId === row.id}
                            >
                            {/* você pode usar um ícone de PDF (FaFilePdf) ou manter o FaEdit se preferir */}
                            <FaFilePdf
                                style={{
                                color: downloadingId === row.id ? "#94a3b8" : "rgb(0, 152, 196)",
                                minHeight: "24px",
                                minWidth: "24px",
                                }}
                            />
                            </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && itens.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-500">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                    {loading && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-500">
                          Carregando...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Total: <b>{total}</b> &middot; Página <b>{page}</b> de{" "}
                  <b>{totalPages}</b>
                </div>
                <div className="flex gap-2">
                  <button
                    className="h-10 px-3 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    Anterior
                  </button>
                  <button
                    className="h-10 px-3 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                    onClick={() =>
                      setPage((p) => (p < totalPages ? p + 1 : p))
                    }
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
