"use client";

import {
    FaBox,
    FaCalendar,
    FaCheck,
    FaClipboardList,
    FaFileExcel,
    FaPlusSquare,
    FaSearch,
    FaSync,
    FaTimes,
    FaUser,
    FaMapMarkerAlt,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { useEffect, useState, useCallback } from "react";
import { genId } from "../../../utils/genId";
import { serviceUrl } from "@/lib/services";
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
};

type ContagemListaItem = {
    id: string;
    colaborador: string;
    contagem: number;
    contagem_cuid: string;
    piso?: string;
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
        item?: {
            cod_produto: number;
            desc_produto: string;
            localizacao?: string;
        };
    }>;
    itens?: any[];
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

const ESTOQUE_BASE = serviceUrl("estoque");

const estoqueUrl = (path: string) =>
    `${ESTOQUE_BASE}${path.startsWith("/") ? path : `/${path}`}`;

function ContagemCard({
    contagem,
    onOpenLogs,
}: {
    contagem: ContagemListaItem;
    onOpenLogs: (c: ContagemListaItem) => void;
}) {
    const getStatus = () => {
        if (contagem.liberado_contagem) {
            return { label: "Em Andamento", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
        }

        const logs = contagem.logs || [];
        const hasCounts = logs.length > 0 && logs.some(l => l.contado !== null && l.contado !== undefined);
        const allCounted = logs.length > 0 && logs.every(l => l.contado !== null && l.contado !== undefined);

        if (allCounted) {
            return { label: "Concluído", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
        }

        // Se não está liberado e não tem contagens (ou nem todos contados, caindo no caso de "não iniciado" se vazio, ou talvez um estado intermediário se parcialmente contado mas fechado?)
        // O usuário disse: "se estiver liberado não e não tiver nenhuma contagem colocar como não iniciado".
        // Vou assumir que se tiver logs mas nenhum contado, ou sem logs, é não iniciado.
        if (!hasCounts) {
            return { label: "Não Iniciado", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
        }

        // Fallback para caso tenha contagens parciais mas não esteja liberado (tecnicamente "Concluído" incompleto ou "Parcial")
        // Pela regra do usuário "todos preenchidos -> concluído", se sobrar algo, tecnicamente não é concluído.
        // Mas se não é "não iniciado" (tem alguma contagem), o que seria?
        // Vou tratar como "Concluído" (talvez parcial) ou manter a lógica de "Não Iniciado" apenas se ZERO contagens.
        // O usuário foi específico: "liberado não e todos preenchidos -> concluído", "liberado não e nenhuma contagem -> não iniciado".
        // O caso "liberado não e parcialmente preenchido" não foi especificado. Vou usar "Concluído" com uma cor diferente ou apenas "Concluído" assumindo que fecharam a contagem assim mesmo.
        // Mas para ser seguro, vou usar "Concluído" se tiver pelo menos 1, mas a regra diz "todos".
        // Vou seguir estritamente:
        // Se !liberado e todos contados -> Concluído
        // Se !liberado e nenhum contado -> Não Iniciado
        // Se !liberado e parcial -> Vou colocar "Incompleto" (Red?) para alertar, ou "Concluído" (Green) se for o comportamento padrão.
        // Dado o contexto de "estoque", contagem fechada parcial é comum. Vou deixar "Concluído" mas talvez com um warning visual se possível, mas vou simplificar para "Concluído" se tiver itens, ou "Não Iniciado" se vazio.
        // Re-lendo: "se tiver como liberado não e todos os produtos estiverem preenchidos então o status é concluído"
        // "e se estiver liberado não e não tiver nenhuma contagem colocar como não iniciado"

        return { label: "Concluído", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    };

    const status = getStatus();

    return (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col border border-gray-100 dark:border-strokedark">
            <div className="bg-gray-50 dark:bg-meta-4 p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-start">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">
                        Contagem #{contagem.contagem}
                    </div>
                    <div className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FaUser className="text-gray-400" size={14} />
                        {contagem.usuario?.nome || contagem.colaborador || "N/A"}
                    </div>
                </div>
                <div
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${status.color}`}
                >
                    {status.label}
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
                        <FaCalendar size={14} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Data Criação</span>
                        <span className="font-medium text-sm">
                            {new Date(contagem.created_at).toLocaleDateString("pt-BR")}
                        </span>
                    </div>
                </div>
                {contagem.piso !== undefined && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
                            <FaBox size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Piso</span>
                            <span className="font-medium text-sm">
                                {contagem.piso}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 pt-0 mt-auto">
                <button
                    onClick={() => onOpenLogs(contagem)}
                    className="w-full bg-white dark:bg-meta-4 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm py-2 px-4"
                >
                    <FaClipboardList />
                    Listar Produtos
                </button>
            </div>
        </div>
    );
}

export default function Tela() {
    const BTN =
        "h-10 px-4 inline-flex items-center justify-center gap-2 rounded-lg text-white font-semibold bg-primary hover:bg-opacity-90 transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    // ===== Box superior (criar cotação) =====
    const [formularioAberto, setFormularioAberto] = useState(false);
    const [pedido, setPedido] = useState("");
    const [piso, setPiso] = useState("");
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
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(
        new Set()
    );
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
            const url = `${estoqueUrl(
                `/compras/openquery/pedido/${encodeURIComponent(p)}`
            )}?empresa=3`;
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
            const url = `${estoqueUrl(
                `/estoque/contagem`
            )}?data_inicial=${encodeURIComponent(
                dataInicial
            )}&data_final=${encodeURIComponent(dataFinal)}&empresa=3`;

            const res = await fetch(url, { headers: { Accept: "application/json" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            setItensContagem(arr);
            if (!arr.length)
                setMsgContagem("Nenhum item encontrado no período informado.");
        } catch (e: any) {
            setMsgContagem(
                `Erro ao buscar contagem: ${e?.message || "desconhecido"}`
            );
        } finally {
            setLoadingContagem(false);
        }
    };

    const carregarUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
            const res = await fetch(
                "http://sistema-service.acacessorios.local/usuarios",
                {
                    headers: { Accept: "application/json" },
                }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            const usuariosEstoque = arr.filter((user) => user.setor === "Estoque");
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
            const todosIndices = new Set(
                Array.from({ length: itensFiltrados.length }, (_, i) => i)
            );
            setItensSelecionados(todosIndices);
        }
    };

    const salvarContagem = async () => {
        const produtosSelecionados = Array.from(itensSelecionados).map(
            (index) => itensFiltrados[index]
        );

        const contagem_cuid = genId();

        try {
            if (contagem1) {
                const usuario1 = usuarios.find((u) => u.id === contagem1);
                const payload1 = {
                    contagem: 1,
                    colaborador: usuario1?.nome,
                    contagem_cuid: contagem_cuid,
                    piso: piso ? String(piso) : undefined,
                    produtos: produtosSelecionados,
                };

                await fetch(estoqueUrl("/estoque/contagem"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload1),
                });
            }

            if (contagem2) {
                const usuario2 = usuarios.find((u) => u.id === contagem2);
                const payload2 = {
                    contagem: 2,
                    colaborador: usuario2?.nome,
                    contagem_cuid: contagem_cuid,
                    piso: piso ? String(piso) : undefined,
                    produtos: produtosSelecionados,
                };

                await fetch(estoqueUrl("/estoque/contagem"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload2),
                });
            }

            if (contagem3) {
                const usuario3 = usuarios.find((u) => u.id === contagem3);
                const payload3 = {
                    contagem: 3,
                    colaborador: usuario3?.nome,
                    contagem_cuid: contagem_cuid,
                    piso: piso ? String(piso) : undefined,
                    produtos: produtosSelecionados,
                };

                await fetch(estoqueUrl("/estoque/contagem"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload3),
                });
            }

            console.log("Contagens salvas com sucesso!");
            setFormularioAberto(false);
            carregarContagensLista();
        } catch (error) {
            console.error("Erro ao salvar contagens:", error);
        }
    };

    // Filtrar itens baseado na localização e prateleira selecionadas
    const itensFiltrados = itensContagem.filter((item) => {
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
                    passaLocalizacao =
                        localizacao === "VITRINE" || /^V\d/.test(localizacao);
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
            const prateleiraItem = prateleiraMatch
                ? parseInt(prateleiraMatch[1], 10)
                : null;
            passaPrateleira = prateleiraItem === parseInt(prateleira, 10);
        }

        return passaLocalizacao && passaPrateleira;
    });

    // ===== Tabela inferior (GET all) =====
    const [contagensLista, setContagensLista] = useState<ContagemListaItem[]>([]);
    const [loadingContagensLista, setLoadingContagensLista] = useState(false);
    const [msgContagensLista, setMsgContagensLista] = useState<string | null>(
        null
    );
    const [pageSize, setPageSize] = useState<number>(20);
    const [page, setPage] = useState(1);

    const [totalPages, setTotalPages] = useState(1);

    // Filtros da listagem
    const [filtroData, setFiltroData] = useState("");
    const [filtroPiso, setFiltroPiso] = useState("");

    // ===== Estados do modal de logs =====
    const [modalLogsAberto, setModalLogsAberto] = useState(false);
    const [contagemSelecionada, setContagemSelecionada] =
        useState<ContagemListaItem | null>(null);
    const [logsDetalhes, setLogsDetalhes] = useState<any[]>([]);
    const [logsGroupData, setLogsGroupData] = useState<Record<number, any>>({});
    const [itemDetalheSelecionado, setItemDetalheSelecionado] = useState<any | null>(null);
    const [subModalAberto, setSubModalAberto] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const carregarContagensLista = useCallback(async () => {
        setMsgContagensLista(null);
        setLoadingContagensLista(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                empresa: "3" // Assumindo empresa fixa como nas outras chamadas
            });

            if (filtroData) queryParams.append("data", filtroData);
            if (filtroPiso) queryParams.append("piso", filtroPiso);

            const res = await fetch(
                `${estoqueUrl("/estoque/contagem/lista")}?${queryParams.toString()}`,
                { headers: { Accept: "application/json" } }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const arr: ContagemListaItem[] = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data)
                    ? data
                    : [];
            setContagensLista(arr);

            if (data?.total) {
                setTotalPages(Math.ceil(data.total / pageSize));
            } else if (data?.last_page) {
                setTotalPages(data.last_page);
            }

            if (!arr.length) setMsgContagensLista("Nenhuma contagem encontrada.");
        } catch (e: any) {
            setMsgContagensLista(`Erro ao carregar: ${e?.message || "desconhecido"}`);
            setContagensLista([]);
        } finally {
            setLoadingContagensLista(false);
        }
    }, [page, pageSize, filtroData, filtroPiso]);

    // Debounce para recarregar quando os filtros mudarem (opcional, ou recarregar no botão)
    // Vou optar por recarregar no botão "Atualizar" ou quando mudar paginação.
    // Se quiser recarregar ao mudar o filtro, adicione filtroData/filtroPiso no array de deps do useEffect abaixo.
    // O usuário geralmente espera um botão "Filtrar" ou "Atualizar". O botão "Atualizar" já existe e chama `carregarContagensLista`.

    useEffect(() => {
        setPage(1);
        carregarContagensLista();
    }, [pageSize, carregarContagensLista]);

    useEffect(() => {
        carregarContagensLista();
    }, [page, carregarContagensLista]);

    // ===== Função para abrir modal de logs =====
    const abrirModalLogs = async (contagem: ContagemListaItem) => {
        setContagemSelecionada(contagem);
        setModalLogsAberto(true);
        setLoadingLogs(true);
        setLogsGroupData({});

        try {
            // 1. Carregar logs da contagem atual
            let logsAtuais: any[] = [];
            let itensAtuais: any[] = (contagem as any).itens || []; // Access items if available
            if ((contagem as any).logs) {
                logsAtuais = (contagem as any).logs;
            } else {
                const res = await fetch(
                    `${estoqueUrl(`/estoque/contagem/logs/${contagem.id}`)}`,
                    { headers: { Accept: "application/json" } }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                logsAtuais = data.logs || [];
            }

            // AGREGAR LOGS (Unique Rows por Produto)
            // Soma 'contado' de todas as entradas do mesmo produto nesta contagem
            const logsMap = new Map<number, any>();

            logsAtuais.forEach((log: any) => {
                const cod = log.item?.cod_produto ? Number(log.item.cod_produto) : null;
                if (!cod) return;

                if (!logsMap.has(cod)) {
                    // Tenta achar localização cruzando log.item_id com itensAtuais
                    const itemReal = itensAtuais.find(i => i.id === log.item_id);
                    const localizacao = itemReal?.localizacao || log.item?.localizacao || '-';

                    logsMap.set(cod, {
                        ...log,
                        localizacao,
                        contado: 0 // Reset para somar
                    });
                }

                const entry = logsMap.get(cod);
                entry.contado += (log.contado || 0);
                // Mantemos o estoque do primeiro registro (deve ser igual)
            });

            const logsAgregados = Array.from(logsMap.values());
            setLogsDetalhes(logsAgregados);

            // 2. Buscar dados do GRUPO para o Sub-Modal (Detalhes)
            if (contagem.contagem_cuid) {
                const resGrupo = await fetch(
                    `${estoqueUrl(`/estoque/contagem/grupo/${contagem.contagem_cuid}`)}?empresa=3`,
                    { headers: { Accept: "application/json" } }
                );

                if (resGrupo.ok) {
                    const grupoContagens: ContagemListaItem[] = await resGrupo.json();

                    // Mapa: ProdutoID -> { r1: { total: 0, locais: [] }, r2: { total: 0, locais: [] } }
                    const groupMap: Record<number, any> = {};

                    const promisesLogs = grupoContagens.map(c =>
                        fetch(`${estoqueUrl(`/estoque/contagem/logs/${c.id}`)}`, { headers: { Accept: "application/json" } })
                            .then(r => r.ok ? r.json() : { logs: [] })
                            .then(d => ({ ...c, logs: d.logs || [] }))
                    );

                    const contagensComLogs = await Promise.all(promisesLogs);

                    contagensComLogs.forEach(c => {
                        const round = c.contagem;
                        // Mágica do filtro: se a rodada do loop for MAIOR que a rodada atual que estou vendo, ignora.
                        // Ex: Vendo Round 1, ignora Round 2 e 3.
                        if (round > contagem.contagem) return;

                        const logs = c.logs || [];

                        logs.forEach((log: any) => {
                            const codProd = log.item?.cod_produto ? Number(log.item.cod_produto) : null;
                            if (!codProd) return;

                            if (!groupMap[codProd]) {
                                groupMap[codProd] = {
                                    r1: { total: 0, locais: [] },
                                    r2: { total: 0, locais: [] }
                                };
                            }

                            const qtd = log.contado || 0;
                            const itemReal = c.itens?.find((i: any) => i.id === log.item_id);
                            const loc = itemReal?.localizacao || log.item?.localizacao || 'N/D';
                            const usuario = c.usuario?.nome || 'Desc.';
                            const detalheStr = `${loc} (${usuario}): ${qtd}`;

                            if (round === 1) {
                                groupMap[codProd].r1.total += qtd;
                                groupMap[codProd].r1.locais.push(detalheStr);
                            } else if (round === 2) {
                                groupMap[codProd].r2.total += qtd;
                                groupMap[codProd].r2.locais.push(detalheStr);
                            }
                        });
                    });
                    setLogsGroupData(groupMap);
                }
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

    // Função para gerar Excel dos logs
    const gerarExcelLogs = () => {
        if (!logsDetalhes.length) return;
        const data = logsDetalhes.map((log) => ({
            Código: log.item?.cod_produto ?? "-",
            Descrição: log.item?.desc_produto ?? "-",
            Estoque: log.estoque ?? "-",
            Contado: log.contado ?? "-",
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logs");
        XLSX.writeFile(wb, `logs-contagem-${contagemSelecionada?.contagem}.xlsx`);
    };




    return (
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white">
                        <Link href="/" className="hover:text-primary transition-colors">
                            Intranet
                        </Link>{" "}
                        / Contagem de Estoque
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie contagens e inventários
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setFormularioAberto((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-300 ease-in-out active:scale-95 ${formularioAberto
                            ? "bg-gray-800 text-white hover:bg-gray-900"
                            : "bg-primary text-white hover:bg-opacity-90"
                            }`}
                        title={formularioAberto ? "Fechar Formulário" : "Nova Contagem"}
                    >
                        {formularioAberto ? (
                            <FaTimes size={18} />
                        ) : (
                            <FaPlusSquare size={18} />
                        )}
                        <span className="text-sm font-medium">
                            {formularioAberto ? "Fechar" : "Nova Contagem"}
                        </span>
                    </button>

                    <button
                        onClick={carregarContagensLista}
                        disabled={loadingContagensLista}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-300 ease-in-out active:scale-95 disabled:opacity-50 dark:bg-meta-4 dark:text-white dark:border-strokedark"
                        title="Atualizar Lista"
                    >
                        <FaSync
                            className={loadingContagensLista ? "animate-spin" : ""}
                            size={18}
                        />
                        <span className="text-sm font-medium">Atualizar</span>
                    </button>
                </div>
            </div>

            {/* BOX ABERTO - Filtros de Data */}
            <div
                className={`grid transition-all duration-300 ease-in-out overflow-hidden ${formularioAberto
                    ? "grid-rows-[1fr] opacity-100 mb-10 p-2"
                    : "grid-rows-[0fr] opacity-0 mb-0 p-0"
                    }`}
            >
                <div className="min-h-0">
                    <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-gray-100 dark:border-strokedark">
                        <h4 className="text-lg font-semibold mb-4 text-black dark:text-white">
                            Nova Contagem
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={dataInicial}
                                    onChange={(e) => setDataInicial(e.target.value)}
                                    className="h-11 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={dataFinal}
                                    onChange={(e) => setDataFinal(e.target.value)}
                                    className="h-11 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Piso
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 1"
                                    value={piso}
                                    onChange={(e) => setPiso(e.target.value)}
                                    className="h-11 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={buscarContagem}
                                    disabled={loadingContagem}
                                    className={BTN}
                                >
                                    <FaSearch />
                                    {loadingContagem ? "Buscando..." : "Buscar"}
                                </button>
                            </div>
                        </div>

                        {msgContagem && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {msgContagem}
                            </p>
                        )}

                        {/* Filtros de localização e prateleira após busca */}
                        {itensContagem.length > 0 && (
                            <div>
                                <div className="border-t border-gray-200 dark:border-strokedark pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Filtrar por localização:
                                            </label>
                                            <select
                                                value={localizacaoFiltro}
                                                onChange={(e) => setLocalizacaoFiltro(e.target.value)}
                                                className="h-10 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
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
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Filtrar por prateleira:
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="Ex: 13"
                                                value={prateleira}
                                                onChange={(e) => setPrateleira(e.target.value)}
                                                className="h-10 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            {(localizacaoFiltro || prateleira) && (
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    Exibindo {itensFiltrados.length} de{" "}
                                                    {itensContagem.length} itens
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selects de usuários para contagem */}
                                    <div className="border-t border-gray-200 dark:border-strokedark pt-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Contagem 1:
                                                </label>
                                                <select
                                                    value={contagem1}
                                                    onChange={(e) => setContagem1(e.target.value)}
                                                    className="h-10 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
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
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Contagem 2:
                                                </label>
                                                <select
                                                    value={contagem2}
                                                    onChange={(e) => setContagem2(e.target.value)}
                                                    className="h-10 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
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
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Auditoria:
                                                </label>
                                                <select
                                                    value={contagem3}
                                                    onChange={(e) => setContagem3(e.target.value)}
                                                    className="h-10 w-full border border-gray-300 dark:border-form-strokedark rounded-lg px-3 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-form-input text-black dark:text-white"
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
                                                disabled={
                                                    itensSelecionados.size === 0 ||
                                                    (!contagem1 && !contagem2 && !contagem3)
                                                }
                                                className={BTN}
                                            >
                                                <FaCheck />
                                                Salvar Contagem ({itensSelecionados.size} itens)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela de Contagem (Preview) */}
                                <div className="overflow-x-auto mt-6 border border-gray-200 dark:border-strokedark rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-meta-4 border-b border-gray-200 dark:border-strokedark">
                                            <tr>
                                                <th className="p-3 text-center w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            itensFiltrados.length > 0 &&
                                                            itensSelecionados.size === itensFiltrados.length
                                                        }
                                                        onChange={toggleTodosItens}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </th>
                                                <th className="p-3 text-start text-gray-700 dark:text-gray-300">
                                                    Data
                                                </th>
                                                <th className="p-3 text-start text-gray-700 dark:text-gray-300">
                                                    Código
                                                </th>
                                                <th className="p-3 text-start text-gray-700 dark:text-gray-300">
                                                    Produto
                                                </th>
                                                <th className="p-3 text-start text-gray-700 dark:text-gray-300">
                                                    Marca
                                                </th>
                                                <th className="p-3 text-start text-gray-700 dark:text-gray-300">
                                                    Localização
                                                </th>
                                                <th className="p-3 text-end text-gray-700 dark:text-gray-300">
                                                    Estoque
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-strokedark">
                                            {itensFiltrados.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="p-4 text-gray-500 text-center dark:text-gray-400"
                                                    >
                                                        {loadingContagem
                                                            ? "Carregando..."
                                                            : "Nenhum item encontrado"}
                                                    </td>
                                                </tr>
                                            )}
                                            {itensFiltrados.map((item, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                                                >
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={itensSelecionados.has(idx)}
                                                            onChange={() => toggleItemSelecionado(idx)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                                        {new Date(item.DATA).toLocaleDateString("pt-BR")}
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                                        {item.COD_PRODUTO}
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                                        {item.DESC_PRODUTO}
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                                        {item.MAR_DESCRICAO}
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                                        {item.LOCALIZACAO || "-"}
                                                    </td>
                                                    <td className="p-3 text-end text-gray-700 dark:text-gray-300">
                                                        {item.ESTOQUE}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LISTAGEM INFERIOR (Cards) */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-boxdark shadow-md rounded-xl p-4 border border-gray-100 dark:border-strokedark flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                            Listagem de Contagens
                        </div>

                        {/* Filtros */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <input
                                type="date"
                                className="h-9 rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input px-3 text-sm focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
                                value={filtroData}
                                onChange={(e) => setFiltroData(e.target.value)}
                                title="Filtrar por data"
                            />
                            <input
                                type="text"
                                placeholder="Piso"
                                className="h-9 w-24 rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input px-3 text-sm focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
                                value={filtroPiso}
                                onChange={(e) => setFiltroPiso(e.target.value)}
                            />
                            <button
                                onClick={() => { setPage(1); carregarContagensLista(); }}
                                className="h-9 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 text-sm font-medium transition-colors"
                            >
                                Filtrar
                            </button>
                        </div>
                    </div>

                    <select
                        className="h-10 border border-gray-300 dark:border-form-strokedark rounded-lg px-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-form-input text-black dark:text-white w-full sm:w-auto"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                        <option value={10}>10 contagens</option>
                        <option value={20}>20 contagens</option>
                        <option value={50}>50 contagens</option>
                        <option value={100}>100 contagens</option>
                    </select>
                </div>

                {msgContagensLista && (
                    <div className="p-4 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 shadow-sm dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30">
                        {msgContagensLista}
                    </div>
                )}

                {loadingContagensLista ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-boxdark h-48 rounded-xl shadow-sm border border-gray-100 dark:border-strokedark animate-pulse"
                            ></div>
                        ))}
                    </div>
                ) : contagensLista.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-boxdark rounded-xl border border-dashed border-gray-300 dark:border-strokedark shadow-sm">
                        <p className="text-gray-500 dark:text-gray-400">
                            Nenhuma contagem encontrada.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contagensLista.map((item, idx) => (
                            <ContagemCard
                                key={idx}
                                contagem={item}
                                onOpenLogs={abrirModalLogs}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination Controls */}
                {contagensLista.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-strokedark">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Mostrando página <span className="font-semibold text-black dark:text-white">{page}</span> de <span className="font-semibold text-black dark:text-white">{totalPages}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loadingContagensLista}
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
                                            disabled={loadingContagensLista}
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
                                disabled={page === totalPages || loadingContagensLista}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE LOGS */}
            {modalLogsAberto && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-stroke dark:border-strokedark">
                        <div className="p-6 border-b border-stroke dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-meta-4">
                            <div>
                                <h3 className="text-lg font-bold text-black dark:text-white">
                                    Logs da Contagem #{contagemSelecionada?.contagem}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Colaborador: {contagemSelecionada?.usuario.nome}
                                </p>
                            </div>
                            <button
                                onClick={fecharModalLogs}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-meta-4 transition-colors"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Botão para gerar Excel dos logs */}
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={gerarExcelLogs}
                                    className={`${BTN} bg-green-600 hover:bg-green-700`}
                                    disabled={logsDetalhes.length === 0}
                                >
                                    <FaFileExcel />
                                    Gerar Excel
                                </button>
                            </div>

                            <div className="border border-stroke dark:border-strokedark rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-2 dark:bg-meta-4 text-black dark:text-white font-medium border-b border-stroke dark:border-strokedark">
                                        <tr>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3">Descrição</th>
                                            <th className="px-4 py-3 text-right">Estoque</th>
                                            <th className="px-4 py-3 text-right">Contado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                                        {logsDetalhes.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    Nenhum log encontrado para esta contagem.
                                                </td>
                                            </tr>
                                        ) : (
                                            logsDetalhes.map((log, idx) => {
                                                const estoque = log.estoque || 0;
                                                const contado = log.contado || 0;
                                                const isMatch = estoque === contado;

                                                const rowClass = isMatch
                                                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-l-4 border-green-500"
                                                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-l-4 border-red-500";

                                                return (
                                                    <tr
                                                        key={idx}
                                                        className={`${rowClass} transition-colors border-b border-gray-100 dark:border-strokedark`}
                                                    >
                                                        <td className="px-4 py-3 font-medium">
                                                            {log.item?.cod_produto || "-"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {log.item?.desc_produto || "-"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {estoque}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-lg">
                                                            {contado}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    const cod = log.item?.cod_produto;
                                                                    const details = logsGroupData[cod];
                                                                    setItemDetalheSelecionado({
                                                                        cod,
                                                                        desc: log.item?.desc_produto,
                                                                        details
                                                                    });
                                                                    setSubModalAberto(true);
                                                                }}
                                                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                                                                title="Ver detalhes de localização"
                                                            >
                                                                <FaMapMarkerAlt size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-MODAL DE DETALHES */}
            {subModalAberto && itemDetalheSelecionado && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <div className="bg-white dark:bg-boxdark rounded-lg shadow-2xl w-full max-w-lg border border-gray-200 dark:border-strokedark flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4">
                            <h4 className="font-bold text-gray-800 dark:text-white">
                                Detalhes: {itemDetalheSelecionado.cod}
                            </h4>
                            <button
                                onClick={() => setSubModalAberto(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-6">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                {itemDetalheSelecionado.desc}
                            </div>

                            {/* Detalhes R1 e R2 (Dinâmico conforme contagem atual) */}
                            {Array.from({ length: contagemSelecionada?.contagem || 1 }, (_, i) => i + 1).map(round => {
                                const info = itemDetalheSelecionado.details?.[`r${round}`];
                                if (!info) return null;

                                return (
                                    <div key={round} className="bg-gray-50 dark:bg-black/20 rounded p-3 border border-gray-100 dark:border-strokedark">
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex justify-between">
                                            <span>{round}ª Contagem</span>
                                            <span className="text-black dark:text-white bg-gray-200 dark:bg-meta-4 px-2 py-0.5 rounded text-[10px]">
                                                Total: {info.total}
                                            </span>
                                        </div>

                                        {info.locais && info.locais.length > 0 ? (
                                            <ul className="text-sm space-y-1">
                                                {info.locais.map((loc: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                                                        <span>{loc}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-xs text-gray-400 italic">Nenhum registro encontrado.</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-strokedark flex justify-end">
                            <button
                                onClick={() => setSubModalAberto(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-meta-4 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-opacity-80 transition-colors text-sm font-medium"
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
