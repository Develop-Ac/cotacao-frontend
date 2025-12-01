"use client";

import { useEffect, useState } from "react";
import {
  FaBox,
  FaBuilding,
  FaCheck,
  FaCopy,
  FaExternalLinkAlt,
  FaList,
  FaPlusSquare,
  FaSave,
  FaSearch,
  FaSync,
  FaTimes,
} from "react-icons/fa";
import { serviceUrl } from "@/lib/services";
import Breadcrumb from "../../components/Breadcrumb";
import Link from "next/link";

type CotacaoItem = {
  PEDIDO_COTACAO: number;
  EMISSAO: string | null;
  PRO_CODIGO: number | string;
  PRO_DESCRICAO: string;
  MAR_DESCRICAO: string;
  REFERENCIA: string;
  UNIDADE: string;
  QUANTIDADE: number;
  DT_ULTIMA_COMPRA: string | null;
};

type PedidoResumo = {
  empresa: number;
  pedido_cotacao: number;
  total_itens: number;
};

type FornecedorResp = {
  FOR_CODIGO: number;
  FOR_NOME: string;
  CPF_CNPJ: string | null;
  RG_IE: string | null;
  ENDERECO: string | null;
  BAIRRO: string | null;
  NUMERO: string | null;
  CIDADE: string | null;
  UF: string | null;
  EMAIL: string | null;
  FONE: string | null;
  CONTATO: string | null;
};

type FornecedorSalvo = {
  for_codigo: number;
  for_nome: string | null;
  cpf_cnpj: string | null;
};

const COMPRAS_API = serviceUrl("compras");
const comprasPath = (path: string) => `${COMPRAS_API}/compras${path}`;

