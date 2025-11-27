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
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100">
      <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-start">
        <div>
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Cotação de Compra</div>
          <div className="text-2xl font-bold text-gray-800">#{pedido.pedido_cotacao}</div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <FaBox className="text-gray-400" />
          <span className="font-medium">{pedido.total_itens}</span>
          <span className="text-sm">itens solicitados</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-gray-600">
            <FaBuilding className="text-gray-400" />
            <span className="text-sm font-semibold">Fornecedores Vinculados:</span>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : fornecedores.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {fornecedores.map((f) => (
                <span
                  key={f.for_codigo}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                  title={f.for_nome || "Sem nome"}
                >
                  {f.for_nome?.split(" ")[0] || f.for_codigo}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Nenhum fornecedor vinculado</p>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 mt-auto flex gap-2 items-stretch">
        <button
          onClick={() => onOpenProdutos(pedido.pedido_cotacao, pedido.empresa)}
          className="flex-1 min-w-0 basis-1/2 py-2 px-3 sm:px-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 group text-xs sm:text-sm"
          title="Ver Produtos"
        >
          <FaList className="text-sm" />
          <span className="truncate">Produtos</span>
        </button>
        <button
          onClick={() => onOpenModal(pedido.pedido_cotacao)}
          className="flex-1 min-w-0 basis-1/2 py-2 px-3 sm:px-4 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 group text-xs sm:text-sm"
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

      // const res = await fetch(comprasPath("/pedidos-cotacao"), {
      const res = await fetch("http://localhost:8000/compras/pedidos-cotacao", {
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
  const page = 1;

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
    <div className="min-h-screen text-gray-900 p-4 md:p-8 space-y-8 bg-gray-50/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotação de Compra</h1>
          <p className="text-gray-500 mt-1">Gerencie pedidos e cotações de fornecedores</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setFormularioAberto(!formularioAberto)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 ${formularioAberto
              ? "bg-gray-800 text-white hover:bg-gray-900"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
              }`}
            title={formularioAberto ? "Fechar Formulário" : "Nova Cotação"}
          >
            {formularioAberto ? <FaTimes size={18} /> : <FaPlusSquare size={18} />}
            <span className="text-sm font-medium">{formularioAberto ? "Fechar" : "Nova Cotação"}</span>
          </button>
          <button
            onClick={carregarPedidos}
            disabled={loadingPedidos}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200 disabled:opacity-50"
            title="Atualizar Lista"
          >
            <FaSync className={loadingPedidos ? "animate-spin" : ""} size={18} />
            <span className="text-sm font-medium">Atualizar</span>
          </button>
        </div>
      </div>

      {formularioAberto && (
        <div className="bg-white rounded-xl shadow-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Nova Cotação</h2>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Número do Pedido</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 123456"
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            <button onClick={buscarCotacao} disabled={loadingCot || !pedido} className="btn-primary h-10 px-6">
              {loadingCot ? "Buscando..." : "Buscar Itens"}
            </button>
            <button
              onClick={criarCotacao}
              disabled={postingCot || !itensCotacao.length}
              className="btn-success h-10 px-6 flex items-center gap-2"
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
          )}

          {itensCotacao.length > 0 && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
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
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{it.PRO_CODIGO}</td>
                      <td className="px-4 py-3 text-gray-700">{it.PRO_DESCRICAO}</td>
                      <td className="px-4 py-3 text-gray-500">{it.MAR_DESCRICAO}</td>
                      <td className="px-4 py-3 text-gray-500">{it.REFERENCIA}</td>
                      <td className="px-4 py-3 text-gray-500">{it.UNIDADE}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{it.QUANTIDADE}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white shadow-md rounded-xl p-4 border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Filtrar por pedido..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-10 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>

          <select
            className="h-10 border border-gray-300 rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full sm:w-auto"
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gerenciar Fornecedores</h3>
                <p className="text-sm text-gray-500">Pedido de Cotação #{pedidoSelecionado}</p>
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
                    className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
                <button
                  onClick={buscarFornecedor}
                  disabled={loadingForn}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200 disabled:opacity-50"
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

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">CPF/CNPJ</th>
                      <th className="px-4 py-3 text-right">Link de Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fornecedoresSalvos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Nenhum fornecedor vinculado a este pedido.
                        </td>
                      </tr>
                    ) : (
                      fornecedoresSalvos.map((f) => (
                        <tr key={f.for_codigo} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{f.for_codigo}</td>
                          <td className="px-4 py-3 text-gray-700">{f.for_nome}</td>
                          <td className="px-4 py-3 text-gray-500">{f.cpf_cnpj}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="text"
                                readOnly
                                value={gerarLinkFornecedor(f)}
                                className="w-64 text-xs border border-gray-200 rounded px-2 py-1.5 bg-gray-50 text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none select-all"
                                onClick={(e) => e.currentTarget.select()}
                              />
                              <button
                                onClick={() => copyToClipboard(gerarLinkFornecedor(f), f.for_codigo)}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm transition-all duration-200 ${copiedId === f.for_codigo
                                  ? "bg-green-600 text-white"
                                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
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

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalProdutosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Produtos da Cotação</h3>
                <p className="text-sm text-gray-500">Pedido #{pedidoSelecionado}</p>
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
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Marca</th>
                        <th className="px-4 py-3">Unidade</th>
                        <th className="px-4 py-3 text-right">Qtd.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itensVisualizacao.map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{it.PRO_CODIGO}</td>
                          <td className="px-4 py-3 text-gray-700">{it.PRO_DESCRICAO}</td>
                          <td className="px-4 py-3 text-gray-500">{it.MAR_DESCRICAO}</td>
                          <td className="px-4 py-3 text-gray-500">{it.UNIDADE}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">{it.QUANTIDADE}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setModalProdutosOpen(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
