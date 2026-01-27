"use client";

import {
  FaBox,
  FaCalendar,
  FaFilePdf,
  FaMoneyBill,
  FaPlusSquare,
  FaSync,
  FaUser,
} from "react-icons/fa";
import { useEffect, useMemo, useState, useCallback } from "react";
import { serviceUrl } from "@/lib/services";
import Alert from "@/components/Alert";
import Link from "next/link";

const COMPRAS_API = serviceUrl("compras");
const comprasUrl = (path: string) => `${COMPRAS_API}/compras${path}`;

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
  for_nome: string;      // veio como string aqui (ok)
  pedido_cotacao: number;
  created_at: string;      // ISO
  itens_count: number;
  total_qtd: number;
  total_valor: number;
  total_valor_fmt: string; // já sem "R$"
};

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

function PedidoCard({ pedido }: { pedido: PedidoListItem }) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-boxdark rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100 dark:border-strokedark cursor-pointer">
      <Link
        href={`/compras/cotacao/pedido/${pedido.id}`}
        className=""
      >
        <div className="flex flex-col h-full">
          <div className="bg-gray-50 dark:bg-meta-4 p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-start">
            <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
              Pedido de Cotação
            </div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              #{pedido.pedido_cotacao}
            </div>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 dark:text-orange-400 shrink-0">
              <FaUser size={14} />
            </div>
            <span className="font-medium text-sm line-clamp-2 mt-1" title={pedido.for_nome}>
              {pedido.for_nome}
            </span>
            </div>

            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
              <FaCalendar size={14} />
            </div>
            <span className="text-sm">{fmtDateTime(pedido.created_at)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-gray-50 dark:bg-meta-4 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FaBox size={10} />
              </div>
              Itens
              </div>
              <div className="font-semibold text-gray-800 dark:text-white pl-8">{pedido.itens_count}</div>
            </div>
            <div className="bg-gray-50 dark:bg-meta-4 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FaBox size={10} />
              </div>
              Qtd. Total
              </div>
              <div className="font-semibold text-gray-800 dark:text-white pl-8">
              {Number(pedido.total_qtd).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </div>
            </div>
            </div>

            <div className="mt-1 pt-2 border-t border-gray-100 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 dark:text-green-400 shrink-0">
                <FaMoneyBill size={14} />
              </div>
              <span className="text-xs font-semibold uppercase">Total</span>
              </div>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {pedido.total_valor_fmt ?? "-"}
              </span>
            </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4 pt-0 mt-auto flex gap-2">
        <a
        href={`${comprasUrl(`/pedido/${encodeURIComponent(pedido.id)}`)}?marca=true`}
        // href={`http://localhost:8000/compras/pedido/${encodeURIComponent(pedido.id)}?marca=true`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-2 px-3 bg-white dark:bg-meta-4 border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs"
        title="Abrir PDF (com marca)"
        >
        <FaFilePdf />
        C/ Marca
        </a>
        <a
        href={`${comprasUrl(`/pedido/${encodeURIComponent(pedido.id)}`)}?marca=false`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-2 px-3 bg-white dark:bg-meta-4 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs"
        title="Abrir PDF (sem marca)"
        >
        <FaFilePdf />
        S/ Marca
        </a>
      </div>
    </div>
  );
}

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
      const url = `${comprasUrl(`/openquery/pedido/${encodeURIComponent(p)}`)}?empresa=3`;
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

      const res = await fetch(comprasUrl("/pedidos-cotacao"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch { }
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

  const carregarPedidos = useCallback(async () => {
    setMsgPedidos(null);
    setLoadingPedidos(true);
    try {
      const res = await fetch(comprasUrl("/pedido"), {
      // const res = await fetch("http://localhost:8000/compras/pedido", {
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
  }, []);

  useEffect(() => {
    carregarPedidos();
  }, [pageSize, carregarPedidos]);

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
      if (fFor && !String(p.for_nome ?? "").includes(fFor.trim())) return false;

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

  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(pedidosFiltrados.length / pageSize);

  useEffect(() => {
    setPage(1);
  }, [fFor, fPed, fDe, fAte, pageSize]);

  const pagina = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pedidosFiltrados.slice(start, start + pageSize);
  }, [pedidosFiltrados, page, pageSize]);

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white">
            <Link href="/" className="hover:text-primary transition-colors">Intranet</Link> / <Link href="/compras/cotacao" className="hover:text-primary transition-colors">Cotação</Link> / Pedido
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie Seus Pedidos</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={carregarPedidos}
            disabled={loadingPedidos}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-meta-4 text-gray-700 dark:text-white border border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-opacity-90 hover:border-gray-300 shadow-sm transition-all duration-200 disabled:opacity-50"
            title="Atualizar Lista"
          >
            <FaSync className={loadingPedidos ? "animate-spin" : ""} size={18} />
            <span className="text-sm font-medium">Atualizar</span>
          </button>
        </div>
      </div>

      {/* BOX ABERTO */}
      {formularioAberto && (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300 border border-gray-100 dark:border-strokedark">
          <h2 className="text-xl font-semibold mb-4 border-b dark:border-strokedark pb-2 text-black dark:text-white">Nova Cotação</h2>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número do Pedido
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 123456"
                value={pedido}
                onChange={(e) => setPedido(e.target.value.replace(/[^\d]/g, ""))}
                className="w-full h-10 px-4 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-form-input text-black dark:text-white"
              />
            </div>
            <button
              onClick={buscarCotacao}
              disabled={loadingCot}
              className="h-10 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loadingCot ? "Buscando..." : "Buscar"}
            </button>
            <button
              onClick={criarCotacao}
              disabled={postingCot || !itensCotacao.length || !pedido.trim()}
              className="h-10 px-6 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {postingCot ? "Enviando..." : "Criar cotação"}
            </button>
          </div>

          {msgCot && (
            <Alert
              type={msgCot.includes("sucesso") ? "success" : "error"}
              message={msgCot}
              className="mb-6"
            />
          )}

          {itensCotacao.length > 0 && (
            <div className="overflow-x-auto border dark:border-strokedark rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300 font-medium border-b dark:border-strokedark">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Marca</th>
                    <th className="px-4 py-3">Referência</th>
                    <th className="px-4 py-3">Unidade</th>
                    <th className="px-4 py-3 text-right">Qtd.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                  {itensCotacao.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{it.PRO_CODIGO}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{it.PRO_DESCRICAO}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.MAR_DESCRICAO}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.REFERENCIA}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.UNIDADE}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {it.QUANTIDADE}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LISTAGEM INFERIOR */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-4 border border-gray-100 dark:border-strokedark">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={fFor}
                onChange={(e) => setFFor(e.target.value)}
                className="h-9 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Pedido Cotação</label>
              <input
                type="text"
                placeholder="Filtrar por número..."
                value={fPed}
                onChange={(e) => setFPed(e.target.value.replace(/[^\d]/g, ""))}
                className="h-9 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">De</label>
              <input
                type="date"
                value={fDe}
                onChange={(e) => setFDe(e.target.value)}
                className="h-9 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Até</label>
              <input
                type="date"
                value={fAte}
                onChange={(e) => setFAte(e.target.value)}
                className="h-9 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
              />
            </div>
            <div className="col-span-1 flex items-end gap-2">
              <button
                onClick={limparFiltros}
                className="h-9 px-4 rounded-lg bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-opacity-90 text-sm font-medium w-full transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 dark:border-strokedark pt-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {pagina.length} de {pedidosFiltrados.length} registros
            </div>
            <select
              className="h-9 border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5 itens</option>
              <option value={10}>10 itens</option>
              <option value={20}>20 itens</option>
              <option value={50}>50 itens</option>
              <option value={100}>100 itens</option>
            </select>
          </div>
        </div>

        {msgPedidos && (
          <Alert
            type={msgPedidos.includes("Nenhum") ? "info" : "error"}
            message={msgPedidos}
          />
        )}

        {loadingPedidos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-boxdark h-64 rounded-xl shadow-sm border border-gray-100 dark:border-strokedark animate-pulse"
              ></div>
            ))}
          </div>
        ) : pagina.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-boxdark rounded-xl border border-dashed border-gray-300 dark:border-strokedark shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pagina.map((p) => (
              <PedidoCard key={p.id} pedido={p} />
            ))}
          </div>
        )}


        {/* Pagination Controls */}
        {
          pedidosFiltrados.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-strokedark">
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
          )
        }
      </div>
    </div>
  );
}
