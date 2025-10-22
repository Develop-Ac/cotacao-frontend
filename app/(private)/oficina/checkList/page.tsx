"use client";

import {
  FaFilePdf,
  FaSync,
  FaCaretDown,
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
  clienteNome?: string | null; // derivado no backend
  veiculoPlaca?: string | null; // derivado no backend
};

type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

const API_BASE = "https://intranetbackend.acacessorios.local/oficina/checklists";

export default function ChecklistsList() {
  // Filtros (aplicados no front)
  const [qOsInterna, setQOSInterna] = useState("");
  const [qPlaca, setQPlaca] = useState("");
  const [qDataDe, setQDataDe] = useState("");   // YYYY-MM-DD
  const [qDataAte, setQDataAte] = useState(""); // YYYY-MM-DD

  // Paginação no front
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);

  // Dados e estado
  const [rawItems, setRawItems] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  // Converte ISO → 'YYYY-MM-DD'
  const isoToYmd = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isDateRangeValid = useMemo(() => {
    if (!qDataDe || !qDataAte) return true;
    return qDataDe <= qDataAte;
  }, [qDataDe, qDataAte]);

  // ---------- CARREGAMENTO (pega TODOS os itens) ----------
  const fetchAll = async () => {
    // cancela requisição anterior
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      // 1) tenta pegar a primeira página (ou tudo, se a API já devolver array)
      const firstUrl = `${API_BASE}?page=1&pageSize=50`;
      const res = await fetch(firstUrl, {
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

      const text = await res.text();
      if (!text) {
        setRawItems([]);
        return;
      }

      const json: unknown = JSON.parse(text);

      // 2) Se vier array simples, beleza — já temos tudo
      if (Array.isArray(json)) {
        setRawItems(json as ChecklistRow[]);
        return;
      }

      // 3) Se vier paginado, varre todas as páginas
      const p1 = json as PaginatedResponse<ChecklistRow>;
      const all: ChecklistRow[] = Array.isArray(p1.data) ? [...p1.data] : [];

      const totalPages = p1.totalPages ?? 1;
      if (totalPages > 1) {
        // carrega as próximas páginas (2..N)
        for (let pg = 2; pg <= totalPages; pg++) {
          const url = `${API_BASE}?page=${pg}&pageSize=${p1.pageSize ?? 50}`;
          const r = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: ctrl.signal,
          });
          if (!r.ok) throw new Error(`Erro HTTP: ${r.status}`);
          const t = await r.text();
          if (!t) continue;

          const j = JSON.parse(t);
          if (Array.isArray(j)) {
            all.push(...(j as ChecklistRow[]));
          } else {
            const px = j as PaginatedResponse<ChecklistRow>;
            if (Array.isArray(px.data)) all.push(...px.data);
          }
        }
      }

      setRawItems(all);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Erro ao carregar checklists:", msg);
        setRawItems([]);
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

  // ---------- FILTRAGEM NO FRONT ----------
  const filtered = useMemo(() => {
    if (!isDateRangeValid) return [];

    const os = qOsInterna.trim().toLowerCase();
    const placa = qPlaca.trim().toUpperCase();

    return (rawItems ?? []).filter((r) => {
      // OS Interna: contém (case-insensitive)
      if (os) {
        const v = String(r.osInterna ?? "").toLowerCase();
        if (!v.includes(os)) return false;
      }

      // Placa: contém (normalizada p/ maiúsculas)
      if (placa) {
        const p = String(r.veiculoPlaca ?? "").toUpperCase();
        if (!p.includes(placa)) return false;
      }

      // Datas: com base em dataHoraEntrada (ou createdAt se preferir)
      if (qDataDe || qDataAte) {
        const ymd = isoToYmd(r.dataHoraEntrada || r.createdAt);
        if (!ymd) return false;
        if (qDataDe && ymd < qDataDe) return false;
        if (qDataAte && ymd > qDataAte) return false;
      }

      return true;
    });
  }, [rawItems, qOsInterna, qPlaca, qDataDe, qDataAte, isDateRangeValid]);

  // paginação no front
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // se filtros mudarem ou pageSize mudar, volta para página 1 se page estourar
  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ---------- Ações de filtro ----------
  const onSearch = () => {
    setPage(1);
    // nada de fetch; tudo é client-side
  };

  const onClear = () => {
    setQOSInterna("");
    setQPlaca("");
    setQDataDe("");
    setQDataAte("");
    setPage(1);
  };

  // ---------- CSV ----------
  const exportCSV = () => {
    if (!filtered?.length) return;

    const headers = [
      "ID",
      "OS Interna",
      "Data/Hora Entrada",
      "Cliente",
      "Placa",
      "Combustível (%)",
      "Criado em",
    ];
    const rows = filtered.map((r) => [
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
    a.download = `checklists-filtrado-${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Download PDF ----------
  async function downloadChecklistPdf(id: string) {
    try {
      setDownloadingId(id);
      const res = await fetch(`${API_BASE}/${id}/pdf`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });

      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const err = await res.json();
          if (err?.message)
            msg = Array.isArray(err.message)
              ? err.message.join(", ")
              : err.message;
        } catch {}
        throw new Error(msg);
      }

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

  const pageSizes: (10 | 20 | 50)[] = [10, 20, 50];

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">
            Checklists (Oficina)
          </h3>
          <div className="flex items-center gap-2">
            <button
              className="h-10 px-4 inline-flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
              onClick={fetchAll}
              disabled={loading}
              title="Recarregar do servidor"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Listagem */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div className="flex flex-1 max-w-5xl mx-2 gap-2 flex-wrap">
                  <input
                    type="text"
                    value={qOsInterna}
                    onChange={(e) => setQOSInterna(e.target.value)}
                    className="flex-1 min-w-[160px] h-12 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                    placeholder="OS Interna"
                  />
                  <input
                    type="text"
                    value={qPlaca}
                    onChange={(e) => setQPlaca(e.target.value.toUpperCase().trim())}
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
                  <button
                    className="h-12 px-4 inline-flex items-center justify-center rounded bg-gray-200 text-gray-700"
                    onClick={onClear}
                  >
                    Limpar
                  </button>
                </div>

                {/* PageSize dropdown */}
                <div className="flex items-center gap-2">
                  <div className="relative" ref={pageSizeRef}>
                    <button
                      className="h-12 px-4 inline-flex items-center justify-center gap-2 rounded bg-gray-100 hover:bg-gray-200"
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
                        {pageSizes.map((n) => (
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
                </div>
              </div>

              {/* Info topo */}
              <div className="text-sm text-gray-600 mb-2">
                Registros carregados: <b>{rawItems.length}</b> · Filtrados:{" "}
                <b>{filtered.length}</b>
                {!isDateRangeValid && (
                  <span className="ml-3 text-red-600">
                    Intervalo de datas inválido.
                  </span>
                )}
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
                    {paged.map((row, idx) => (
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
                            disabled={downloadingId === String(row.id ?? "")}
                          >
                            <FaFilePdf
                              style={{
                                color:
                                  downloadingId === String(row.id ?? "")
                                    ? "#94a3b8"
                                    : "rgb(0, 152, 196)",
                                minHeight: "24px",
                                minWidth: "24px",
                              }}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!loading && paged.length === 0 && (
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

              {/* Paginação (front) */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Total filtrado: <b>{filtered.length}</b> · Página <b>{page}</b> de{" "}
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
