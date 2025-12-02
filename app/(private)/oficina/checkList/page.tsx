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
  FaEdit,
  FaCalendarAlt,
  FaUser,
  FaCar,
  FaGasPump,
  FaEye,
} from "react-icons/fa";
import { useEffect, useMemo, useRef, useState } from "react";
import { serviceUrl } from "@/lib/services";

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
  fotoKey: string; // Nova propriedade: key da imagem
  peca: string | null;
  observacoes: string | null;
  tipo: string | null;
  imageUrl?: string; // URL temporária da imagem
};

type ImageUrlResponse = {
  ok: boolean;
  url: string;
};

const OFICINA_BASE = serviceUrl("oficina");
const API_BASE = `${OFICINA_BASE}/oficina/checklists`;
const IMG_API_BASE = `${OFICINA_BASE}/oficina/img`;
const UPLOADS_API_BASE = `${OFICINA_BASE}/oficina/uploads/avarias/url`;

function ChecklistCard({
  item,
  isAdmin,
  onView,
  onGallery,
  onPdf,
}: {
  item: ChecklistRow;
  isAdmin: boolean;
  onView: (os: string) => void;
  onGallery: (id: string) => void;
  onPdf: (id: string) => void;
}) {
  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR");
  };

  return (
    <div className="bg-white dark:bg-boxdark rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100 dark:border-strokedark">
      <div className="bg-gray-50 dark:bg-meta-4 p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
            OS Interna
          </div>
          <div className="text-xl font-bold text-gray-800 dark:text-white">
            #{item.osInterna || "-"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
            Entrada
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center justify-end gap-1">
            <FaCalendarAlt className="text-gray-400" />
            {fmtDateTime(item.dataHoraEntrada)}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
            <FaUser size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
            <p className="font-medium truncate">{item.clienteNome || "-"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 dark:text-orange-400 shrink-0">
            <FaCar size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">Placa</p>
            <p className="font-medium truncate">{item.veiculoPlaca || "-"}</p>
          </div>
        </div>


      </div>

      <div className="p-4 pt-0 mt-auto grid grid-cols-3 gap-2">
        <button
          onClick={() => onView(String(item.osInterna))}
          className="col-span-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-300 transition-colors"
          title="Visualizar"
        >
          <FaEye className="text-blue-500" />
          <span className="text-[10px] font-medium uppercase">Ver</span>
        </button>

        <button
          onClick={() => onGallery(String(item.id))}
          className="col-span-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-300 transition-colors"
          title="Galeria de Avarias"
        >
          <FaImages className="text-purple-500" />
          <span className="text-[10px] font-medium uppercase">Fotos</span>
        </button>

        <button
          onClick={() => onPdf(String(item.id))}
          className="col-span-1 flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 text-gray-600 dark:text-gray-300 transition-colors"
          title="Baixar PDF"
        >
          <FaFilePdf className="text-red-500" />
          <span className="text-[10px] font-medium uppercase">PDF</span>
        </button>
      </div>
    </div>
  );
}

