// app/comparativo/page.tsx
"use client";

import { useMemo, useState, useCallback, useRef } from "react";

type ApiItem = {
  id: string | number;
  pro_codigo: string | number;
  pro_descricao: string;
  mar_descricao: string | null;
  referencia: string | null;
  unidade: string | null;
  quantidade: string | number; // seed da API (usada só nos menores preços)
  emissao: string | null;
  valor_unitario: string | number | null;
  custo_fabrica: number | null;
  preco_custo?: number | null;
};

type ApiFornecedor = {
  pedido_cotacao: number;
  for_codigo: number;
  for_nome: string;
  cpf_cnpj: string | null;
  itens: ApiItem[];
};

type ApiResponseTodos = {
  pedido_cotacao: number;
  fornecedores: ApiFornecedor[];
};

// ====== CONFIG do endpoint de salvamento ======
const SAVE_URL = `${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/compras/pedido`;

// --- utils ---
const parseMoney = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

const fmtBRL = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

type Row = {
  pro_codigo: string;
  pro_descricao: string;
  prices: Record<number, number | null>; // preço por fornecedor
  costs: Record<number, number | null>;  // custo_fabrica por fornecedor
};

const keyPF = (pro_codigo: string | number, for_codigo: number) =>
  `${pro_codigo}::${for_codigo}`;

/* ========= helpers de UI (antes do componente) ========= */
const bgClassByPriceVsCost = (
  price: number | null | undefined,
  cost: number | null | undefined
) => {
  if (price == null || !Number.isFinite(price) || cost == null || !Number.isFinite(cost)) return "bg-white";
  if (Math.abs(price - cost) < 1e-9) return "bg-yellow-50";
  if (price < cost) return "bg-emerald-50";
  return "bg-orange-50";
};

const dotClassByVariation = (
  price: number | null | undefined,
  cost: number | null | undefined
) => {
  if (price == null || !Number.isFinite(price) || cost == null || !Number.isFinite(cost) || cost === 0)
    return "bg-gray-300";
  const diff = Math.abs(price - cost) / Math.abs(cost);
  return diff <= 0.10 ? "bg-emerald-500" : "bg-red-500";
};

const textClassByWinner = (isWinner: boolean, hasPrice: boolean) => {
  if (!hasPrice) return "text-gray-500";
  return isWinner ? "text-emerald-700" : "text-red-700";
};
/* ======================================================= */

