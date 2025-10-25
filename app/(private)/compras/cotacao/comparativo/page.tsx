// app/comparativo/page.tsx
"use client";

import { useMemo, useState } from "react";

type ApiItem = {
  id: string | number;
  pro_codigo: string | number;
  pro_descricao: string;
  mar_descricao: string | null;
  referencia: string | null;
  unidade: string | null;
  quantidade: string | number;
  emissao: string | null;
  valor_unitario: string | number | null;

  // 👇 agora vindo do back:
  custo_fabrica: number | null;

  // 👇 fallback se algum payload antigo ainda vier:
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

export default function ComparativoPage() {
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pedidoCarregado, setPedidoCarregado] = useState<number | null>(null);
  const [fornecedores, setFornecedores] = useState<ApiFornecedor[]>([]);

  // monta as linhas agrupando por código do produto
  const rows: Row[] = useMemo(() => {
    if (!fornecedores.length) return [];

    const map = new Map<string, Row>();
    for (const f of fornecedores) {
      for (const it of f.itens) {
        const key = String(it.pro_codigo);
        const preco = parseMoney(it.valor_unitario);

        // lê custo_fabrica; se não vier, tenta preco_custo como fallback
        const custoRaw =
          typeof it.custo_fabrica === "number"
            ? it.custo_fabrica
            : it.custo_fabrica != null
            ? parseMoney(it.custo_fabrica as any)
            : it.preco_custo != null
            ? (typeof it.preco_custo === "number" ? it.preco_custo : parseMoney(it.preco_custo as any))
            : null;

        if (!map.has(key)) {
          map.set(key, {
            pro_codigo: key,
            pro_descricao: it.pro_descricao,
            prices: {},
            costs: {},
          });
        }
        const row = map.get(key)!;
        row.prices[f.for_codigo] = preco;
        row.costs[f.for_codigo] = custoRaw ?? null;
      }
    }
    // ordena por descrição (fallback: código)
    return Array.from(map.values()).sort((a, b) => {
      const ad = a.pro_descricao?.toLowerCase() ?? "";
      const bd = b.pro_descricao?.toLowerCase() ?? "";
      if (ad === bd) return a.pro_codigo.localeCompare(b.pro_codigo);
      return ad.localeCompare(bd);
    });
  }, [fornecedores]);

  // ordem de colunas (fornecedores)
  const fornecedoresOrd = useMemo(
    () => [...fornecedores].sort((a, b) => a.for_nome.localeCompare(b.for_nome)),
    [fornecedores]
  );

  // encontra vencedores (menor preço > 0) por linha
  const cheapestByRow = (row: Row): Set<number> => {
    let min: number | null = null;
    for (const f of fornecedoresOrd) {
      const val = row.prices[f.for_codigo];
      if (val != null && val > 0) {
        if (min == null || val < min) min = val;
      }
    }
    const winners = new Set<number>();
    if (min == null) return winners;
    for (const f of fornecedoresOrd) {
      const val = row.prices[f.for_codigo];
      if (val != null && Math.abs(val - min) < 1e-9) winners.add(f.for_codigo);
    }
    return winners;
  };

  // 1) fundo por comparação preço × custo_fabrica
  const bgClassByPriceVsCost = (price: number | null | undefined, cost: number | null | undefined) => {
    if (price == null || !Number.isFinite(price) || cost == null || !Number.isFinite(cost)) {
      return "bg-white";
    }
    if (Math.abs(price - cost) < 1e-9) return "bg-yellow-50"; // igual
    if (price < cost) return "bg-emerald-50";                // abaixo do custo
    return "bg-orange-50";                                   // acima do custo
  };

  // 2) bolinha: variação relativa vs custo_fabrica
  const dotClassByVariation = (price: number | null | undefined, cost: number | null | undefined) => {
    if (price == null || !Number.isFinite(price) || cost == null || !Number.isFinite(cost) || cost === 0) {
      return "bg-gray-300";
    }
    const diff = Math.abs(price - cost) / Math.abs(cost);
    return diff <= 0.10 ? "bg-emerald-500" : "bg-red-500"; // ≤10% verde; >10% vermelha
  };

  // 3) texto: vencedor verde, demais vermelho
  const textClassByWinner = (isWinner: boolean, hasPrice: boolean) => {
    if (!hasPrice) return "text-gray-500";
    return isWinner ? "text-emerald-700" : "text-red-700";
  };

  const buscar = async () => {
    setMsg(null);
    const p = pedido.trim();
    if (!/^\d+$/.test(p)) {
      setMsg("Informe um pedido numérico.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/compras/cotacao-sync/${encodeURIComponent(p)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        let emsg = `HTTP ${res.status}`;
        try {
          const e = await res.json();
          if (e?.error) emsg = e.error;
        } catch {}
        throw new Error(emsg);
      }
      const data: ApiResponseTodos = await res.json();

      if (!data?.fornecedores || !Array.isArray(data.fornecedores) || data.fornecedores.length === 0) {
        setFornecedores([]);
        setPedidoCarregado(Number(p));
        setMsg("Nenhum fornecedor encontrado para este pedido.");
        return;
      }

      setFornecedores(data.fornecedores);
      setPedidoCarregado(data.pedido_cotacao);
    } catch (e: any) {
      setMsg(`Falha ao buscar: ${e?.message || "desconhecido"}`);
      setFornecedores([]);
      setPedidoCarregado(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Comparativo de Preços por Fornecedor</h1>
          <p className="text-sm text-gray-500">Digite o número do pedido de cotação e compare os valores por fornecedor.</p>
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
              <table className="w-full min-w-[900px] table-auto border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white">
                  <tr className="[&>th]:border-b [&>th]:border-gray-200 [&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold">
                    <th style={{ width: 140 }}>Código</th>
                    <th>Descrição</th>
                    {fornecedoresOrd.map((f) => (
                      <th key={f.for_codigo} style={{ width: 180 }} className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="truncate max-w-[220px]" title={f.for_nome}>{f.for_nome}</span>
                          <span className="text-xs text-gray-500">#{f.for_codigo}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const winners = cheapestByRow(row);
                    return (
                      <tr key={row.pro_codigo} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.pro_codigo}</td>
                        <td className="px-4 py-3">
                          <div className="whitespace-normal break-words">{row.pro_descricao}</div>
                        </td>
                        {fornecedoresOrd.map((f) => {
                          const price = row.prices[f.for_codigo] ?? null;
                          const cost = row.costs[f.for_codigo] ?? null;
                          const isWinner = price != null && price > 0 && winners.has(f.for_codigo);

                          const bg = bgClassByPriceVsCost(price, cost);
                          const txt = textClassByWinner(isWinner, price != null);
                          const fw = isWinner ? "font-semibold" : "font-medium";
                          const dot = dotClassByVariation(price, cost);

                          return (
                            <td key={f.for_codigo} className={`px-4 py-3 text-right ${bg} ${txt} ${fw}`}>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
                                <span>{fmtBRL(price)}</span>
                              </div>
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
        <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Variação ≤ 10%
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-red-500" /> Variação &gt; 10%
      </div>
      <div className="inline-flex items-center gap-1">
        <span className="font-semibold text-emerald-700">Verde</span> vencedor |{" "}
        <span className="font-medium text-red-700">Vermelho</span> demais
      </div>
    </div>
  );
}