export default function ChecklistsList() {


  // Filtros (aplicados no front)
  const [qOsInterna, setQOSInterna] = useState("");
  const [qPlaca, setQPlaca] = useState("");
  const [qDataDe, setQDataDe] = useState(""); // YYYY-MM-DD
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

  // ====== MODAL DE EDIÇÃO CHECKLIST ======
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editData, setEditData] = useState<any | null>(null);
  // ====== VISUALIZAR: abrir/fechar ======
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<any>(null);
  const [viewTab, setViewTab] = useState(0); // 0: Dados, 1: Itens, 2: Avarias
  const [viewImages, setViewImages] = useState<AvariaImage[]>([]); // Imagens para a aba de avarias

  // ====== ADMIN? (lê localStorage uma vez) ======
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    // roda no cliente
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      setIsAdmin(userData?.setor === "Admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);

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
        if (editModalOpen) closeEditModal();
        if (viewModalOpen) closeViewModal();
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
  }, [galleryOpen, galleryIndex, galleryItems.length, editModalOpen, viewModalOpen]);

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

  // 👉 helper: converte "YYYY-MM-DDTHH:mm" para ISO, se necessário
  function toIsoIfLocal(dt?: string | null) {
    if (!dt) return dt;
    if (/Z$|[+-]\d{2}:\d{2}$/.test(dt)) return dt;
    const d = new Date(dt);
    return isNaN(d.getTime()) ? dt : d.toISOString();
  }

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
        } catch { }
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

  // ====== EDITAR: abrir/fechar/bind ======
  async function openEditModal(osInterna: string) {
    setEditModalOpen(true);
    setEditLoading(true);
    setEditError(null);
    setEditData(null);
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(osInterna)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      const data = await res.json();
      setEditData(data);
    } catch (e: any) {
      setEditError(e?.message || "Falha ao buscar dados");
    } finally {
      setEditLoading(false);
    }
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditData(null);
    setEditError(null);
  }

  // ====== VISUALIZAR: abrir/fechar ======
  async function openViewModal(osInterna: string) {
    if (!osInterna) return;
    setViewModalOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewData(null);
    setViewTab(0);
    setViewImages([]);

    try {
      // 1. Buscar dados do checklist
      const res = await fetch(`${API_BASE}/${encodeURIComponent(osInterna)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
      const data = await res.json();
      setViewData(data);

      // 2. Buscar imagens para a aba de avarias (se houver ID)
      if (data.id) {
        fetchViewImages(data.id);
      }
    } catch (e: any) {
      setViewError(e?.message || "Erro ao carregar checklist");
    } finally {
      setViewLoading(false);
    }
  }

  // Busca imagens para o modal de visualização (aba Avarias)
  async function fetchViewImages(checklistId: string | number) {
    try {
      const res = await fetch(`${IMG_API_BASE}/${encodeURIComponent(checklistId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const json = await res.json();
      const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

      const items: AvariaImage[] = (data as any[]).map((x) => ({
        fotoKey: x.fotoBase64 || x.fotoKey,
        peca: x.peca ?? null,
        observacoes: x.observacoes ?? null,
        tipo: x.tipo ?? null,
      }));

      // Buscar URLs
      for (let i = 0; i < items.length; i++) {
        const imageUrl = await fetchImageUrl(items[i].fotoKey);
        if (imageUrl) {
          items[i].imageUrl = imageUrl;
        }
      }
      setViewImages(items);
    } catch (e) {
      console.error("Erro ao buscar imagens para visualização:", e);
    }
  }

  function closeViewModal() {
    setViewModalOpen(false);
    setViewData(null);
    setViewImages([]);
  }

  // Função para atualizar campo do checklist (editar)
  function handleEditChange(field: string, value: any) {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  }

  // Função para atualizar item do array (editar)
  function handleEditArrayChange(
    arrayName: string,
    idx: number,
    field: string,
    value: any
  ) {
    setEditData((prev: any) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item: any, i: number) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  }

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
            msg = Array.isArray(err.message) ? err.message.join(", ") : err.message;
        } catch { }
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

  // ---------- Nova função para buscar URL da imagem ----------
  async function fetchImageUrl(key: string, signal?: AbortSignal): Promise<string | null> {
    try {
      const res = await fetch(`${UPLOADS_API_BASE}?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`);
      }

      const json: ImageUrlResponse = await res.json();
      return json.ok ? json.url : null;
    } catch (e) {
      console.error("Erro ao buscar URL da imagem:", e);
      return null;
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
        } catch { }
        throw new Error(msg);
      }
      const json = await res.json();
      const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];

      // Mapear os itens usando a nova estrutura
      const items: AvariaImage[] = (data as any[]).map((x) => ({
        fotoKey: x.fotoBase64 || x.fotoKey, // Aceita ambos os nomes por compatibilidade
        peca: x.peca ?? null,
        observacoes: x.observacoes ?? null,
        tipo: x.tipo ?? null,
      }));

      setGalleryItems(items);
      setGalleryIndex(0);

      // Buscar URLs das imagens (sequencial, respeitando abort)
      for (let i = 0; i < items.length; i++) {
        if (ctrl.signal.aborted) break;
        const imageUrl = await fetchImageUrl(items[i].fotoKey, ctrl.signal);
        if (imageUrl && !ctrl.signal.aborted) {
          setGalleryItems((currentItems) =>
            currentItems.map((item, index) => (index === i ? { ...item, imageUrl } : item))
          );
        }
      }
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

  async function downloadCurrentImage() {
    const cur = galleryItems[galleryIndex];
    if (!cur?.fotoKey) return;

    try {
      // Se já temos a URL, usa ela
      let imageUrl = cur.imageUrl;

      // Se não temos a URL, busca
      if (!imageUrl) {
        const fetchedUrl = await fetchImageUrl(cur.fotoKey);
        if (!fetchedUrl) {
          alert("Não foi possível obter a URL da imagem");
          return;
        }
        imageUrl = fetchedUrl;
      }

      // Baixa a imagem
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `avaria-${ts}-${galleryIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Erro ao baixar imagem:", msg);
      alert("Erro ao baixar imagem: " + msg);
    }
  }

  // ---------- Salvar edição (PUT) ----------
  async function saveEditData() {
    if (!editData?.id) return;
    try {
      setEditLoading(true);
      setEditError(null);

      // normaliza datetime-local -> ISO
      if (editData.dataHoraEntrada) {
        editData.dataHoraEntrada = toIsoIfLocal(editData.dataHoraEntrada);
      }

      const res = await fetch(`${API_BASE}/${encodeURIComponent(editData.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        let msg = `Erro HTTP: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
          if (j?.error) msg = j.error;
        } catch { }
        throw new Error(msg);
      }

      alert("Checklist atualizado com sucesso!");
      closeEditModal();
      fetchAll(); // Recarrega a lista após salvar
    } catch (e: any) {
      setEditError(e?.message || "Falha ao salvar dados");
    } finally {
      setEditLoading(false);
    }
  }

  const pageSizes: (10 | 20 | 50)[] = [10, 20, 50];

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Checklists (Oficina)</h3>
          <div className="flex items-center gap-2">
            {/* Recarregar */}
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-meta-4 text-gray-700 dark:text-white border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-opacity-90 hover:border-gray-300 shadow-sm transition-all duration-200 disabled:opacity-50"
              title="Recarregar do servidor"
            >
              <FaSync className={loading ? "animate-spin" : ""} size={18} />
              <span className="text-sm font-medium">Atualizar</span>
            </button>
          </div>
        </div>

        {/* Listagem */}
        <div id="list" className="space-y-6">
          {/* Filtros */}
          <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-4 border border-gray-100 dark:border-strokedark flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-1 gap-3 flex-wrap">
              <input
                type="text"
                value={qOsInterna}
                onChange={(e) => setQOSInterna(e.target.value)}
                className="flex-1 min-w-[160px] h-10 px-4 border border-gray-300 dark:border-form-strokedark rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
                placeholder="OS Interna"
              />
              <input
                type="text"
                value={qPlaca}
                onChange={(e) => setQPlaca(e.target.value.toUpperCase().trim())}
                className="flex-1 min-w-[140px] h-10 px-4 border border-gray-300 dark:border-form-strokedark rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
                placeholder="Placa"
              />
              <input
                type="date"
                value={qDataDe}
                onChange={(e) => setQDataDe(e.target.value)}
                className="h-10 px-4 border border-gray-300 dark:border-form-strokedark rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
                placeholder="Data De"
              />
              <input
                type="date"
                value={qDataAte}
                onChange={(e) => setQDataAte(e.target.value)}
                className="h-10 px-4 border border-gray-300 dark:border-form-strokedark rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
                placeholder="Data Até"
              />
              <button
                className="bg-white dark:bg-meta-4 border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-opacity-90 h-10 px-4 rounded-lg font-medium transition-colors shadow-sm"
                onClick={onClear}
              >
                Limpar filtros
              </button>
            </div>

            {/* PageSize dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative" ref={pageSizeRef}>
                <button
                  className="bg-white dark:bg-meta-4 border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-opacity-90 h-10 px-4 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
                  aria-haspopup="listbox"
                  aria-expanded={pageSizeOpen}
                  onClick={() => setPageSizeOpen((v) => !v)}
                >
                  <span className="mr-1">{pageSize} itens</span>
                  <FaCaretDown />
                </button>
                {pageSizeOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-lg shadow-xl z-10 overflow-hidden" role="listbox" tabIndex={-1}>
                    {pageSizes.map((n) => (
                      <button
                        key={n}
                        role="option"
                        aria-selected={pageSize === (n as 10 | 20 | 50)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-meta-4 text-gray-700 dark:text-gray-300 ${pageSize === n ? "bg-gray-50 dark:bg-meta-4 font-semibold" : ""
                          }`}
                        onClick={() => {
                          setPageSize(n as 10 | 20 | 50);
                          setPage(1);
                          setPageSizeOpen(false);
                        }}
                      >
                        {n} itens
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info topo */}
          <div className="text-sm text-gray-600 mb-2">
            Registros carregados: <b>{rawItems.length}</b> · Filtrados: <b>{filtered.length}</b>
            {!isDateRangeValid && <span className="ml-3 text-red-600">Intervalo de datas inválido.</span>}
          </div>

          {/* Grid de Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-boxdark h-80 rounded-xl shadow-sm border border-gray-100 dark:border-strokedark animate-pulse"></div>
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-boxdark rounded-xl border border-dashed border-gray-300 dark:border-strokedark shadow-sm mb-6">
              <p className="text-gray-500 dark:text-gray-400">Nenhum checklist encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {paged.map((row) => (
                <ChecklistCard
                  key={row.id}
                  item={row}
                  isAdmin={isAdmin}
                  onView={openViewModal}
                  onGallery={openGallery}
                  onPdf={downloadChecklistPdf}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-strokedark mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando página <span className="font-semibold text-black dark:text-white">{page}</span> de <span className="font-semibold text-black dark:text-white">{totalPages}</span>
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
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====== MODAL GALERIA ====== */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" aria-modal="true" role="dialog">
          {/* overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeGallery} />

          {/* content */}
          <div className="relative z-10 w-full max-w-5xl mx-4 rounded-xl bg-white dark:bg-boxdark shadow-2xl">
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-strokedark">
              <div className="font-semibold text-black dark:text-white">
                Galeria de fotos {galleryItems.length ? `(${galleryIndex + 1}/${galleryItems.length})` : ""}
              </div>
              <button
                className="h-10 w-10 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white"
                onClick={closeGallery}
                title="Fechar"
              >
                <FaTimes />
              </button>
            </div>

            {/* body */}
            <div className="p-4">
              {galleryLoading && <div className="py-16 text-center text-gray-600">Carregando imagens...</div>}
              {galleryError && <div className="py-16 text-center text-red-600">{galleryError}</div>}

              {!galleryLoading && !galleryError && galleryItems.length === 0 && (
                <div className="py-16 text-center text-gray-600">Nenhuma imagem encontrada para este checklist.</div>
              )}

              {!galleryLoading && !galleryError && galleryItems.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* área da imagem com navegação lateral */}
                  <div className="lg:col-span-8">
                    <div className="relative w-full aspect-[4/3] bg-gray-50 dark:bg-meta-4 rounded-lg overflow-hidden flex items-center justify-center">
                      {/* seta esquerda */}
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white dark:bg-boxdark shadow flex items-center justify-center hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white"
                        onClick={prevImage}
                        title="Anterior"
                      >
                        <FaChevronLeft />
                      </button>

                      {/* imagem */}
                      {galleryItems[galleryIndex]?.imageUrl ? (
                        <img
                          src={galleryItems[galleryIndex].imageUrl}
                          alt="Avaria"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-gray-500">Carregando imagem...</div>
                      )}

                      {/* seta direita */}
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white dark:bg-boxdark shadow flex items-center justify-center hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white"
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
                            className={`h-2.5 rounded-full transition-all ${i === galleryIndex ? "w-6 bg-blue-600" : "w-2.5 bg-gray-300"
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
                    <div className="rounded-lg border border-gray-200 dark:border-strokedark p-3 bg-gray-50 dark:bg-meta-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Informações da avaria</div>
                      <dl className="text-sm text-black dark:text-white">
                        <dt className="font-semibold">Tipo</dt>
                        <dd className="mb-2">{galleryItems[galleryIndex]?.tipo ?? "—"}</dd>

                        <dt className="font-semibold">Peça</dt>
                        <dd className="mb-2">{galleryItems[galleryIndex]?.peca ?? "—"}</dd>

                        <dt className="font-semibold">Observações</dt>
                        <dd className="mb-2 whitespace-pre-wrap break-words">
                          {galleryItems[galleryIndex]?.observacoes ?? "—"}
                        </dd>
                      </dl>
                    </div>

                    <div className="mt-3">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 w-full"
                        onClick={downloadCurrentImage}
                        title="Baixar esta imagem"
                        disabled={!galleryItems[galleryIndex]?.imageUrl}
                      >
                        <FaDownload />
                        Baixar imagem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-strokedark flex items-center justify-end gap-2">
              <button className="h-10 px-4 rounded bg-gray-200 dark:bg-meta-4 hover:bg-gray-300 dark:hover:bg-opacity-90 text-black dark:text-white" onClick={closeGallery}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* ====== MODAL DE EDIÇÃO CHECKLIST ====== */}
      {
        editModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditModal} />
            <div className="relative z-10 w-full max-w-3xl mx-4 rounded-xl bg-white dark:bg-boxdark shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-strokedark">
                <div className="font-semibold text-black dark:text-white">Checklist - Editar</div>
                <button
                  className="h-10 w-10 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white"
                  onClick={closeEditModal}
                  title="Fechar"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {editLoading && <div className="py-16 text-center text-gray-600">Carregando...</div>}
                {editError && <div className="py-16 text-center text-red-600">{editError}</div>}
                {editData && (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEditData();
                    }}
                  >
                    {/* Campos principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">OS Interna</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.osInterna ?? ""}
                          onChange={(e) => handleEditChange("osInterna", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Data/Hora Entrada</label>
                        <input
                          type="datetime-local"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.dataHoraEntrada ? String(editData.dataHoraEntrada).slice(0, 16) : ""}
                          onChange={(e) => handleEditChange("dataHoraEntrada", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Observações</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.observacoes ?? ""}
                          onChange={(e) => handleEditChange("observacoes", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Combustível (%)</label>
                        <input
                          type="number"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.combustivelPercentual ?? ""}
                          onChange={(e) => handleEditChange("combustivelPercentual", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Cliente Nome</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.clienteNome ?? ""}
                          onChange={(e) => handleEditChange("clienteNome", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Cliente Doc</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.clienteDoc ?? ""}
                          onChange={(e) => handleEditChange("clienteDoc", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Cliente Tel</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.clienteTel ?? ""}
                          onChange={(e) => handleEditChange("clienteTel", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Cliente Endereço</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.clienteEnd ?? ""}
                          onChange={(e) => handleEditChange("clienteEnd", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Veículo Nome</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.veiculoNome ?? ""}
                          onChange={(e) => handleEditChange("veiculoNome", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Veículo Placa</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.veiculoPlaca ?? ""}
                          onChange={(e) => handleEditChange("veiculoPlaca", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Veículo Cor</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.veiculoCor ?? ""}
                          onChange={(e) => handleEditChange("veiculoCor", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-black dark:text-white">Veículo KM</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                          value={editData.veiculoKm ?? ""}
                          onChange={(e) => handleEditChange("veiculoKm", e.target.value)}
                        />
                      </div>
                    </div>
                    {/* Itens do checklist */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Itens do Checklist</label>
                      <div className="space-y-2">
                        {editData.ofi_checklists_items?.map((item: any, idx: number) => (
                          <div key={item.id ?? idx} className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                              value={item.item ?? ""}
                              onChange={(e) => handleEditArrayChange("ofi_checklists_items", idx, "item", e.target.value)}
                            />
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                              value={item.status ?? ""}
                              onChange={(e) => handleEditArrayChange("ofi_checklists_items", idx, "status", e.target.value)}
                            />
                            <span className="text-xs text-gray-400">ID: {item.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Avarias */}
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Avarias</label>
                      <div className="space-y-2">
                        {editData.ofi_checklists_avarias?.map((av: any, idx: number) => (
                          <div key={av.id ?? idx} className="grid grid-cols-4 gap-2">
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                              value={av.tipo ?? ""}
                              onChange={(e) => handleEditArrayChange("ofi_checklists_avarias", idx, "tipo", e.target.value)}
                              placeholder="Tipo"
                            />
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                              value={av.peca ?? ""}
                              onChange={(e) => handleEditArrayChange("ofi_checklists_avarias", idx, "peca", e.target.value)}
                              placeholder="Peça"
                            />
                            <input
                              type="text"
                              className="border border-gray-300 dark:border-form-strokedark rounded px-2 py-1 bg-white dark:bg-form-input text-black dark:text-white focus:border-blue-500 focus:outline-none"
                              value={av.observacoes ?? ""}
                              onChange={(e) =>
                                handleEditArrayChange("ofi_checklists_avarias", idx, "observacoes", e.target.value)
                              }
                              placeholder="Observações"
                            />
                            <span className="text-xs text-gray-400">ID: {av.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="h-10 px-4 rounded bg-gray-200 dark:bg-meta-4 hover:bg-gray-300 dark:hover:bg-opacity-90 text-black dark:text-white"
                        onClick={closeEditModal}
                      >
                        Fechar
                      </button>
                      <button
                        type="submit"
                        className={`h-10 px-4 rounded text-white font-semibold ${editLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        disabled={editLoading}
                      >
                        {editLoading ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* ====== MODAL DE VISUALIZAÇÃO (somente leitura) ====== */}
      {
        viewModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeViewModal} />
            <div className="relative z-10 w-full max-w-3xl mx-4 rounded-xl bg-white dark:bg-boxdark shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-strokedark">
                <div className="font-semibold text-black dark:text-white">Checklist - Visualização</div>
                <button
                  className="h-10 w-10 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white"
                  onClick={closeViewModal}
                  title="Fechar"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {viewLoading && <div className="py-16 text-center text-gray-600">Carregando...</div>}
                {viewError && <div className="py-16 text-center text-red-600">{viewError}</div>}

                {viewData && (
                  <div className="flex flex-col h-full">
                    {/* Abas */}
                    <div className="flex border-b border-gray-200 dark:border-strokedark mb-4">
                      <button
                        className={`px-4 py-2 font-medium text-sm transition-colors ${viewTab === 0
                          ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                        onClick={() => setViewTab(0)}
                      >
                        Dados Cadastrais
                      </button>
                      <button
                        className={`px-4 py-2 font-medium text-sm transition-colors ${viewTab === 1
                          ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                        onClick={() => setViewTab(1)}
                      >
                        Itens do Checklist
                      </button>
                      <button
                        className={`px-4 py-2 font-medium text-sm transition-colors ${viewTab === 2
                          ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          }`}
                        onClick={() => setViewTab(2)}
                      >
                        Avarias
                      </button>
                    </div>

                    {/* Conteúdo das Abas */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Aba 0: Dados Cadastrais */}
                      {viewTab === 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="OS Interna" value={viewData.osInterna} />
                          <Field label="Data/Hora Entrada" value={fmtDateTime(viewData.dataHoraEntrada)} />
                          <Field label="Nome/Razão Social" value={viewData.clienteNome} />
                          <Field label="Documento" value={viewData.clienteDoc} />
                          <Field label="Telefone" value={viewData.clienteTel} />
                          <Field label="Endereço" value={viewData.clienteEnd} />
                          <Field label="Veículo" value={viewData.veiculoNome} />
                          <Field label="Placa" value={viewData.veiculoPlaca} />
                          <Field label="Cor" value={viewData.veiculoCor} />
                          <Field label="KM" value={viewData.veiculoKm} />
                          <Field label="Combustível (%)" value={viewData.combustivelPercentual} />
                          <Field label="Observações" value={viewData.observacoes} />
                        </div>
                      )}

                      {/* Aba 1: Itens do Checklist */}
                      {viewTab === 1 && (
                        <div>
                          <div className="block text-sm font-semibold mb-2 text-black dark:text-white">Itens do Checklist</div>
                          {Array.isArray(viewData.ofi_checklists_items) && viewData.ofi_checklists_items.length > 0 ? (
                            <div className="space-y-2">
                              {viewData.ofi_checklists_items.map((item: any) => (
                                <div key={item.id} className="grid grid-cols-3 gap-2 text-sm">
                                  <Field label="Item" value={item.item} compact />
                                  <Field label="Status" value={item.status} compact />
                                  <div className="text-xs text-gray-400 self-center">ID: {item.id}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Sem itens.</div>
                          )}
                        </div>
                      )}

                      {/* Aba 2: Avarias */}
                      {viewTab === 2 && (
                        <div>
                          <div className="block text-sm font-semibold mb-2 text-black dark:text-white">Avarias</div>
                          {Array.isArray(viewData.ofi_checklists_avarias) && viewData.ofi_checklists_avarias.length > 0 ? (
                            <div className="space-y-4">
                              {viewData.ofi_checklists_avarias.map((av: any) => {
                                // Tentar encontrar imagem correspondente (por peça/tipo/obs ou apenas listar disponíveis)
                                // Como não temos ID direto, vamos listar um botão que abre a imagem se encontrarmos correspondência
                                // Ou melhor: listar todas as imagens associadas a este checklist se não conseguirmos vincular 1:1
                                // Mas o usuário pediu "link para a imagem de CADA avaria".
                                // Vamos tentar casar pelo índice ou conteúdo se possível.
                                // O endpoint de imagens retorna lista. Vamos assumir que a ordem pode ser a mesma ou tentar casar campos.
                                const matchingImg = viewImages.find(
                                  (img) =>
                                    (img.peca === av.peca && img.tipo === av.tipo && img.observacoes === av.observacoes)
                                );

                                return (
                                  <div key={av.id} className="border border-gray-200 dark:border-strokedark rounded-lg p-3 bg-gray-50 dark:bg-meta-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
                                      <Field label="Tipo" value={av.tipo} compact />
                                      <Field label="Peça" value={av.peca} compact />
                                      <Field label="Observações" value={av.observacoes} compact />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <div className="text-xs text-gray-400">ID: {av.id}</div>
                                      {matchingImg?.imageUrl ? (
                                        <a
                                          href={matchingImg.imageUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <FaImages /> Ver Imagem
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">Sem imagem vinculada</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">Sem avarias.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 dark:border-strokedark flex items-center justify-end gap-2">
                <button className="h-10 px-4 rounded bg-gray-200 dark:bg-meta-4 hover:bg-gray-300 dark:hover:bg-opacity-90 text-black dark:text-white" onClick={closeViewModal}>
                  Fechar
                </button>
                {isAdmin && viewData && (
                  <button
                    className="h-10 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2"
                    onClick={() => {
                      const os = viewData.osInterna;
                      closeViewModal();
                      if (os) openEditModal(os);
                    }}
                  >
                    <FaEdit />
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div>

  );
}

/**
 * Componente auxiliar para exibir um campo de leitura (label + valor)
 */
function Field({
  label,
  value,
  compact = false,
}: {
  label: string;
  value?: any;
  compact?: boolean;
}) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className={compact ? "" : "border border-gray-200 dark:border-strokedark rounded px-3 py-2 bg-gray-50 dark:bg-meta-4"}>
      <div className={`text-xs ${compact ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300"} mb-1`}>{label}</div>
      <div className="text-sm text-black dark:text-white">{display}</div>
    </div>
  );
}
