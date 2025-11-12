"use client"

import { FaPlusSquare, FaSync } from "react-icons/fa";
import { useEffect, useState } from "react";
import { genId } from "../../../utils/genId";

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

type ContagemListaItem = {
    id: string;
    colaborador: string;
    contagem: number;
    contagem_cuid: string;
    liberado_contagem: boolean;
    created_at: string;
    usuario: {
        id: string;
        nome: string;
        codigo: string;
    };
    logs?: Array<{
        id: string;
        contagem_id: string;
        usuario_id: string;
        item_id: string;
        estoque: number;
        contado: number;
        created_at: string;
    }>;
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

type ContagemItem = {
    DATA: string;
    COD_PRODUTO: number;
    DESC_PRODUTO: string;
    MAR_DESCRICAO: string;
    REF_FABRICANTE: string;
    REF_FORNECEDOR: string;
    LOCALIZACAO: string | null;
    UNIDADE: string;
    QTDE_SAIDA: number;
    ESTOQUE: number;
    RESERVA: number;
};

type Usuario = {
    id: string;
    nome: string;
    setor: string;
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

    // ===== Estados para contagem de estoque =====
    const [dataInicial, setDataInicial] = useState("");
    const [dataFinal, setDataFinal] = useState("");
    const [localizacaoFiltro, setLocalizacaoFiltro] = useState("");
    const [prateleira, setPrateleira] = useState("");
    const [itensContagem, setItensContagem] = useState<ContagemItem[]>([]);
    const [loadingContagem, setLoadingContagem] = useState(false);
    const [msgContagem, setMsgContagem] = useState<string | null>(null);

    // ===== Novos estados =====
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [contagem1, setContagem1] = useState("");
    const [contagem2, setContagem2] = useState("");
    const [contagem3, setContagem3] = useState("");
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);

    const buscarCotacao = async () => {
        setMsgCot(null);
        setItensCotacao([]);
        const p = pedido.trim();
        if (!p) return setMsgCot("Informe o pedido de cotação.");
        setLoadingCot(true);
        try {
            const url = `http://intranetbackend.acacessorios.local/compras/openquery/pedido/${encodeURIComponent(p)}?empresa=3`;
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

    const buscarContagem = async () => {
        setMsgContagem(null);
        setItensContagem([]);
        setItensSelecionados(new Set());
        
        if (!dataInicial || !dataFinal) {
            return setMsgContagem("Informe as datas inicial e final.");
        }
        
        setLoadingContagem(true);
        try {
            const url = `http://intranetbackend.acacessorios.local/estoque/contagem?data_inicial=${encodeURIComponent(dataInicial)}&data_final=${encodeURIComponent(dataFinal)}&empresa=3`;
            
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            setItensContagem(arr);
            if (!arr.length) setMsgContagem("Nenhum item encontrado no período informado.");
        } catch (e: any) {
            setMsgContagem(`Erro ao buscar contagem: ${e?.message || "desconhecido"}`);
        } finally {
            setLoadingContagem(false);
        }
    };

    const carregarUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
            const res = await fetch('http://intranetbackend.acacessorios.local/usuarios', {
                headers: { Accept: "application/json" }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            const usuariosEstoque = arr.filter(user => user.setor === "Estoque");
            setUsuarios(usuariosEstoque);
        } catch (e: any) {
            console.error("Erro ao carregar usuários:", e);
            setUsuarios([]);
        } finally {
            setLoadingUsuarios(false);
        }
    };

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const toggleItemSelecionado = (index: number) => {
        const novosItensSelecionados = new Set(itensSelecionados);
        if (novosItensSelecionados.has(index)) {
            novosItensSelecionados.delete(index);
        } else {
            novosItensSelecionados.add(index);
        }
        setItensSelecionados(novosItensSelecionados);
    };

    const toggleTodosItens = () => {
        if (itensSelecionados.size === itensFiltrados.length) {
            setItensSelecionados(new Set());
        } else {
            const todosIndices = new Set(Array.from({ length: itensFiltrados.length }, (_, i) => i));
            setItensSelecionados(todosIndices);
        }
    };

    const salvarContagem = async () => {
        const produtosSelecionados = Array.from(itensSelecionados).map(index => itensFiltrados[index]);

        const contagem_cuid = genId();
        
        try {
            if (contagem1) {
                const usuario1 = usuarios.find(u => u.id === contagem1);
                const payload1 = {
                    contagem: 1,
                    colaborador: usuario1?.nome,
                    contagem_cuid: contagem_cuid,
                    produtos: produtosSelecionados
                };
                
                await fetch('http://intranetbackend.acacessorios.local/estoque/contagem', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload1)
                });
            }

            if (contagem2) {
                const usuario2 = usuarios.find(u => u.id === contagem2);
                const payload2 = {
                    contagem: 2,
                    colaborador: usuario2?.nome,
                    contagem_cuid: contagem_cuid,
                    produtos: produtosSelecionados
                };
                
                await fetch('http://intranetbackend.acacessorios.local/estoque/contagem', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload2)
                });
            }

            if (contagem3) {
                const usuario3 = usuarios.find(u => u.id === contagem3);
                const payload3 = {
                    contagem: 3,
                    colaborador: usuario3?.nome,
                    contagem_cuid: contagem_cuid,
                    produtos: produtosSelecionados
                };
                
                await fetch('http://intranetbackend.acacessorios.local/estoque/contagem', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload3)
                });
            }

            console.log('Contagens salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar contagens:', error);
        }
    };

    // Filtrar itens baseado na localização e prateleira selecionadas
    const itensFiltrados = itensContagem.filter(item => {
        const localizacao = item.LOCALIZACAO?.toUpperCase() || "";
        
        let passaLocalizacao = true;
        let passaPrateleira = true;

        // Filtro de localização
        if (localizacaoFiltro) {
            switch (localizacaoFiltro) {
                case "PISO_A":
                    passaLocalizacao = localizacao.startsWith("A");
                    break;
                case "PISO_B":
                    passaLocalizacao = localizacao.startsWith("B");
                    break;
                case "PISO_C":
                    passaLocalizacao = localizacao.startsWith("C");
                    break;
                case "BOX":
                    passaLocalizacao = localizacao.startsWith("BOX");
                    break;
                case "VITRINE":
                    passaLocalizacao = localizacao === "VITRINE" || /^V\d/.test(localizacao);
                    break;
                case "VENDA CASADA":
                    passaLocalizacao = localizacao === "VENDA CASADA";
                    break;
                default:
                    passaLocalizacao = true;
            }
        }

        // Filtro de prateleira
        if (prateleira) {
            // Extrai prateleira da localização (exemplo: A1302A01 -> prateleira 13)
            const prateleiraMatch = localizacao.match(/^[A-Z](\d{2})/);
            const prateleiraItem = prateleiraMatch ? parseInt(prateleiraMatch[1], 10) : null;
            passaPrateleira = prateleiraItem === parseInt(prateleira, 10);
        }

        return passaLocalizacao && passaPrateleira;
    });

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

            const res = await fetch(`http://intranetbackend.acacessorios.local/compras/pedidos-cotacao`, {
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
            await carregarContagensLista();
        } catch (e: any) {
            setMsgCot(`Erro ao criar cotação: ${e?.message || "desconhecido"}`);
        } finally {
            setPostingCot(false);
        }
    };

    // ===== Tabela inferior (GET all) =====
    const [contagensLista, setContagensLista] = useState<ContagemListaItem[]>([]);
    const [loadingContagensLista, setLoadingContagensLista] = useState(false);
    const [msgContagensLista, setMsgContagensLista] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState<number>(10);
    const page = 1;

    // ===== Estados do modal de logs =====
    const [modalLogsAberto, setModalLogsAberto] = useState(false);
    const [contagemSelecionada, setContagemSelecionada] = useState<ContagemListaItem | null>(null);
    const [logsDetalhes, setLogsDetalhes] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const carregarContagensLista = async () => {
        setMsgContagensLista(null);
        setLoadingContagensLista(true);
        try {
            const res = await fetch(
                `http://intranetbackend.acacessorios.local/estoque/contagem/lista?page=${page}&pageSize=${pageSize}`,
                { headers: { Accept: "application/json" } }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr: ContagemListaItem[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            setContagensLista(arr);
            if (!arr.length) setMsgContagensLista("Nenhuma contagem encontrada.");
        } catch (e: any) {
            setMsgContagensLista(`Erro ao carregar: ${e?.message || "desconhecido"}`);
            setContagensLista([]);
        } finally {
            setLoadingContagensLista(false);
        }
    };

    useEffect(() => {
        carregarContagensLista();
    }, [pageSize]);

    // ===== Função para abrir modal de logs =====
    const abrirModalLogs = async (contagem: ContagemListaItem) => {
        setContagemSelecionada(contagem);
        setModalLogsAberto(true);
        setLoadingLogs(true);
        
        try {
            // Se os logs já estão na contagem (conforme o exemplo que você mostrou)
            if ((contagem as any).logs) {
                setLogsDetalhes((contagem as any).logs);
            } else {
                // Caso precise fazer uma requisição separada para buscar os logs
                const res = await fetch(
                    `http://intranetbackend.acacessorios.local/estoque/contagem/logs/${contagem.id}`,
                    { headers: { Accept: "application/json" } }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setLogsDetalhes(data.logs || []);
            }
        } catch (error) {
            console.error("Erro ao carregar logs:", error);
            setLogsDetalhes([]);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fecharModalLogs = () => {
        setModalLogsAberto(false);
        setContagemSelecionada(null);
        setLogsDetalhes([]);
    };

    // ===== Modal fornecedor - Removido pois não é necessário para contagem de estoque =====

    const formatarData = (dataISO: string) => {
        return new Date(dataISO).toLocaleDateString('pt-BR');
    };

    return (
        <div className="main-panel min-h-screen text-black">
            <div className="content-wrapper p-2">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h3 className="text-2xl font-semibold mb-3 md:mb-0">Contagem de Estoque</h3>

                    <div className="flex gap-6">
                        <div className="flex flex-col items-center mr-2">
                            <button
                                id="form_new_menu"
                                className={BTN_SQUARE}
                                title="Abrir filtros"
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
                                onClick={carregarContagensLista}
                                disabled={loadingContagensLista}
                            >
                                <FaSync className="text-white text-xl" />
                            </button>
                            <span className="text-xs text-gray-700 mt-1">ATUALIZAR</span>
                        </div>
                    </div>
                </div>

                {/* BOX ABERTO - Filtros de Data */}
                {formularioAberto && (
                    <div id="screen" className="mb-10">
                        <div className="w-full">
                            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                                <h4 className="text-lg font-semibold">Filtrar por período</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
                                        <input
                                            type="date"
                                            value={dataInicial}
                                            onChange={(e) => setDataInicial(e.target.value)}
                                            className="h-11 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
                                        <input
                                            type="date"
                                            value={dataFinal}
                                            onChange={(e) => setDataFinal(e.target.value)}
                                            className="h-11 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    
                                    <div className="flex items-end">
                                        <button 
                                            onClick={buscarContagem} 
                                            disabled={loadingContagem} 
                                            className={BTN}
                                        >
                                            {loadingContagem ? "Buscando..." : "Buscar"}
                                        </button>
                                    </div>
                                </div>

                                {msgContagem && <p className="text-sm text-gray-600">{msgContagem}</p>}

                                {/* Filtros de localização e prateleira após busca */}
                                {itensContagem.length > 0 && (
                                    <div>
                                        <div className="border-t pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por localização:</label>
                                                <select
                                                    value={localizacaoFiltro}
                                                    onChange={(e) => setLocalizacaoFiltro(e.target.value)}
                                                    className="h-10 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Todas as localizações</option>
                                                    <option value="PISO_A">PISO A</option>
                                                    <option value="PISO_B">PISO B</option>
                                                    <option value="PISO_C">PISO C</option>
                                                    <option value="VITRINE">VITRINE</option>
                                                    <option value="BOX">BOX</option>
                                                    <option value="VENDA CASADA">VENDA CASADA</option>
                                                </select>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por prateleira:</label>
                                                <input
                                                    type="number"
                                                    placeholder="Ex: 13"
                                                    value={prateleira}
                                                    onChange={(e) => setPrateleira(e.target.value)}
                                                    className="h-10 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                {(localizacaoFiltro || prateleira) && (
                                                    <span className="text-sm text-gray-600">
                                                        Exibindo {itensFiltrados.length} de {itensContagem.length} itens
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Selects de usuários para contagem */}
                                        <div className="border-t pt-4 mt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contagem 1:</label>
                                                    <select
                                                        value={contagem1}
                                                        onChange={(e) => setContagem1(e.target.value)}
                                                        className="h-10 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                                        disabled={loadingUsuarios}
                                                    >
                                                        <option value="">Selecionar usuário</option>
                                                        {usuarios.map((usuario) => (
                                                            <option key={usuario.id} value={usuario.id}>
                                                                {usuario.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contagem 2:</label>
                                                    <select
                                                        value={contagem2}
                                                        onChange={(e) => setContagem2(e.target.value)}
                                                        className="h-10 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                                        disabled={loadingUsuarios}
                                                    >
                                                        <option value="">Selecionar usuário</option>
                                                        {usuarios.map((usuario) => (
                                                            <option key={usuario.id} value={usuario.id}>
                                                                {usuario.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Auditoria:</label>
                                                    <select
                                                        value={contagem3}
                                                        onChange={(e) => setContagem3(e.target.value)}
                                                        className="h-10 w-full border border-gray-300 rounded px-3 focus:ring-2 focus:ring-blue-500"
                                                        disabled={loadingUsuarios}
                                                    >
                                                        <option value="">Selecionar usuário</option>
                                                        {usuarios.map((usuario) => (
                                                            <option key={usuario.id} value={usuario.id}>
                                                                {usuario.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {/* Botão de salvar */}
                                            <div className="flex justify-end mt-4">
                                                <button 
                                                    onClick={salvarContagem}
                                                    disabled={itensSelecionados.size === 0 || (!contagem1 && !contagem2 && !contagem3)}
                                                    className={`${BTN} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    Salvar Contagem ({itensSelecionados.size} itens)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )}

                                {/* Tabela de Contagem */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="p-2 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={itensFiltrados.length > 0 && itensSelecionados.size === itensFiltrados.length}
                                                        onChange={toggleTodosItens}
                                                        className="rounded"
                                                    />
                                                </th>
                                                <th className="p-2 text-start">Data</th>
                                                <th className="p-2 text-start">Código</th>
                                                <th className="p-2 text-start">Produto</th>
                                                <th className="p-2 text-start">Marca</th>
                                                <th className="p-2 text-start">Ref. Fabricante</th>
                                                <th className="p-2 text-start">Ref. Fornecedor</th>
                                                <th className="p-2 text-start">Localização</th>
                                                <th className="p-2 text-start">Unidade</th>
                                                <th className="p-2 text-end">Qtde Saída</th>
                                                <th className="p-2 text-end">Estoque</th>
                                                <th className="p-2 text-end">Reserva</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itensFiltrados.length === 0 && (
                                                <tr>
                                                    <td colSpan={12} className="p-4 text-gray-500 text-center">
                                                        {loadingContagem ? "Carregando..." : "Nenhum item encontrado"}
                                                    </td>
                                                </tr>
                                            )}
                                            {itensFiltrados.map((item, idx) => (
                                                <tr key={idx} className="border-t hover:bg-gray-50">
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={itensSelecionados.has(idx)}
                                                            onChange={() => toggleItemSelecionado(idx)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="p-2">{formatarData(item.DATA)}</td>
                                                    <td className="p-2">{item.COD_PRODUTO}</td>
                                                    <td className="p-2">{item.DESC_PRODUTO}</td>
                                                    <td className="p-2">{item.MAR_DESCRICAO}</td>
                                                    <td className="p-2">{item.REF_FABRICANTE}</td>
                                                    <td className="p-2">{item.REF_FORNECEDOR}</td>
                                                    <td className="p-2">{item.LOCALIZACAO || "-"}</td>
                                                    <td className="p-2">{item.UNIDADE}</td>
                                                    <td className="p-2 text-end">{item.QTDE_SAIDA}</td>
                                                    <td className="p-2 text-end">{item.ESTOQUE}</td>
                                                    <td className="p-2 text-end">{item.RESERVA}</td>
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

                            {msgContagensLista && <p className="text-sm text-gray-600 mb-2">{msgContagensLista}</p>}

                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-2 text-start">Contagem</th>
                                            <th className="p-2 text-start">Usuário</th>
                                            <th className="p-2 text-start">Liberado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contagensLista.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-4 text-gray-500 text-center">
                                                    {loadingContagensLista ? "Carregando..." : "Nenhuma contagem encontrada"}
                                                </td>
                                            </tr>
                                        )}
                                        {contagensLista.map((item, idx) => (
                                            <tr key={idx} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => abrirModalLogs(item)}>
                                                <td className="p-3">{item.contagem}</td>
                                                <td className="p-3">{item.usuario.nome}</td>
                                                <td className="p-3">{item.liberado_contagem ? "Sim" : "Não"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {/* fim tabela contagens */}
                    </div>
                </div>
            </div>

            {/* MODAL DE LOGS */}
            {modalLogsAberto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">
                                Logs da Contagem {contagemSelecionada?.contagem} - {contagemSelecionada?.usuario.nome}
                            </h3>
                            <button
                                onClick={fecharModalLogs}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {loadingLogs ? (
                            <div className="text-center py-8">Carregando logs...</div>
                        ) : logsDetalhes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="border border-gray-300 p-2 text-sm">Código</th>
                                            <th className="border border-gray-300 p-2 text-sm">Descrição</th>
                                            <th className="border border-gray-300 p-2 text-sm">Estoque</th>
                                            <th className="border border-gray-300 p-2 text-sm">Contado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logsDetalhes.map((log, idx) => {
                                            const iguais = log.estoque === log.contado;
                                            return (
                                                <tr key={idx} className={iguais ? "bg-green-100" : "bg-red-100"}>
                                                    <td className="border border-gray-300 p-2 text-center font-semibold">
                                                        {log.item?.cod_produto ?? "-"}
                                                    </td>
                                                    <td className="border border-gray-300 p-2 text-left font-semibold">
                                                        {log.item?.desc_produto ?? "-"}
                                                    </td>
                                                    <td className="border border-gray-300 p-2 text-center font-semibold">
                                                        {log.estoque ?? "-"}
                                                    </td>
                                                    <td className="border border-gray-300 p-2 text-center font-semibold">
                                                        {log.contado ?? "-"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end mt-4">
                            <button
                                onClick={fecharModalLogs}
                                className={BTN}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL Fornecedor - Removido pois não é necessário para contagem de estoque */}
        </div>
    );
}
