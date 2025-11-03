"use client";

import { FaPlusSquare, FaSync } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

type CotacaoItem = {
  PEDIDO_COTACAO: number;
  EMISSAO: string | null;
  PRO_CODIGO: number | string;
  PRO_DESCRICAO: string;
  MAR_DESCRICAO: string | null;
  REFERENCIA: string | null;
  UNIDADE: string | null;
  QUANTIDADE: number;
};

// Novo tipo para a listagem vinda de GET /compras/pedido
type PedidoListItem = {
  id: string;              // UUID do pedido
  for_codigo: string;      // veio como string aqui (ok)
  pedido_cotacao: number;
  created_at: string;      // ISO
  itens_count: number;
  total_qtd: number;
  total_valor: number;
  total_valor_fmt: string; // já sem "R$"
};

export default function Tela() {
  const BTN =
    "h-10 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";
  const BTN_SQUARE =
    "h-12 w-12 inline-flex items-center justify-center rounded text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400";

  // ===== Box superior (criar cotação) =====
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [pedido, setPedido] = useState("");
  const [itensCotacao, setItensCotacao] = useState<CotacaoItem[]>([]);
  const [loadingCot, setLoadingCot] = useState(false);
  const [postingCot, setPostingCot] = useState(false);
  const [msgCot, setMsgCot] = useState<string | null>(null);

  const buscarCotacao = async () => {
    setMsgCot(null);
    setItensCotacao([]);
    const p = pedido.trim();
    if (!p) return setMsgCot("Informe o pedido de cotação.");
    setLoadingCot(true);
    try {
      const url = `https://intranetbackend.acacessorios.local/compras/openquery/pedido/${encodeURIComponent(p)}?empresa=3`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data?.itens) ? data.itens : [];
      setItensCotacao(arr);
      if (!arr.length) setMsgCot("Nenhum item encontrado.");
    } catch (e: any) {
      setMsgCot(`Erro ao buscar: ${e?.message || "desconhecido"}`);
    } finally {
      setLoadingCot(false);
    }
  };

  const criarCotacao = async () => {
    setMsgCot(null);
    const p = pedido.trim();
    if (!p) return setMsgCot("Informe o pedido de cotação.");
    if (!itensCotacao.length) return setMsgCot("Busque o pedido antes de criar a cotação.");
    setPostingCot(true);
    try {
      const payload = {
        empresa: 3,
        pedido_cotacao: Number(p),
        itens: itensCotacao.map((it) => ({
          PEDIDO_COTACAO: Number(it.PEDIDO_COTACAO),
          EMISSAO: it.EMISSAO ?? null,
          PRO_CODIGO: Number(it.PRO_CODIGO),
          PRO_DESCRICAO: it.PRO_DESCRICAO,
          MAR_DESCRICAO: it.MAR_DESCRICAO ?? null,
          REFERENCIA: it.REFERENCIA ?? null,
          UNIDADE: it.UNIDADE ?? null,
          QUANTIDADE: Number(it.QUANTIDADE),
        })),
      };

      const res = await fetch("${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/compras/pedidos-cotacao", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {}
        throw new Error(msg);
      }

      const out = await res.json().catch(() => ({}));
      setMsgCot(`Cotação criada com sucesso. Total de itens: ${out?.total_itens ?? itensCotacao.length}.`);
      setItensCotacao([]);
      setPedido("");
      await carregarPedidos();
    } catch (e: any) {
      setMsgCot(`Erro ao criar cotação: ${e?.message || "desconhecido"}`);
    } finally {
      setPostingCot(false);
    }
  };

  // ===== Tabela inferior (GET all) =====
  const [pedidos, setPedidos] = useState<PedidoListItem[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [msgPedidos, setMsgPedidos] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);

  const carregarPedidos = async () => {
    setMsgPedidos(null);
    setLoadingPedidos(true);
    try {
      const res = await fetch(`${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/compras/pedido`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const arr: PedidoListItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setPedidos(arr);
      if (!arr.length) setMsgPedidos("Nenhum pedido encontrado.");
    } catch (e: any) {
      setMsgPedidos(`Erro ao carregar: ${e?.message || "desconhecido"}`);
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, [pageSize]);

  // ===== Filtros (Fornecedor, Pedido de Cotação, Criado em [de/até]) =====
  const [fFor, setFFor] = useState<string>("");       // for_codigo (string)
  const [fPed, setFPed] = useState<string>("");       // pedido_cotacao
  const [fDe, setFDe] = useState<string>("");         // data inicial (YYYY-MM-DD)
  const [fAte, setFAte] = useState<string>("");       // data final (YYYY-MM-DD)

  const limparFiltros = () => {
    setFFor("");
    setFPed("");
    setFDe("");
    setFAte("");
  };

  const pedidosFiltrados = useMemo(() => {
    const deTs = fDe ? new Date(fDe + "T00:00:00").getTime() : null;
    const ateTs = fAte ? new Date(fAte + "T23:59:59.999").getTime() : null;
    const pedNum = fPed ? Number(fPed) : null;

    return pedidos.filter((p) => {
      // Fornecedor
      if (fFor && !String(p.for_codigo ?? "").includes(fFor.trim())) return false;

      // Pedido de Cotação (exato se numérico)
      if (pedNum != null && !Number.isNaN(pedNum) && p.pedido_cotacao !== pedNum) return false;

      // Criado em (intervalo)
      if (deTs || ateTs) {
        const ct = new Date(p.created_at).getTime();
        if (deTs && ct < deTs) return false;
        if (ateTs && ct > ateTs) return false;
      }

      return true;
    });
  }, [pedidos, fFor, fPed, fDe, fAte]);

  // helper de data pt-BR
  const fmtDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso ?? "-";
      return d.toLocaleString("pt-BR");
    } catch {
      return iso ?? "-";
    }
  };

  const pagina = useMemo(() => pedidosFiltrados.slice(0, pageSize), [pedidosFiltrados, pageSize]);

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Criação de cotação</h3>

          <div className="flex gap-6">
            {/* <div className="flex flex-col items-center mr-2">
              <button
                id="form_new_menu"
                className={BTN_SQUARE}
                title="Abrir box"
                onClick={() => setFormularioAberto((v) => !v)}
              >
                <FaPlusSquare className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">NOVO</span>
            </div> */}

            <div className="flex flex-col items-center mr-2">
              <button
                id="refresh_pedidos_header"
                className={BTN_SQUARE}
                title="Atualizar lista"
                onClick={carregarPedidos}
                disabled={loadingPedidos}
              >
                <FaSync className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">ATUALIZAR</span>
            </div>
          </div>
        </div>

        {/* BOX ABERTO */}
        {formularioAberto && (
          <div id="screen" className="mb-10">
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Número do pedido de cotação"
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value.replace(/[^\d]/g, ""))}
                    className="h-11 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={buscarCotacao} disabled={loadingCot} className={BTN}>
                    {loadingCot ? "Buscando..." : "Buscar"}
                  </button>
                  <button
                    onClick={criarCotacao}
                    disabled={postingCot || !itensCotacao.length || !pedido.trim()}
                    className="h-10 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60"
                    title={
                      !pedido.trim()
                        ? "Informe o pedido"
                        : !itensCotacao.length
                        ? "Busque itens antes"
                        : "Criar cotação"
                    }
                  >
                    {postingCot ? "Enviando..." : "Criar cotação"}
                  </button>
                </div>

                {msgCot && <p className="text-sm text-gray-600">{msgCot}</p>}

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-2 text-start">Código</th>
                        <th className="p-2 text-start">Descrição</th>
                        <th className="p-2 text-start">Marca</th>
                        <th className="p-2 text-start">Referência</th>
                        <th className="p-2 text-start">Unidade</th>
                        <th className="p-2 text-end" style={{ width: "110px" }}>
                          Quantidade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensCotacao.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-gray-500 text-center">
                            Nenhum item
                          </td>
                        </tr>
                      )}
                      {itensCotacao.map((it, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="p-2">{it.PRO_CODIGO}</td>
                          <td className="p-2">{it.PRO_DESCRICAO}</td>
                          <td className="p-2">{it.MAR_DESCRICAO}</td>
                          <td className="p-2">{it.REFERENCIA}</td>
                          <td className="p-2">{it.UNIDADE}</td>
                          <td className="p-2 text-end">{it.QUANTIDADE}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LISTAGEM INFERIOR */}
        <div id="list">
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div className="col-span-1">
                  <label className="block text-sm text-gray-700 mb-1">Fornecedor (for_codigo)</label>
                  <input
                    type="text"
                    placeholder="Ex.: 199"
                    value={fFor}
                    onChange={(e) => setFFor(e.target.value.replace(/[^\d]/g, ""))}
                    className="h-10 w-full border border-gray-300 rounded px-2"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm text-gray-700 mb-1">Pedido de Cotação</label>
                  <input
                    type="text"
                    placeholder="Ex.: 1499"
                    value={fPed}
                    onChange={(e) => setFPed(e.target.value.replace(/[^\d]/g, ""))}
                    className="h-10 w-full border border-gray-300 rounded px-2"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm text-gray-700 mb-1">Criado em (de)</label>
                  <input
                    type="date"
                    value={fDe}
                    onChange={(e) => setFDe(e.target.value)}
                    className="h-10 w-full border border-gray-300 rounded px-2"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm text-gray-700 mb-1">Criado em (até)</label>
                  <input
                    type="date"
                    value={fAte}
                    onChange={(e) => setFAte(e.target.value)}
                    className="h-10 w-full border border-gray-300 rounded px-2"
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <button
                    onClick={limparFiltros}
                    className="h-10 px-3 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 w-full"
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>

              {/* Page size */}
              <div className="flex items-center justify-end gap-2 mb-3">
                <label htmlFor="pageSize" className="text-sm text-gray-700">Tamanho da listagem</label>
                <select
                  id="pageSize"
                  className="h-10 border border-gray-300 rounded px-2"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {msgPedidos && <p className="text-sm text-gray-600 mb-2">{msgPedidos}</p>}

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-start">Fornecedor</th>
                      <th className="p-2 text-start">Pedido de Cotação</th>
                      <th className="p-2 text-start">Criado em</th>
                      <th className="p-2 text-end" style={{ width: 120 }}>Itens</th>
                      <th className="p-2 text-end" style={{ width: 130 }}>Qtd Total</th>
                      <th className="p-2 text-end" style={{ width: 160 }}>Total</th>
                      {/* largura maior para dois botões */}
                      <th className="p-2 text-end" style={{ width: 240 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-gray-500 text-center">
                          Nenhum pedido encontrado
                        </td>
                      </tr>
                    )}
                    {pagina.map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{p.for_codigo}</td>
                        <td className="p-3">{p.pedido_cotacao}</td>
                        <td className="p-3">{fmtDateTime(p.created_at)}</td>
                        <td className="p-3 text-end">{p.itens_count}</td>
                        <td className="p-3 text-end">
                          {Number(p.total_qtd).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-end">{p.total_valor_fmt ?? "-"}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            {/* PDF com MARCA */}
                            <a
                              className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                              href={`${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/compras/pedido/${encodeURIComponent(p.id)}?marca=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir PDF (com marca)"
                            >
                              C/ marca
                            </a>

                            {/* PDF sem MARCA */}
                            <a
                              className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                              href={`${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/compras/pedido/${encodeURIComponent(p.id)}?marca=false`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir PDF (sem marca)"
                            >
                              S/ marca
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* fim tabela pedidos */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