function PedidoCard({
  pedido,
  onOpenModal,
  onOpenProdutos,
}: {
  pedido: PedidoResumo;
  onOpenModal: (id: number) => void;
  onOpenProdutos: (id: number, empresa: number) => void;
}) {
  const [fornecedores, setFornecedores] = useState<FornecedorSalvo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(
          `${comprasPath("/fornecedor")}?pedido_cotacao=${encodeURIComponent(String(pedido.pedido_cotacao))}`,
          { headers: { Accept: "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setFornecedores(Array.isArray(data?.data) ? data.data : []);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar fornecedores do card", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSuppliers();
    return () => {
      mounted = false;
    };
  }, [pedido.pedido_cotacao]);

  return (
    <div className="bg-white dark:bg-boxdark rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100 dark:border-strokedark">
      <div className="bg-gray-50 dark:bg-meta-4 p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">Cotação de Compra</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">#{pedido.pedido_cotacao}</div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
            <FaBox size={14} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-medium">{pedido.total_itens}</span>
            <span className="text-sm">itens solicitados</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-gray-600 dark:text-gray-300">
            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 dark:text-orange-400 shrink-0">
              <FaBuilding size={14} />
            </div>
            <span className="text-sm font-semibold">Fornecedores Vinculados:</span>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ) : fornecedores.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fornecedores.map((f) => (
                <span
                  key={f.for_codigo}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-meta-4 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark"
                  title={f.for_nome || "Sem nome"}
                >
                  {f.for_nome?.split(" ")[0] || f.for_codigo}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Nenhum fornecedor vinculado</p>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 mt-auto flex gap-2 items-stretch">
        <button
          onClick={() => onOpenProdutos(pedido.pedido_cotacao, pedido.empresa)}
          className="bg-white dark:bg-meta-4 border border-black-200 dark:border-black-700 text-black-600 dark:text-black-400 hover:bg-black-50 dark:hover:bg-black-900/30 hover:border-black-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 min-w-0 basis-1/2 py-2 px-3 sm:px-4"
          title="Ver Produtos"
        >
          <FaList className="text-sm" />
          <span className="truncate">Produtos</span>
        </button>
        <button
          onClick={() => onOpenModal(pedido.pedido_cotacao)}
          className="bg-white dark:bg-meta-4 border border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm flex-1 min-w-0 basis-1/2 py-2 px-3 sm:px-4"
          title="Gerenciar Fornecedores"
        >
          <FaExternalLinkAlt className="text-sm" />
          <span className="truncate">Gerenciar</span>
        </button>
      </div>
    </div>
  );
}

export default function Tela() {
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
      const url = `${comprasPath(`/openquery/pedido/${encodeURIComponent(p)}`)}?empresa=3`;
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
          DT_ULTIMA_COMPRA: it.DT_ULTIMA_COMPRA ?? null,
        })),
      };

      const res = await fetch(comprasPath("/pedidos-cotacao"), {
      // const res = await fetch("http://localhost:8000/compras/pedidos-cotacao", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {
          // ignore parsing error
        }
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

  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [msgPedidos, setMsgPedidos] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const carregarPedidos = async () => {
    setMsgPedidos(null);
    setLoadingPedidos(true);
    try {
      const res = await fetch(
        `${comprasPath("/pedidos-cotacao")}?page=${page}&pageSize=${pageSize}`,
        { headers: { Accept: "application/json" } }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr: PedidoResumo[] = Array.isArray(data?.data) ? data.data : [];
      setPedidos(arr);

      // Handle pagination metadata if available
      if (data?.total) {
        setTotalItems(data.total);
        setTotalPages(Math.ceil(data.total / pageSize));
      } else if (data?.last_page) {
        setTotalPages(data.last_page);
      }

      if (!arr.length) setMsgPedidos("Nenhum pedido encontrado.");
    } catch (e: any) {
      setMsgPedidos(`Erro ao carregar: ${e?.message || "desconhecido"}`);
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to page 1 when page size changes
    carregarPedidos();
  }, [pageSize]);

  useEffect(() => {
    carregarPedidos();
  }, [page]);

  const pedidosFiltrados = pedidos.filter(
    (p) => String(p.pedido_cotacao).includes(filterText) || String(p.empresa).includes(filterText)
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [forCodigoInput, setForCodigoInput] = useState("");
  const [loadingForn, setLoadingForn] = useState(false);
  const [fornMsg, setFornMsg] = useState<string | null>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [fornecedoresSalvos, setFornecedoresSalvos] = useState<FornecedorSalvo[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const [modalProdutosOpen, setModalProdutosOpen] = useState(false);
  const [itensVisualizacao, setItensVisualizacao] = useState<CotacaoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  const carregarFornecedoresSalvos = async (pedido_cotacao: number) => {
    try {
      const res = await fetch(
        `${comprasPath("/fornecedor")}?pedido_cotacao=${encodeURIComponent(String(pedido_cotacao))}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: FornecedorSalvo[] = Array.isArray(data?.data) ? data.data : [];
      setFornecedoresSalvos(list);
    } catch (e: any) {
      setFornecedoresSalvos([]);
      setFornMsg(`Falha ao carregar fornecedores: ${e?.message || "desconhecido"}`);
      setTimeout(() => setFornMsg(null), 2500);
    }
  };

  const abrirModalFornecedor = async (pedidoDaLinha: number) => {
    setPedidoSelecionado(pedidoDaLinha);
    setModalOpen(true);
    setFornMsg(null);
    setForCodigoInput("");
    await carregarFornecedoresSalvos(pedidoDaLinha);
  };

  const abrirModalProdutos = async (pedidoDaLinha: number, empresa: number) => {
    setPedidoSelecionado(pedidoDaLinha);
    setModalProdutosOpen(true);
    setItensVisualizacao([]);
    setLoadingItens(true);
    try {
      const url = `${comprasPath(`/openquery/pedido/${encodeURIComponent(String(pedidoDaLinha))}`)}?empresa=${empresa}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItensVisualizacao(Array.isArray(data?.itens) ? data.itens : []);
    } catch (e) {
      console.error("Erro ao carregar itens", e);
    } finally {
      setLoadingItens(false);
    }
  };

  const buscarFornecedor = async () => {
    setFornMsg(null);
    const raw = forCodigoInput.trim();
    if (!raw) return setFornMsg("Informe o código do fornecedor.");
    if (!pedidoSelecionado) return setFornMsg("Pedido não selecionado.");
    const code = Number(raw);
    if (!Number.isFinite(code)) return setFornMsg("Código inválido.");
    setLoadingForn(true);
    try {
      const res = await fetch(comprasPath(`/openquery/fornecedor/${code}`), {
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) {
        setFornMsg("Fornecedor não encontrado.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const novo: FornecedorResp = await res.json();

      const postBody = {
        pedido_cotacao: pedidoSelecionado,
        for_codigo: novo.FOR_CODIGO,
        for_nome: novo.FOR_NOME,
        cpf_cnpj: novo.CPF_CNPJ ?? null,
        itens: [],
      };
      const post = await fetch(comprasPath("/fornecedor"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      if (!post.ok) {
        let msg = `HTTP ${post.status}`;
        try {
          const err = await post.json();
          if (err?.message) msg = err.message;
        } catch {
          // ignore parsing error
        }
        throw new Error(msg);
      }

      await carregarFornecedoresSalvos(pedidoSelecionado);
      setFornMsg("Fornecedor adicionado.");
      setTimeout(() => setFornMsg(null), 1500);
      setForCodigoInput("");
    } catch (e: any) {
      setFornMsg(`Erro ao adicionar fornecedor: ${e?.message || "desconhecido"}`);
      setTimeout(() => setFornMsg(null), 2500);
    } finally {
      setLoadingForn(false);
    }
  };

  const gerarLinkFornecedor = (f: FornecedorSalvo) => {
    if (!f?.for_codigo || !pedidoSelecionado) return "";
    return `https://fornecedor.acacessorios.com.br/cotacao?for_codigo=${encodeURIComponent(
      String(f.for_codigo)
    )}&pedido_cotacao=${encodeURIComponent(String(pedidoSelecionado))}`;
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setFornMsg("Link copiado!");
    setTimeout(() => {
      setCopiedId(null);
      setFornMsg(null);
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white">
            <Link href="/" className="hover:text-primary transition-colors">Intranet</Link> / Cotação de Compra</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Crie e Gerencie Cotações de Compras</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (formularioAberto) {
                setItensCotacao([]);
                setPedido("");
                setMsgCot(null);
              }
              setFormularioAberto(!formularioAberto);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-300 ease-in-out active:scale-95 ${formularioAberto
              ? "bg-gray-800 text-white hover:bg-gray-900"
              : "bg-primary text-white hover:bg-opacity-90"
              }`}
            title={formularioAberto ? "Fechar Formulário" : "Nova Cotação"}
          >
            {formularioAberto ? <FaTimes size={18} /> : <FaPlusSquare size={18} />}
            <span className="text-sm font-medium">{formularioAberto ? "Fechar" : "Nova Cotação"}</span>
          </button>
          <button
            onClick={carregarPedidos}
            disabled={loadingPedidos}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 dark:bg-meta-4 dark:text-white dark:border-strokedark"
            title="Atualizar Lista"
          >
            <FaSync className={loadingPedidos ? "animate-spin" : ""} size={18} />
            <span className="text-sm font-medium">Atualizar</span>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${formularioAberto ? "grid-rows-[1fr] opacity-100 mb-10" : "grid-rows-[0fr] opacity-0 mb-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-gray-100 dark:border-strokedark">
            <h2 className="text-xl font-semibold mb-4 border-b dark:border-strokedark pb-2 text-black dark:text-white">Nova Cotação</h2>
            <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número do Pedido</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 123456"
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value.replace(/[^\d]/g, ""))}
                    className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-form-input text-black dark:text-white"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <button onClick={buscarCotacao} disabled={loadingCot || !pedido} className="bg-primary text-white hover:bg-opacity-90 rounded-lg transition-all duration-300 ease-in-out active:scale-95 h-10 px-6 font-medium">
                {loadingCot ? "Buscando..." : "Buscar Itens"}
              </button>
              <button
                onClick={criarCotacao}
                disabled={postingCot || !itensCotacao.length}
                className="bg-meta-3 text-white hover:bg-opacity-90 rounded-lg transition-all duration-300 ease-in-out active:scale-95 h-10 px-6 flex items-center gap-2 font-medium"
              >
                <FaSave />
                {postingCot ? "Salvando..." : "Criar Cotação"}
              </button>
            </div>

            {msgCot && (
              <div
                className={`p-4 rounded-lg mb-6 ${msgCot.includes("sucesso") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {msgCot}
              </div>
            )
            }

            {
              itensCotacao.length > 0 && (
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
                    <tbody className="divide-y divide-gray-100">
                      {itensCotacao.map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors border-b dark:border-strokedark last:border-0">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{it.PRO_CODIGO}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{it.PRO_DESCRICAO}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.MAR_DESCRICAO}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.REFERENCIA}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.UNIDADE}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{it.QUANTIDADE}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-4 border border-gray-100 dark:border-strokedark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Filtrar por pedido..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-10 pl-10 pr-4 border border-gray-300 dark:border-form-strokedark rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full bg-white dark:bg-form-input text-black dark:text-white"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>

          <select
            className="h-10 border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white w-full sm:w-auto"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10 itens</option>
            <option value={20}>20 itens</option>
            <option value={50}>50 itens</option>
            <option value={100}>100 itens</option>
          </select>
        </div>

        {msgPedidos && (
          <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shadow-sm">{msgPedidos}</div>
        )}

        {loadingPedidos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white h-48 rounded-xl shadow-sm border border-gray-100 animate-pulse"></div>
            ))}
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 shadow-sm">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pedidosFiltrados.map((p) => (
              <PedidoCard
                key={p.pedido_cotacao}
                pedido={p}
                onOpenModal={abrirModalFornecedor}
                onOpenProdutos={abrirModalProdutos}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pedidosFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-strokedark">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando página <span className="font-semibold text-black dark:text-white">{page}</span> de <span className="font-semibold text-black dark:text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loadingPedidos}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Logic to show a window of pages around current page
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
                      disabled={loadingPedidos}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${page === pNum
                        ? "bg-primary text-white"
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
                disabled={page === totalPages || loadingPedidos}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {
        modalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-stroke dark:border-strokedark">
              <div className="p-6 border-b border-stroke dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-meta-4">
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Gerenciar Fornecedores</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pedido de Cotação #{pedidoSelecionado}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex gap-3 mb-6">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Código do fornecedor"
                      value={forCodigoInput}
                      onChange={(e) => setForCodigoInput(e.target.value.replace(/[^\d]/g, ""))}
                      className="w-full h-10 pl-10 pr-4 bg-transparent border border-stroke dark:border-form-strokedark dark:bg-form-input rounded-lg focus:border-primary dark:focus:border-primary outline-none text-black dark:text-white transition-colors"
                    />
                    <FaSearch className="absolute left-3 top-3 text-gray-500 dark:text-gray-400" />
                  </div>
                  <button
                    onClick={buscarFornecedor}
                    disabled={loadingForn}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-white hover:bg-opacity-90 shadow-sm transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50"
                    title="Adicionar Fornecedor"
                  >
                    <FaPlusSquare size={18} />
                  </button>
                </div>

                {fornMsg && (
                  <div
                    className={`p-3 rounded-lg mb-6 text-sm ${fornMsg.includes("adicionado") || fornMsg.includes("copiado") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    {fornMsg}
                  </div>
                )}

                <div className="border border-stroke dark:border-strokedark rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-2 dark:bg-meta-4 text-black dark:text-white font-medium border-b border-stroke dark:border-strokedark">
                      <tr>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">CPF/CNPJ</th>
                        <th className="px-4 py-3 text-right">Link de Acesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                      {fornecedoresSalvos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Nenhum fornecedor vinculado a este pedido.
                          </td>
                        </tr>
                      ) : (
                        fornecedoresSalvos.map((f) => (
                          <tr key={f.for_codigo} className="hover:bg-gray-2 dark:hover:bg-meta-4 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-white">{f.for_codigo}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{f.for_nome}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{f.cpf_cnpj}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={gerarLinkFornecedor(f)}
                                  className="w-64 text-xs border border-stroke dark:border-strokedark rounded px-2 py-1.5 bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300 focus:border-primary dark:focus:border-primary outline-none select-all transition-colors"
                                  onClick={(e) => e.currentTarget.select()}
                                />
                                <button
                                  onClick={() => copyToClipboard(gerarLinkFornecedor(f), f.for_codigo)}
                                  className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm transition-all duration-300 ease-in-out active:scale-95 ${copiedId === f.for_codigo
                                    ? "bg-meta-3 text-white"
                                    : "bg-white text-gray-600 border border-stroke hover:bg-gray-50 dark:bg-meta-4 dark:text-white dark:border-strokedark"
                                    }`}
                                  title="Copiar Link"
                                >
                                  {copiedId === f.for_codigo ? <FaCheck size={12} /> : <FaCopy size={12} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4 flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2 bg-white border border-stroke text-black hover:bg-gray-50 dark:bg-meta-4 dark:text-white dark:border-strokedark rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        modalProdutosOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-stroke dark:border-strokedark">
              <div className="p-6 border-b border-stroke dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-meta-4">
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">Produtos da Cotação</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pedido #{pedidoSelecionado}</p>
                </div>
                <button
                  onClick={() => setModalProdutosOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {loadingItens ? (
                  <div className="flex justify-center py-12">
                    <FaSync className="animate-spin text-blue-600 text-3xl" />
                  </div>
                ) : itensVisualizacao.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Nenhum produto encontrado.</div>
                ) : (
                  <div className="border border-stroke dark:border-strokedark rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-2 dark:bg-meta-4 text-black dark:text-white font-medium border-b border-stroke dark:border-strokedark">
                        <tr>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Marca</th>
                          <th className="px-4 py-3">Unidade</th>
                          <th className="px-4 py-3 text-right">Qtd.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stroke dark:divide-strokedark">
                        {itensVisualizacao.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-2 dark:hover:bg-meta-4 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-white">{it.PRO_CODIGO}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{it.PRO_DESCRICAO}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{it.MAR_DESCRICAO}</td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{it.UNIDADE}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-white">{it.QUANTIDADE}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4 flex justify-end">
                <button
                  onClick={() => setModalProdutosOpen(false)}
                  className="px-6 py-2 bg-white border border-stroke text-black hover:bg-gray-50 dark:bg-meta-4 dark:text-white dark:border-strokedark rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