export default function ComparativoPage() {
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pedidoCarregado, setPedidoCarregado] = useState<number | null>(null);
  const [fornecedores, setFornecedores] = useState<ApiFornecedor[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({}); // valores digitados por célula

  // Overrides de preço (edições manuais via modal): chave = pro_codigo::for_codigo
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  // estado do modal de edição de preço
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    pro_codigo: string;
    for_codigo: number;
    produto: string;
    fornecedor: string;
    value: number | null;
  } | null>(null);

  // ===== Modal de observações (clicando no cabeçalho do fornecedor) =====
  const [obsOpen, setObsOpen] = useState(false);
  const [obsLoading, setObsLoading] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);
  const [obsData, setObsData] = useState<any>(null);
  const [obsTarget, setObsTarget] = useState<{ for_codigo: number; for_nome: string } | null>(null);

  const openObservacao = async (f: ApiFornecedor) => {
    if (!pedidoCarregado) return;
    setObsOpen(true);
    setObsLoading(true);
    setObsError(null);
    setObsData(null);
    setObsTarget({ for_codigo: f.for_codigo, for_nome: f.for_nome });
    try {
      const url = `https://intranet-cotacao-fornecedor.naayqg.easypanel.host/api/cotacao/observacao?pedido_cotacao=${encodeURIComponent(
        pedidoCarregado
      )}&for_codigo=${encodeURIComponent(f.for_codigo)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        let emsg = `HTTP ${res.status}`;
        try {
          const e = await res.json();
          if (e?.error) emsg = e.error;
          else if (e?.message) emsg = e.message;
        } catch {}
        throw new Error(emsg);
      }
      const data = await res.json();
      setObsData(data);
    } catch (e: any) {
      setObsError(e?.message || "Falha ao buscar observação.");
    } finally {
      setObsLoading(false);
    }
  };

  // mapa com TODOS os campos do ApiItem por produto×fornecedor (para o payload)
  const [itemDetailsByPF, setItemDetailsByPF] = useState<
    Record<
      string,
      {
        id: string | number;
        pro_codigo: string | number;
        pro_descricao: string;
        mar_descricao: string | null;
        referencia: string | null;
        unidade: string | null;
        emissao: string | null;
        valor_unitario: number | null; // normalizado (base)
        custo_fabrica: number | null;
        preco_custo: number | null;
        for_codigo: number;
      }
    >
  >({});

  // ===== Linhas/colunas para render =====
  const rows: Row[] = useMemo(() => {
    if (!fornecedores.length) return [];
    const map = new Map<string, Row>();
    const details: typeof itemDetailsByPF = {};

    for (const f of fornecedores) {
      for (const it of f.itens) {
        const pc = String(it.pro_codigo);
        const preco = parseMoney(it.valor_unitario);
        const custoRaw =
          typeof it.custo_fabrica === "number"
            ? it.custo_fabrica
            : it.custo_fabrica != null
            ? parseMoney(it.custo_fabrica as any)
            : it.preco_custo != null
            ? (typeof it.preco_custo === "number" ? it.preco_custo : parseMoney(it.preco_custo as any))
            : null;

        if (!map.has(pc)) {
          map.set(pc, {
            pro_codigo: pc,
            pro_descricao: it.pro_descricao,
            prices: {},
            costs: {},
          });
        }
        const row = map.get(pc)!;
        row.prices[f.for_codigo] = preco;
        row.costs[f.for_codigo] = custoRaw ?? null;

        // preenche o espelho completo para o payload
        const k = keyPF(pc, f.for_codigo);
        details[k] = {
          id: it.id,
          pro_codigo: it.pro_codigo,
          pro_descricao: it.pro_descricao,
          mar_descricao: it.mar_descricao,
          referencia: it.referencia,
          unidade: it.unidade,
          emissao: it.emissao,
          valor_unitario: preco ?? null,
          custo_fabrica: custoRaw ?? null,
          preco_custo:
            typeof it.preco_custo === "number"
              ? it.preco_custo
              : parseMoney(it.preco_custo as any),
          for_codigo: f.for_codigo,
        };
      }
    }

    // salva details no state (para o salvar)
    setItemDetailsByPF(details);

    return Array.from(map.values()).sort((a, b) => {
      const ad = a.pro_descricao?.toLowerCase() ?? "";
      const bd = b.pro_descricao?.toLowerCase() ?? "";
      if (ad === bd) return a.pro_codigo.localeCompare(b.pro_codigo);
      return ad.localeCompare(bd);
    });
  }, [fornecedores]);

  const fornecedoresOrd = useMemo(
    () => [...fornecedores].sort((a, b) => a.for_nome.localeCompare(b.for_nome)),
    [fornecedores]
  );

  // ===== obter preço efetivo (considera override) =====
  const getEffectivePrice = useCallback(
    (pro_codigo: string, for_codigo: number, basePrice: number | null | undefined) => {
      const k = keyPF(pro_codigo, for_codigo);
      const ov = priceOverrides[k];
      return ov != null ? ov : basePrice ?? null;
    },
    [priceOverrides]
  );

  // ===== vencedores por linha (com base no preço efetivo) =====
  const cheapestByRow = useCallback((row: Row): Set<number> => {
    let min: number | null = null;
    for (const f of fornecedoresOrd) {
      const val = getEffectivePrice(row.pro_codigo, f.for_codigo, row.prices[f.for_codigo]);
      if (val != null && val > 0) {
        if (min == null || val < min) min = val;
      }
    }
    const winners = new Set<number>();
    if (min == null) return winners;
    for (const f of fornecedoresOrd) {
      const val = getEffectivePrice(row.pro_codigo, f.for_codigo, row.prices[f.for_codigo]);
      if (val != null && Math.abs(val - min) < 1e-9) winners.add(f.for_codigo);
    }
    return winners;
  }, [fornecedoresOrd, getEffectivePrice]);

  // ===== Buscar + seed SOMENTE nos menores preços (originais) =====
  const buscar = async () => {
    setMsg(null);
    const p = pedido.trim();
    if (!/^\d+$/.test(p)) {
      setMsg("Informe um pedido numérico.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://intranetbackend.acacessorios.local/compras/cotacao-sync/${encodeURIComponent(p)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        let emsg = `HTTP ${res.status}`;
        try {
          const e = await res.json();
          if (e?.error) emsg = e.error;
        } catch {}
        throw new Error(emsg);
      }
      const data: ApiResponseTodos = await res.json();

      if (!data?.fornecedores?.length) {
        setFornecedores([]);
        setPedidoCarregado(Number(p));
        setMsg("Nenhum fornecedor encontrado para este pedido.");
        setQuantities({});
        setPriceOverrides({});
        return;
      }

      setFornecedores(data.fornecedores);
      setPedidoCarregado(data.pedido_cotacao);

      // Monta seeds apenas em menores preços usando dados crus (fornecedores)
      const seeds = buildSeedsOnlyCheapest(data.fornecedores);
      setQuantities(seeds);

      // limpa overrides quando carrega um novo pedido
      setPriceOverrides({});

      requestAnimationFrame(() => focusFirstEditable());
    } catch (e: any) {
      setMsg(`Falha ao buscar: ${e?.message || "desconhecido"}`);
      setFornecedores([]);
      setPedidoCarregado(null);
      setQuantities({});
      setPriceOverrides({});
    } finally {
      setLoading(false);
    }
  };

  // seeds apenas nos menores preços (com base na resposta bruta)
  const buildSeedsOnlyCheapest = (fs: ApiFornecedor[]) => {
    const minByProd = new Map<string, number>(); // pro_codigo -> min preço
    for (const f of fs) {
      for (const it of f.itens) {
        const pc = String(it.pro_codigo);
        const price = parseMoney(it.valor_unitario);
        if (price != null && price > 0) {
          const cur = minByProd.get(pc);
          if (cur == null || price < cur) minByProd.set(pc, price);
        }
      }
    }
    const out: Record<string, number> = {};
    for (const f of fs) {
      for (const it of f.itens) {
        const pc = String(it.pro_codigo);
        const price = parseMoney(it.valor_unitario);
        const isMin = price != null && minByProd.has(pc) && Math.abs(price - (minByProd.get(pc)!)) < 1e-9;
        if (!isMin) continue;
        const qty = parseMoney(it.quantidade as any);
        if (qty != null && qty > 0) {
          out[keyPF(pc, f.for_codigo)] = qty; // só vencedor recebe seed
        }
      }
    }
    return out;
  };

  // ===== Navegação estilo Excel =====
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const setInputRef = (r: number, c: number, el: HTMLInputElement | null) => {
    const k = `${r}-${c}`;
    if (el) inputRefs.current.set(k, el);
    else inputRefs.current.delete(k);
  };

  const focusCell = (r: number, c: number) => {
    const k = `${r}-${c}`;
    const el = inputRefs.current.get(k);
    if (el) {
      el.focus();
      el.select();
      return true;
    }
    return false;
  };

  const findNext = (r: number, c: number, dir: "left" | "right" | "up" | "down") => {
    let nr = r, nc = c;
    const maxR = rows.length - 1;
    const maxC = fornecedoresOrd.length - 1;
    for (let i = 0; i < 5000; i++) {
      if (dir === "left") nc = Math.max(0, nc - 1);
      if (dir === "right") nc = Math.min(maxC, nc + 1);
      if (dir === "up") nr = Math.max(0, nr - 1);
      if (dir === "down") nr = Math.min(maxR, nr + 1);

      if (nr === r && nc === c) break;

      const k = `${nr}-${nc}`;
      const el = inputRefs.current.get(k);
      if (el) return { r: nr, c: nc };

      if ((dir === "left" && nc === 0) ||
          (dir === "right" && nc === maxC) ||
          (dir === "up" && nr === 0) ||
          (dir === "down" && nr === maxR)) {
        break;
      }
    }
    return null;
  };

  const onInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number
  ) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir =
        e.key === "ArrowLeft" ? "left" :
        e.key === "ArrowRight" ? "right" :
        e.key === "ArrowUp" ? "up" : "down";
      const next = findNext(r, c, dir);
      if (next) focusCell(next.r, next.c);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const dir = e.shiftKey ? "up" : "down";
      const next = findNext(r, c, dir as any);
      if (next) focusCell(next.r, next.c);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const dir = e.shiftKey ? "left" : "right";
      const next = findNext(r, c, dir as any);
      if (next) focusCell(next.r, next.c);
      return;
    }
  };

  const focusFirstEditable = () => {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < fornecedoresOrd.length; c++) {
        const k = `${r}-${c}`;
        const el = inputRefs.current.get(k);
        if (el) {
          el.focus();
          el.select();
          return;
        }
      }
    }
  };

  // ===== atualizar quantidade =====
  const setQty = (pro_codigo: string, for_codigo: number, v: string) => {
    const n = Number(String(v).replace(",", "."));
    const k = keyPF(pro_codigo, for_codigo);
    setQuantities((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(n) || n <= 0) {
        delete next[k];
      } else {
        next[k] = n;
      }
      return next;
    });
  };

  // ===== abrir modal para editar preço =====
  const openEditPrice = (row: Row, f: ApiFornecedor) => {
    const current = getEffectivePrice(row.pro_codigo, f.for_codigo, row.prices[f.for_codigo]);
    setEditTarget({
      pro_codigo: row.pro_codigo,
      for_codigo: f.for_codigo,
      produto: row.pro_descricao,
      fornecedor: f.for_nome,
      value: current ?? null,
    });
    setEditOpen(true);
  };

  // ===== confirmar edição de preço =====
  const confirmEditPrice = () => {
    if (!editTarget) return;
    const k = keyPF(editTarget.pro_codigo, editTarget.for_codigo);
    const v = editTarget.value;
    setPriceOverrides((prev) => {
      const next = { ...prev };
      if (v == null || !Number.isFinite(v) || v <= 0) {
        delete next[k]; // remove override -> volta ao valor original
      } else {
        next[k] = Number(v);
      }
      return next;
    });
    setEditOpen(false);
  };

  // ===== resumo topo =====
  const resumo = useMemo(() => {
    let itens = 0;
    let total = 0;
    for (const row of rows) {
      for (const f of fornecedoresOrd) {
        const k = keyPF(row.pro_codigo, f.for_codigo);
        const q = quantities[k];
        const price = getEffectivePrice(row.pro_codigo, f.for_codigo, row.prices[f.for_codigo]);
        if (q && q > 0 && price != null && Number.isFinite(price)) {
          itens += 1;
          total += q * price;
        }
      }
    }
    return { itens, total };
  }, [rows, fornecedoresOrd, quantities, getEffectivePrice]);

  // ===== SALVAR =====
  type SaveItem = {
    id: string | number;
    pro_codigo: string | number;
    pro_descricao: string;
    mar_descricao: string | null;
    referencia: string | null;
    unidade: string | null;
    emissao: string | null;
    valor_unitario: number | null; // pode ser override
    custo_fabrica: number | null;
    preco_custo: number | null;

    for_codigo: number;
    quantidade: number;
  };

  const buildSavePayload = (): { pedido_cotacao: number; itens: SaveItem[] } | null => {
    if (!pedidoCarregado) return null;

    const itens: SaveItem[] = [];
    for (const [k, q] of Object.entries(quantities)) {
      if (!q || q <= 0) continue;

      const details = itemDetailsByPF[k];
      if (!details) continue;

      // aplica override se houver
      const ov = priceOverrides[k];
      const valor_unitario_eff =
        ov != null ? ov : (details.valor_unitario != null ? details.valor_unitario : null);

      itens.push({
        id: details.id,
        pro_codigo: details.pro_codigo,
        pro_descricao: details.pro_descricao,
        mar_descricao: details.mar_descricao,
        referencia: details.referencia,
        unidade: details.unidade,
        emissao: details.emissao,
        valor_unitario: valor_unitario_eff,
        custo_fabrica: details.custo_fabrica,
        preco_custo: details.preco_custo ?? null,
        for_codigo: details.for_codigo,
        quantidade: q,
      });
    }

    return { pedido_cotacao: pedidoCarregado, itens };
  };

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const salvar = async () => {
    setSaveMsg(null);
    const payload = buildSavePayload();
    if (!payload) {
      setSaveMsg({ type: "err", text: "Nenhum pedido carregado." });
      return;
    }
    if (!payload.itens.length) {
      setSaveMsg({ type: "err", text: "Preencha pelo menos uma quantidade para salvar." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(SAVE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let emsg = `Falha ao salvar (HTTP ${res.status})`;
        try {
          const e = await res.json();
          if (e?.error) emsg = e.error;
          else if (e?.message) emsg = e.message;
        } catch {}
        throw new Error(emsg);
      }
      setSaveMsg({ type: "ok", text: "Itens salvos com sucesso!" });
    } catch (e: any) {
      setSaveMsg({ type: "err", text: e?.message || "Erro desconhecido ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen text-gray-900">
      <div className="mx-auto py-10">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comparativo de Preços por Fornecedor</h1>
            <p className="text-sm text-gray-500">
              Inputs editáveis. Semente de quantidade só no(s) menor(es) preço(s) de cada linha.
              Use ⬅️➡️⬆️⬇️, Enter/Shift+Enter e Tab/Shift+Tab para navegar. Clique no valor para editar.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Selecionados:</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                  {resumo.itens} {resumo.itens === 1 ? "item" : "itens"}
                </span>
                <span className="text-gray-400">•</span>
                <span className="font-medium">Total: {fmtBRL(resumo.total)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={salvar}
                disabled={saving}
                className={`h-10 rounded-lg px-4 text-white font-semibold transition
                  ${saving ? "bg-gray-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"}`}
                title="Enviar itens preenchidos"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.type === "ok" ? "text-emerald-700" : "text-red-700"}`}>
                  {saveMsg.text}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Busca */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Pedido de cotação (ex: 921)"
              value={pedido}
              onChange={(e) => setPedido(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:max-w-xs"
            />
            <button
              onClick={buscar}
              disabled={loading || !pedido.trim()}
              className={`h-11 rounded-lg px-4 text-white font-semibold transition
                ${loading || !pedido.trim() ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
            {pedidoCarregado && (
              <span className="text-sm text-gray-600">Pedido carregado: {pedidoCarregado}</span>
            )}
          </div>
          {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}
        </div>

        {/* Tabela */}
        {fornecedores.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold">Comparativo</h2>
              <Legend />
            </div>

            <div className="overflow-auto">
              <table
                className="w-full min-w-[1000px] table-auto border-separate border-spacing-0"
                role="grid"
                aria-label="Tabela comparativa editável (semente nos menores preços)"
              >
                <thead className="sticky top-0 bg-white">
                  <tr className="[&>th]:border-b [&>th]:border-gray-200 [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold">
                    <th style={{ width: 140 }}>Código</th>
                    <th>Descrição</th>
                    {fornecedoresOrd.map((f) => (
                      <th key={f.for_codigo} style={{ width: 260 }} className="text-right">
                        <button
                          type="button"
                          onClick={() => openObservacao(f)}
                          className="group flex w-full flex-col items-end text-right"
                          title="Clique para ver observações do fornecedor"
                        >
                          <span className="truncate max-w-[240px] underline decoration-dotted underline-offset-2 group-hover:underline" title={f.for_nome}>
                            {f.for_nome}
                          </span>
                          <span className="text-xs text-gray-500">#{f.for_codigo}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, rIdx) => {
                    const winners = cheapestByRow(row);
                    return (
                      <tr key={row.pro_codigo} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.pro_codigo}</td>
                        <td className="px-4 py-3">
                          <div className="whitespace-normal break-words">{row.pro_descricao}</div>
                        </td>
                        {fornecedoresOrd.map((f, cIdx) => {
                          const basePrice = row.prices[f.for_codigo] ?? null;
                          const price = getEffectivePrice(row.pro_codigo, f.for_codigo, basePrice);
                          const cost = row.costs[f.for_codigo] ?? null;
                          const isWinner = winners.has(f.for_codigo);

                          const bg = bgClassByPriceVsCost(price, cost);
                          const txt = textClassByWinner(isWinner, price != null);
                          const fw = isWinner ? "font-semibold" : "font-medium";
                          const dot = dotClassByVariation(price, cost);

                          const k = keyPF(row.pro_codigo, f.for_codigo);
                          const q = quantities[k] ?? 0;

                          const ring = q > 0 ? "ring-2 ring-indigo-400" : "ring-0";
                          const hasPrice = price != null && Number.isFinite(price);
                          const edited = priceOverrides[k] != null;

                          return (
                            <td
                              key={f.for_codigo}
                              className={`px-3 py-2 text-right ${bg} ${txt} ${fw}`}
                              role="gridcell"
                              aria-colindex={cIdx + 3}
                              aria-rowindex={rIdx + 2}
                            >
                              {/* Linha do preço (clicável para abrir modal) */}
                              <button
                                type="button"
                                onClick={() => openEditPrice(row, f)}
                                className="group inline-flex items-center justify-end gap-2 w-full"
                                title="Clique para editar o valor"
                              >
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
                                <span className="min-w-[84px] text-right underline-offset-2 group-hover:underline">
                                  {fmtBRL(price)}
                                </span>
                                {edited && (
                                  <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                    editado
                                  </span>
                                )}
                              </button>

                              {/* Quantidade */}
                              <div className="mt-2 flex items-center justify-end gap-2">
                                <label className="sr-only" htmlFor={`qty-${rIdx}-${cIdx}`}>
                                  Quantidade
                                </label>
                                <input
                                  id={`qty-${rIdx}-${cIdx}`}
                                  ref={(el) => setInputRef(rIdx, cIdx, el)}
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step="any"
                                  value={q || ""}
                                  onChange={(e) => setQty(row.pro_codigo, f.for_codigo, e.target.value)}
                                  onKeyDown={(e) => onInputKeyDown(e, rIdx, cIdx)}
                                  className={`h-9 w-28 rounded-md border border-gray-300 px-2 text-right outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 ${ring}`}
                                  placeholder="Qtd"
                                  title={isWinner ? "Menor preço: veio com seed da API" : "Digite a quantidade"}
                                />
                              </div>

                              {/* Subtotal */}
                              <div className="mt-2 flex items-center justify-end">
                                {q > 0 && hasPrice && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                    {q} × {fmtBRL(price)} = {fmtBRL(q * (price ?? 0))}
                                  </span>
                                )}
                              </div>

                              {/* Custo */}
                              <div className="mt-1 text-xs text-gray-500">
                                Custo fábrica: {fmtBRL(cost)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={2 + fornecedoresOrd.length} className="px-4 py-8 text-center text-gray-500">
                        Nenhum item com preços para comparar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ===== Modal de observações do fornecedor ===== */}
      {obsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setObsOpen(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Observações do fornecedor</h3>
                {obsTarget && (
                  <p className="mt-1 text-sm text-gray-600">
                    {obsTarget.for_nome} <span className="text-gray-500">#{obsTarget.for_codigo}</span> • Pedido {pedidoCarregado}
                  </p>
                )}
              </div>
              <button
                onClick={() => setObsOpen(false)}
                className="h-9 w-9 rounded-md hover:bg-gray-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
              {obsLoading && <div className="text-gray-600">Carregando...</div>}
              {!obsLoading && obsError && (
                <div className="text-red-700">{obsError}</div>
              )}
              {!obsLoading && !obsError && (
                <ObservacaoContent data={obsData} />
              )}
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={() => setObsOpen(false)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de edição de preço ===== */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Editar valor</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="h-9 w-9 rounded-md hover:bg-gray-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <div><span className="font-semibold">Produto:</span> {editTarget.produto}</div>
              <div><span className="font-semibold">Fornecedor:</span> {editTarget.fornecedor} <span className="text-gray-500">#{editTarget.for_codigo}</span></div>
              <div><span className="font-semibold">Código:</span> {editTarget.pro_codigo}</div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Novo valor (R$)</label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                autoFocus
                value={editTarget.value ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditTarget((prev) => prev ? { ...prev, value: v === "" ? null : Number(v) } : prev);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="Ex.: 39.9"
              />
              <p className="mt-1 text-xs text-gray-500">Deixe em branco ou 0 para remover a edição e voltar ao valor original.</p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEditPrice}
                className="h-10 rounded-lg bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
      <div className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-emerald-50 border border-emerald-200" /> Preço &lt; custo fábrica
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-yellow-50 border border-yellow-200" /> Preço = custo fábrica
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-orange-50 border border-orange-200" /> Preço &gt; custo fábrica
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="text-gray-600">Clique no valor para editar. O valor editado é enviado para a API.</span>
      </div>
    </div>
  );
}

// Renderiza conteúdo da observação de forma resiliente
function ObservacaoContent({ data }: { data: any }) {
  if (data == null) {
    return <div className="text-gray-500">Sem observações.</div>;
  }
  if (typeof data === "string") {
    return <div className="whitespace-pre-wrap">{data || "Sem observações."}</div>;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="text-gray-500">Sem observações.</div>;
    // Tenta extrair campos comuns
    return (
      <ul className="list-disc pl-5 space-y-1">
        {data.map((it, idx) => {
          const txt =
            typeof it === "string"
              ? it
              : it?.observacao ?? it?.obs ?? it?.descricao ?? JSON.stringify(it, null, 2);
          return <li key={idx} className="whitespace-pre-wrap">{txt}</li>;
        })}
      </ul>
    );
  }
  // Objeto genérico
  const guess =
    data?.observacao ?? data?.obs ?? data?.descricao ?? null;
  if (guess) {
    return <div className="whitespace-pre-wrap">{String(guess)}</div>;
  }
  return (
    <pre className="whitespace-pre-wrap text-xs text-gray-700">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
