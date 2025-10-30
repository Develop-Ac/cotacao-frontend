"use client";

import {
  FaFilePdf,
  FaSync,
  FaCaretDown,
  FaImages,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
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
  clienteNome?: string | null;
  veiculoPlaca?: string | null;
};

type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

type AvariaImage = {
  fotoBase64: string;      // "data:image/...;base64,...." ou somente base64
  peca: string | null;
  observacoes: string | null;
  tipo: string | null;
};

const API_BASE = "${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/oficina/checklists";
// endpoint das imagens (controller /img/:id)
const IMG_API_BASE = "${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/oficina/img";

export default function ChecklistsList() {
  // ====== PADRÕES DE BOTÃO ======
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

  // ====== GALERIA ======
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<AvariaImage[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryAbortRef = useRef<AbortController | null>(null);

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
        if (galleryOpen) closeGallery();
      }
      if (!galleryOpen) return;
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [galleryOpen, galleryIndex, galleryItems.length]);

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

      // Se vier array simples, beleza — já temos tudo
      if (Array.isArray(json)) {
        setRawItems(json as ChecklistRow[]);
        return;
      }

      // Se vier paginado, varre todas as páginas
      const p1 = json as PaginatedResponse<ChecklistRow>;
      const all: ChecklistRow[] = Array.isArray(p1.data) ? [...p1.data] : [];

      const totalPages = p1.totalPages ?? 1;
      if (totalPages > 1) {
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
      if (os) {
        const v = String(r.osInterna ?? "").toLowerCase();
        if (!v.includes(os)) return false;
      }

      if (placa) {
        const p = String(r.veiculoPlaca ?? "").toUpperCase();
        if (!p.includes(placa)) return false;
      }

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

  // ---------- Galeria: abrir/fechar/navegar/baixar ----------
  async function openGallery(checklistId: string) {
    // abort anterior
    galleryAbortRef.current?.abort();
    const ctrl = new AbortController();
    galleryAbortRef.current = ctrl;

    setGalleryOpen(true);
    setGalleryLoading(true);
    setGalleryError(null);
    setGalleryItems([]);
    setGalleryIndex(0);

    try {
      const res = await fetch(`${IMG_API_BASE}/${encodeURIComponent(checklistId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const json = await res.json();
      const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const items: AvariaImage[] = (data as any[]).map((x) => ({
        fotoBase64: x.fotoBase64,
        peca: x.peca ?? null,
        observacoes: x.observacoes ?? null,
        tipo: x.tipo ?? null,
      }));
      setGalleryItems(items);
      setGalleryIndex(0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setGalleryError(e?.message || "Falha ao carregar imagens");
      }
    } finally {
      setGalleryLoading(false);
    }
  }

  function closeGallery() {
    galleryAbortRef.current?.abort();
    setGalleryOpen(false);
    setGalleryItems([]);
    setGalleryIndex(0);
    setGalleryError(null);
  }

  function prevImage() {
    setGalleryIndex((i) => (i <= 0 ? Math.max(0, galleryItems.length - 1) : i - 1));
  }
  function nextImage() {
    setGalleryIndex((i) => (i >= galleryItems.length - 1 ? 0 : i + 1));
  }

  function normalizeDataUrl(fotoBase64: string): string {
    if (!fotoBase64) return "";
    if (fotoBase64.startsWith("data:image/")) return fotoBase64;
    // se vier só o base64 puro, assuma jpeg
    return `data:image/jpeg;base64,${fotoBase64}`;
  }

  function downloadCurrentImage() {
    const cur = galleryItems[galleryIndex];
    if (!cur?.fotoBase64) return;
    const dataUrl = normalizeDataUrl(cur.fotoBase64);

    // gera arquivo
    const a = document.createElement("a");
    a.href = dataUrl;
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");
    a.download = `avaria-${ts}-${galleryIndex + 1}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
            {/* Recarregar */}
            <button
              className={BTN_SQUARE}
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
                  <button className={BTN} onClick={onClear}>
                    Limpar filtros
                  </button>
                </div>

                {/* PageSize dropdown */}
                <div className="flex items-center gap-2">
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
                        className="absolute right-0 mt-2 w-28 bg-white border rounded shadow z-10"
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
                      <th className="p-2 text-center" style={{ width: "160px" }}>
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
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* PDF */}
                            <button
                              className={BTN_SQUARE}
                              title="Baixar PDF"
                              onClick={() => downloadChecklistPdf(String(row.id))}
                              disabled={downloadingId === String(row.id ?? "")}
                            >
                              <FaFilePdf
                                className={downloadingId === String(row.id ?? "") ? "opacity-60" : ""}
                                style={{ minHeight: "24px", minWidth: "24px" }}
                              />
                            </button>

                            {/* FOTOS (Galeria) */}
                            <button
                              className={BTN_SQUARE}
                              title="Fotos (avarias)"
                              onClick={() => openGallery(String(row.id))}
                            >
                              <FaImages style={{ minHeight: "24px", minWidth: "24px" }} />
                            </button>
                          </div>
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

      {/* ====== MODAL GALERIA ====== */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeGallery}
          />

          {/* content */}
          <div className="relative z-10 w-full max-w-5xl mx-4 rounded-xl bg-white shadow-2xl">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">
                Galeria de fotos {galleryItems.length ? `(${galleryIndex + 1}/${galleryItems.length})` : ""}
              </div>
              <button
                className="h-10 w-10 inline-flex items-center justify-center rounded hover:bg-gray-100"
                onClick={closeGallery}
                title="Fechar"
              >
                <FaTimes />
              </button>
            </div>

            {/* body */}
            <div className="p-4">
              {galleryLoading && (
                <div className="py-16 text-center text-gray-600">Carregando imagens...</div>
              )}
              {galleryError && (
                <div className="py-16 text-center text-red-600">{galleryError}</div>
              )}

              {!galleryLoading && !galleryError && galleryItems.length === 0 && (
                <div className="py-16 text-center text-gray-600">
                  Nenhuma imagem encontrada para este checklist.
                </div>
              )}

              {!galleryLoading && !galleryError && galleryItems.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* área da imagem com navegação lateral */}
                  <div className="lg:col-span-8">
                    <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                      {/* seta esquerda */}
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100"
                        onClick={prevImage}
                        title="Anterior"
                      >
                        <FaChevronLeft />
                      </button>

                      {/* imagem */}
                      <img
                        src={normalizeDataUrl(galleryItems[galleryIndex].fotoBase64)}
                        alt="Avaria"
                        className="max-h-full max-w-full object-contain"
                      />

                      {/* seta direita */}
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100"
                        onClick={nextImage}
                        title="Próxima"
                      >
                        <FaChevronRight />
                      </button>
                    </div>

                    {/* mini navegação (pontos) */}
                    {galleryItems.length > 1 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {galleryItems.map((_, i) => (
                          <button
                            key={i}
                            className={`h-2.5 rounded-full transition-all ${
                              i === galleryIndex ? "w-6 bg-blue-600" : "w-2.5 bg-gray-300"
                            }`}
                            onClick={() => setGalleryIndex(i)}
                            aria-label={`Ir para imagem ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* metadados + ações */}
                  <div className="lg:col-span-4">
                    <div className="rounded-lg border p-3 bg-gray-50">
                      <div className="text-sm text-gray-600 mb-2">Informações da avaria</div>
                      <dl className="text-sm">
                        <dt className="font-semibold">Tipo</dt>
                        <dd className="mb-2">{galleryItems[galleryIndex].tipo ?? "—"}</dd>

                        <dt className="font-semibold">Peça</dt>
                        <dd className="mb-2">{galleryItems[galleryIndex].peca ?? "—"}</dd>

                        <dt className="font-semibold">Observações</dt>
                        <dd className="mb-2 whitespace-pre-wrap break-words">
                          {galleryItems[galleryIndex].observacoes ?? "—"}
                        </dd>
                      </dl>
                    </div>

                    <div className="mt-3">
                      <button
                        className={BTN + " w-full"}
                        onClick={downloadCurrentImage}
                        title="Baixar esta imagem"
                      >
                        <FaDownload />
                        Baixar imagem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* footer opcional */}
            <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
              <button
                className="h-10 px-4 rounded bg-gray-200 hover:bg-gray-300"
                onClick={closeGallery}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ====== /MODAL GALERIA ====== */}
    </div>
  );
}
