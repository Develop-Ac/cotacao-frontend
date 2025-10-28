"use client";

import { FaPlusSquare, FaSync } from "react-icons/fa";
import { useEffect, useState } from "react";

type CotacaoItem = {
  PEDIDO_COTACAO: number;
  EMISSAO: string | null;
  PRO_CODIGO: number | string;
  PRO_DESCRICAO: string;
  MAR_DESCRICAO: string;
  REFERENCIA: string;
  UNIDADE: string;
  QUANTIDADE: number;
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

      const res = await fetch("https://intranetbackend.acacessorios.local/compras/pedidos-cotacao", {
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
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [msgPedidos, setMsgPedidos] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const page = 1;

  const carregarPedidos = async () => {
    setMsgPedidos(null);
    setLoadingPedidos(true);
    try {
      const res = await fetch(
        `https://intranetbackend.acacessorios.local/compras/pedidos-cotacao?page=${page}&pageSize=${pageSize}`,
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

  // ===== Modal fornecedor =====
  const [modalOpen, setModalOpen] = useState(false);
  const [forCodigoInput, setForCodigoInput] = useState("");
  const [loadingForn, setLoadingForn] = useState(false);
  const [fornMsg, setFornMsg] = useState<string | null>(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [fornecedoresSalvos, setFornecedoresSalvos] = useState<FornecedorSalvo[]>([]);

  const carregarFornecedoresSalvos = async (pedido_cotacao: number) => {
    try {
      const res = await fetch(
        `http://localhost:8000/compras/fornecedor?pedido_cotacao=${encodeURIComponent(String(pedido_cotacao))}`,
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

  const buscarFornecedor = async () => {
    setFornMsg(null);
    const raw = forCodigoInput.trim();
    if (!raw) return setFornMsg("Informe o código do fornecedor.");
    if (!pedidoSelecionado) return setFornMsg("Pedido não selecionado.");
    const code = Number(raw);
    if (!Number.isFinite(code)) return setFornMsg("Código inválido.");
    setLoadingForn(true);
    try {
      // 1) Consulta fornecedor na OPENQUERY
      const res = await fetch(`https://intranetbackend.acacessorios.local/compras/openquery/fornecedor/${code}`, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 404) {
        setFornMsg("Fornecedor não encontrado.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const novo: FornecedorResp = await res.json();

      // 2) POST para persistir no pedido
      const postBody = {
        pedido_cotacao: pedidoSelecionado,
        for_codigo: novo.FOR_CODIGO,
        for_nome: novo.FOR_NOME,
        cpf_cnpj: novo.CPF_CNPJ ?? null,
        itens: [], // se quiser salvar itens também, envie aqui
      };
      const post = await fetch("http://localhost:8000/compras/fornecedor", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      console.log("POST fornecedor response:", postBody);
      if (!post.ok) {
        let msg = `HTTP ${post.status}`;
        try {
          const err = await post.json();
          if (err?.message) msg = err.message;
        } catch {}
        throw new Error(msg);
      }

      // 3) Recarrega a lista persistida do pedido
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

  const copiarLinkFornecedor = async (f: FornecedorSalvo) => {
    if (!f?.for_codigo || !pedidoSelecionado) return;
    const url = `http://localhost:3002/cotacao?for_codigo=${encodeURIComponent(
      String(f.for_codigo)
    )}&pedido_cotacao=${encodeURIComponent(String(pedidoSelecionado))}`;
    try {
      await navigator.clipboard.writeText(url);
      setFornMsg("Link copiado!");
      setTimeout(() => setFornMsg(null), 2000);
    } catch {
      setFornMsg("Falha ao copiar.");
      setTimeout(() => setFornMsg(null), 2000);
    }
  };

  return (
    <div className="main-panel min-h-screen text-black">
      <div className="content-wrapper p-2">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h3 className="text-2xl font-semibold mb-3 md:mb-0">Criação de cotação</h3>

          <div className="flex gap-6">
            <div className="flex flex-col items-center mr-2">
              <button
                id="form_new_menu"
                className={BTN_SQUARE}
                title="Abrir box"
                onClick={() => setFormularioAberto((v) => !v)}
              >
                <FaPlusSquare className="text-white text-xl" />
              </button>
              <span className="text-xs text-gray-700 mt-1">NOVO</span>
            </div>

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
                    title={!pedido.trim() ? "Informe o pedido" : !itensCotacao.length ? "Busque itens antes" : "Criar cotação"}
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
                        <th className="p-2 text-end" style={{ width: "110px" }}>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensCotacao.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-gray-500 text-center">Nenhum item</td>
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
              <div className="flex items-center justify-end gap-2 mb-4">
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
                      <th className="p-2 text-start">Empresa</th>
                      <th className="p-2 text-start">Pedido de Cotação</th>
                      <th className="p-2 text-end" style={{ width: "140px" }}>Total de Itens</th>
                      <th className="p-2 text-end" style={{ width: "180px" }}>Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-gray-500 text-center">Nenhum pedido encontrado</td>
                      </tr>
                    )}
                    {pedidos.map((p, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-3">{p.empresa}</td>
                        <td className="p-3">{p.pedido_cotacao}</td>
                        <td className="p-3 text-end">{p.total_itens}</td>
                        <td className="p-3 text-end">
                          <button
                            className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            onClick={() => abrirModalFornecedor(p.pedido_cotacao)}
                            title="Selecionar fornecedor e gerar link"
                          >
                            Selecionar fornecedor
                          </button>
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

      {/* MODAL Fornecedor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-semibold">
                  Fornecedores do pedido {pedidoSelecionado ?? "-"}
                </h4>
                <button
                  className="text-gray-600 hover:text-gray-800"
                  onClick={() => setModalOpen(false)}
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Buscar + adicionar (POST automático) */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código do fornecedor (for_codigo)"
                  value={forCodigoInput}
                  onChange={(e) => setForCodigoInput(e.target.value.replace(/[^\d]/g, ""))}
                  className="h-11 border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                />
                <button className={BTN} onClick={buscarFornecedor} disabled={loadingForn}>
                  {loadingForn ? "Buscando..." : "Adicionar"}
                </button>
              </div>

              {fornMsg && <p className="text-sm text-gray-600">{fornMsg}</p>}

              {/* Lista persistida do pedido */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-start">Código</th>
                      <th className="p-2 text-start">Nome</th>
                      <th className="p-2 text-start">CPF/CNPJ</th>
                      <th className="p-2 text-end" style={{ width: 180 }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedoresSalvos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-gray-500 text-center">Sem fornecedores salvos</td>
                      </tr>
                    )}
                    {fornecedoresSalvos.map((f) => (
                      <tr key={f.for_codigo} className="border-t hover:bg-gray-50">
                        <td className="p-3">{f.for_codigo}</td>
                        <td className="p-3">{f.for_nome}</td>
                        <td className="p-3">{f.cpf_cnpj}</td>
                        <td className="p-3 text-end">
                          <button
                            className="h-9 px-3 inline-flex items-center justify-center gap-2 rounded text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                            onClick={() => copiarLinkFornecedor(f)}
                          >
                            Copiar link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  className="h-10 px-4 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                  onClick={() => setModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* fim MODAL */}
    </div>
  );
}
