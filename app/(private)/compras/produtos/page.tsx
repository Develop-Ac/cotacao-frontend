"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    FaBox,
    FaSearch,
    FaSync,
    FaExclamationTriangle,
    FaExchangeAlt,
    FaArrowUp,
    FaArrowDown,
    FaMinus,
    FaInfoCircle
} from "react-icons/fa";
import { serviceUrl } from "@/lib/services";
import Loading from "@/components/Loading";

import MultiSelect from "@/components/MultiSelect";
import { useContext } from "react";
import { SidebarContext } from "@/components/SidebarContext";

type AnaliseItem = {
    id: number;
    pro_codigo: string;
    pro_descricao: string;
    sgr_codigo: number;
    mar_descricao: string;
    fornecedor1: string;
    estoque_disponivel: number;
    demanda_media_dia_ajustada: number;
    tempo_medio_estoque: number;
    data_min_venda: string;
    data_max_venda: string;
    alerta_tendencia_alta?: string; // Sim/Não
    qtd_vendida: number;
    curva_abc: string;
    categoria_estocagem: string;
    estoque_min_sugerido: number;
    estoque_max_sugerido: number;
    tipo_planejamento: string;
    teve_alteracao_analise: boolean;
    dias_ruptura: number;
    fator_tendencia: number;
    tendencia_label: string;
    dados_alteracao_json?: string;
    demanda_media_dia?: number;
};

type APIResponse = {
    data: AnaliseItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
};

// Estrutura de memória de cálculo
interface CalculationLog {
    baseMin: number;
    baseMax: number;
    coverageDays: number;
    scaleFactor: number;
    refDias: number;
    targetMin: number;
    targetMax: number;
    adjustmentReason?: string;
    trendBoost: number;
    baseNeeded: number;     // Base para MAX
    baseNeededMin: number;  // Base para MIN
    roundedResult: number;
    roundingRule: "Teto (Curva A/B)" | "Arredondar (Normal/C/D)";
    finalSuggestion: number; // Agora representa o MAX
    suggestionMin: number;   // Novo: Sugestão para atingir o mínimo
    estoqueAtual: number;
}

const getCalculationDetails = (item: AnaliseItem, coverageDays: number): CalculationLog => {
    const estoque = Number(item.estoque_disponivel || 0);
    const dbMin = Number(item.estoque_min_sugerido || 0);
    const dbMax = Number(item.estoque_max_sugerido || 0);
    const tipo = (item.tipo_planejamento || "Normal").trim();
    const curva = (item.curva_abc || "C").toUpperCase();
    const sgr = Number(item.sgr_codigo || 0);
    const alertaTendencia = item.alerta_tendencia_alta || "Não";

    const log: CalculationLog = {
        baseMin: dbMin,
        baseMax: dbMax,
        coverageDays: coverageDays,
        scaleFactor: 1,
        refDias: 0,
        targetMin: dbMin,
        targetMax: dbMax,
        trendBoost: 1.0,
        baseNeeded: 0,
        baseNeededMin: 0,
        roundedResult: 0,
        roundingRule: "Arredondar (Normal/C/D)",
        finalSuggestion: 0,
        suggestionMin: 0,
        estoqueAtual: estoque,
    };

    // 1. Sob Demanda
    if (tipo === "Sob_Demanda") {
        log.adjustmentReason = "Planejamento Sob Demanda (Compra Casada)";
        return log;
    }

    // 2. Sem política
    if (dbMin === 0 && dbMax === 0) {
        log.adjustmentReason = "Sem política de estoque definida (Min/Max zerados)";
        return log;
    }

    let targetMin = dbMin;
    let targetMax = dbMax;

    // 3. Escalar dias
    if (coverageDays > 0) {
        let refDiasMap: Record<string, number>;
        if (sgr === 154) {
            refDiasMap = { "A": 120, "B": 180, "C": 240, "D": 120 };
        } else {
            refDiasMap = { "A": 60, "B": 90, "C": 120, "D": 45 };
        }

        const refDias = refDiasMap[curva] || (sgr === 154 ? 240 : 120);
        log.refDias = refDias;

        const factor = coverageDays / refDias;
        log.scaleFactor = factor;

        targetMin = Math.ceil(dbMin * factor);
        targetMax = Math.ceil(dbMax * factor);

        if (tipo === "Pouco_Historico") {
            targetMin = Math.ceil(targetMin / 2.0);
            targetMax = Math.ceil(targetMax / 2.0);
            log.adjustmentReason = "Pouco Histórico (Redução de 50%)";
        }
        log.targetMin = targetMin;
        log.targetMax = targetMax;
    }

    // Garantir coerência
    if (targetMax < targetMin) targetMax = targetMin;

    // Se já tem estoque suficiente para o MAX, sugestão é 0 para ambos (ou negativa, mas travamos em 0)
    if (targetMax <= 0 || estoque >= targetMax) {
        log.finalSuggestion = 0;
        log.suggestionMin = 0;
        return log;
    }

    // Cálculo Sugestão MAX
    const baseNeededMax = targetMax - estoque;
    // Cálculo Sugestão MIN
    // Se estoque já cobre o min, sugestão min é 0
    const baseNeededMin = Math.max(0, targetMin - estoque);

    log.baseNeeded = baseNeededMax;
    log.baseNeededMin = baseNeededMin;

    let boostFactor = 1.0;
    if (alertaTendencia === "Sim" && (curva === "A" || curva === "B")) {
        boostFactor = 1.2;
        log.adjustmentReason = log.adjustmentReason ? `${log.adjustmentReason} + Tendência Alta` : "Tendência Alta (Boost 20%)";
    }
    log.trendBoost = boostFactor;

    const valMax = baseNeededMax * boostFactor;
    const valMin = baseNeededMin * boostFactor; // Aplica o mesmo boost para o min

    let resultMax = 0;
    let resultMin = 0;

    if (curva === "A" || curva === "B") {
        resultMax = Math.ceil(valMax);
        resultMin = Math.ceil(valMin);
        log.roundingRule = "Teto (Curva A/B)";
    } else {
        resultMax = Math.round(valMax);
        resultMin = Math.round(valMin);
        log.roundingRule = "Arredondar (Normal/C/D)";
    }

    log.roundedResult = resultMax;
    log.finalSuggestion = Math.max(0, resultMax);
    log.suggestionMin = Math.max(0, resultMin);

    return log;
};

// Wrapper mantido para compatibilidade onde se espera apenas um número (embora agora a UI use o log completo)
const calculatePurchaseSuggestion = (item: AnaliseItem, coverageDays: number): number => {
    return getCalculationDetails(item, coverageDays).finalSuggestion;
};

// Componente Modal de Memória de Cálculo
function CalculationModal({ log, item, onClose }: { log: CalculationLog; item: AnaliseItem; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 dark:border-strokedark">
                <div className="p-6 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/50">
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                            Memória de Cálculo
                        </h3>
                        <p className="text-sm text-gray-500">{item.pro_codigo} - {item.pro_descricao}</p>
                    </div>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
                </div>

                <div className="p-6 space-y-6 text-sm text-gray-700 dark:text-gray-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-meta-4/30 rounded-lg border border-gray-100 dark:border-strokedark">
                            <h4 className="font-semibold mb-2 text-black dark:text-white border-b pb-1">1. Dados Base</h4>
                            <div className="flex justify-between py-1"><span>Estoque Atual:</span> <span className="font-mono font-bold">{log.estoqueAtual}</span></div>
                            <div className="flex justify-between py-1"><span>Min Original:</span> <span className="font-mono">{log.baseMin}</span></div>
                            <div className="flex justify-between py-1"><span>Max Original:</span> <span className="font-mono">{log.baseMax}</span></div>
                            <div className="flex justify-between py-1"><span>Curva ABC:</span> <span className="font-mono">{item.curva_abc}</span></div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-300 border-b border-blue-200 pb-1">2. Ajuste de Cobertura</h4>
                            <div className="flex justify-between py-1"><span>Dias Desejados:</span> <span className="font-mono">{log.coverageDays} dias</span></div>
                            <div className="flex justify-between py-1"><span>Referência ({item.curva_abc}):</span> <span className="font-mono">{log.refDias} dias</span></div>
                            <div className="flex justify-between py-1"><span>Fator Escala:</span> <span className="font-mono font-bold text-blue-600">{log.scaleFactor.toFixed(2)}x</span></div>
                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                <div className="flex justify-between">Min Ajustado = {log.baseMin} × {log.scaleFactor.toFixed(2)} = <strong>{log.targetMin}</strong></div>
                                <div className="flex justify-between">Max Ajustado = {log.baseMax} × {log.scaleFactor.toFixed(2)} = <strong>{log.targetMax}</strong></div>
                            </div>
                        </div>
                    </div>

                    {log.adjustmentReason && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded-lg text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                            <FaExclamationTriangle />
                            <span><strong>Ajuste Especial:</strong> {log.adjustmentReason}</span>
                        </div>
                    )}

                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                        <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300 border-b border-green-200 pb-1">3. Cálculo Final</h4>

                        <div className="flex flex-col gap-2">
                            {/* Cálculo Mínimo */}
                            <div className="flex justify-between items-center border-b border-green-200/50 pb-2">
                                <span>Necessidade Mín (Min Ajustado - Estoque):</span>
                                <span className="font-mono whitespace-nowrap">
                                    {log.targetMin} - {log.estoqueAtual} = <strong>{log.baseNeededMin}</strong>
                                </span>
                            </div>

                            {/* Cálculo Máximo */}
                            <div className="flex justify-between items-center border-b border-green-200/50 pb-2">
                                <span>Necessidade Max (Max Ajustado - Estoque):</span>
                                <span className="font-mono whitespace-nowrap">
                                    {log.targetMax} - {log.estoqueAtual} = <strong>{Math.max(0, log.targetMax - log.estoqueAtual)}</strong>
                                </span>
                            </div>

                            {log.trendBoost > 1.0 && (
                                <div className="flex justify-between items-center border-b border-green-200/50 pb-2 text-green-700">
                                    <span>Boost Tendência (+20%):</span>
                                    <span className="font-mono">× {log.trendBoost}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                                <span>Regra de Arredondamento:</span>
                                <span className="italic text-xs">{log.roundingRule}</span>
                            </div>

                            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-green-200">
                                <span className="text-sm font-bold text-green-900 dark:text-green-100">Sugestão (Min - Max)</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {log.suggestionMin} - {log.finalSuggestion}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Componente Modal de Histórico
function HistoryModal({ item, onClose }: { item: AnaliseItem; onClose: () => void }) {
    if (!item.dados_alteracao_json) {
        // Fallback para quando não houver JSON detalhado
        // return null; // ANTES retornava null e não abria
    }

    let changes: Record<string, { old: any; new: any }> = {};
    if (item.dados_alteracao_json) {
        try {
            changes = JSON.parse(item.dados_alteracao_json);
        } catch (e) {
            console.error("Erro ao parsear JSON de alteração", e);
        }
    }

    // Ignorar campos de metadados se existirem
    delete changes["data_processamento"];
    delete changes["teve_alteracao_analise"];

    // Mapeamento de nomes de campos para algo legível
    const fieldLabels: Record<string, string> = {
        "curva_abc": "Curva ABC",
        "estoque_min_sugerido": "Estoque Min",
        "estoque_max_sugerido": "Estoque Max",
        "categoria_estocagem": "Categoria",
        "fator_tendencia": "Fator Tendência",
        "tendencia_label": "Tendência",
        "dias_ruptura": "Dias Ruptura",
        "demanda_media_dia_ajustada": "Demanda Média Ajustada",
        "tempo_medio_estoque": "Tempo Médio Estoque"
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-strokedark transform transition-all scale-100">
                <div className="p-6 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/50">
                    <h3 className="text-lg font-bold text-black dark:text-white">
                        Alterações Detectadas
                        <span className="block text-sm font-normal text-gray-500 mt-1">{item.pro_codigo} - {item.pro_descricao}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-2xl leading-none"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-0 overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-meta-4 font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-strokedark">
                            <tr>
                                <th className="px-6 py-3">Campo</th>
                                <th className="px-6 py-3 text-red-600 dark:text-red-400">Antes</th>
                                <th className="px-6 py-3 text-green-600 dark:text-green-400">Depois</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                            {Object.entries(changes).length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">Nenhuma alteração visível registrada no detalhe.</td>
                                </tr>
                            ) : (
                                Object.entries(changes).map(([field, vals]) => (
                                    <tr key={field} className="hover:bg-gray-50 dark:hover:bg-meta-4/30">
                                        <td className="px-6 py-3 font-medium text-gray-700 dark:text-gray-300">
                                            {fieldLabels[field] || field}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400 bg-red-50/50 dark:bg-red-900/10">
                                            {typeof vals.old === 'number' ? Number(vals.old).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(vals.old)}
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-gray-800 dark:text-white bg-green-50/50 dark:bg-green-900/10">
                                            {typeof vals.new === 'number' ? Number(vals.new).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(vals.new)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-strokedark bg-gray-50 dark:bg-meta-4/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors text-black dark:text-white"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AnaliseProdutosPage() {
    const [items, setItems] = useState<AnaliseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedChangeItem, setSelectedChangeItem] = useState<AnaliseItem | null>(null);
    const [selectedCalculationItem, setSelectedCalculationItem] = useState<{ item: AnaliseItem, log: CalculationLog } | null>(null);

    // Filtros
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [onlyChanges, setOnlyChanges] = useState(true);
    const [critical, setCritical] = useState(false);

    const [pageSize] = useState(50);

    const { sidebarCollapsed } = useContext(SidebarContext);

    const [selectedCurves, setSelectedCurves] = useState<string[]>([]);
    const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
    const [brand, setBrand] = useState("");

    // Simulação de Cobertura
    const [coverageDays, setCoverageDays] = useState<number | "">("");

    // Debounce search & brand
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [debouncedBrand, setDebouncedBrand] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setDebouncedBrand(brand);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, brand]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(pageSize),
                only_changes: String(onlyChanges),
                critical: String(critical),
            });

            if (debouncedSearch) {
                // Check if search contains comma to treat as multiple codes
                if (debouncedSearch.includes(',')) {
                    // Remove props and split
                    const codes = debouncedSearch.split(',').map(c => c.trim()).filter(c => c !== "").join(",");
                    if (codes) {
                        params.append("pro_codigos", codes);
                    }
                } else {
                    params.append("search", debouncedSearch);
                }
            }

            if (debouncedBrand) {
                params.append("marca", debouncedBrand);
            }

            if (selectedCurves.length > 0) {
                params.append("curve", selectedCurves.join(","));
            }

            if (selectedTrends.length > 0) {
                params.append("trend", selectedTrends.join(","));
            }

            if (selectedStatus.length > 0) {
                params.append("status", selectedStatus.join(","));
            }

            const baseUrl = serviceUrl("analiseEstoque");
            // Fallback para localhost em dev se necessario, ou via proxy
            const url = `${baseUrl}/analise?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Erro ao buscar dados: ${res.status}`);
            }

            const data: APIResponse = await res.json();
            setItems(data.data || []);
            setTotalPages(data.total_pages || 1);

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, onlyChanges, critical, debouncedSearch, debouncedBrand, selectedCurves, selectedTrends, selectedStatus]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [onlyChanges, critical, debouncedSearch, debouncedBrand, selectedCurves, selectedTrends, selectedStatus]);

    const getABCColor = (curve: string) => {
        switch (curve) {
            case "A": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "B": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
            case "C": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };

    const getTrendIcon = (label: string) => {
        if (label === "Subindo") return <FaArrowUp className="text-green-500" />;
        if (label === "Caindo") return <FaArrowDown className="text-red-500" />;
        return <FaMinus className="text-gray-400" />;
    };

    // Options for MultiSelect
    const curveOptions = [
        { label: "Curva A", value: "A" },
        { label: "Curva B", value: "B" },
        { label: "Curva C", value: "C" },
        { label: "Curva D", value: "D" },
    ];

    const trendOptions = [
        { label: "Subindo", value: "Subindo" },
        { label: "Caindo", value: "Caindo" },
        { label: "Estável", value: "Estável" },
    ];

    const statusOptions = [
        { label: "Normal", value: "Normal" },
        { label: "Excesso", value: "Excesso" },
        { label: "Crítico", value: "Critico" },
    ];

    return (
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white">
                        <Link href="/" className="hover:text-primary transition-colors">Intranet</Link> /
                        <Link href="/compras/cotacao" className="hover:text-primary transition-colors ml-2">Compras</Link> /
                        <span className="ml-2">Análise de Produtos</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Análise semanal de estoque, curva ABC e sugestões de compra
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const params = new URLSearchParams({
                                only_changes: String(onlyChanges),
                                critical: String(critical),
                            });
                            if (search) {
                                if (search.includes(',')) {
                                    const codes = search.split(',').map(c => c.trim()).filter(c => c !== "").join(",");
                                    if (codes) params.append("pro_codigos", codes);
                                } else {
                                    params.append("search", search);
                                }
                            }
                            if (brand) params.append("marca", brand);
                            if (selectedCurves.length > 0) params.append("curve", selectedCurves.join(","));
                            if (selectedTrends.length > 0) params.append("trend", selectedTrends.join(","));
                            if (selectedStatus.length > 0) params.append("status", selectedStatus.join(","));

                            if (coverageDays && Number(coverageDays) > 0) {
                                params.append("coverage_days", String(coverageDays));
                            }

                            const baseUrl = serviceUrl("analiseEstoque");
                            const url = `${baseUrl}/analise/export?${params.toString()}`;
                            window.open(url, "_blank");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95"
                    >
                        <FaArrowDown />
                        Exportar Excel
                    </button>

                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90 transition-all active:scale-95"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-md p-4 mb-6 border border-gray-100 dark:border-strokedark">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:flex-1 md:min-w-[150px]">
                        <input
                            type="text"
                            placeholder="Buscar por código ou descrição..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-primary outline-none bg-transparent dark:text-white transition-all"
                        />
                        <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
                    </div>

                    <div className="flex gap-2 xl:gap-4 w-full md:w-auto flex-nowrap items-center overflow-x-auto md:overflow-visible">
                        <div className="flex items-center gap-2 border-r border-gray-200 dark:border-strokedark pr-4 mr-2 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Cob. (Dias):</span>
                            <input
                                type="number"
                                value={coverageDays}
                                onChange={(e) => setCoverageDays(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-20 h-10 px-2 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-primary outline-none bg-transparent dark:text-white"
                                placeholder="0"
                            />
                        </div>

                        <div className="flex items-center gap-2 pr-4 mr-2 flex-shrink-0">
                            {/* Brand Filter */}
                            <input
                                type="text"
                                placeholder="Filtrar Marca..."
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="w-32 h-10 px-2 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-primary outline-none bg-transparent dark:text-white"
                            />
                        </div>

                        {/* Filtros Dropdown */}
                        <MultiSelect
                            options={curveOptions}
                            value={selectedCurves}
                            onChange={setSelectedCurves}
                            placeholder="Todas Curvas"
                            className="w-40"
                        />

                        <MultiSelect
                            options={trendOptions}
                            value={selectedTrends}
                            onChange={setSelectedTrends}
                            placeholder="Tendência"
                            className="w-40"
                        />

                        <MultiSelect
                            options={statusOptions}
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            placeholder="Status"
                            className="w-40"
                        />

                        <div className="w-[1px] h-8 bg-gray-200 dark:bg-strokedark hidden md:block mx-1"></div>

                        <label className={`
              flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-all whitespace-nowrap select-none h-11
              ${onlyChanges
                                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                                : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-meta-4 dark:border-strokedark dark:text-gray-400"
                            }
            `}>
                            <input
                                type="checkbox"
                                checked={onlyChanges}
                                onChange={(e) => setOnlyChanges(e.target.checked)}
                                className="hidden"
                            />
                            <FaExchangeAlt />
                            <span className={`${sidebarCollapsed ? 'hidden sm:inline' : 'hidden 2xl:inline'}`}>Mudanças</span>
                        </label>

                    </div>
                </div>
            </div>

            {/* Content */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loading />
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-boxdark rounded-xl shadow-md border border-gray-100 dark:border-strokedark overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Produto</th>
                                        <th className="px-6 py-4 text-center">Curva</th>
                                        <th className="px-6 py-4 text-right">Estoque</th>
                                        <th className="px-6 py-4 text-right">Média/Dia</th>
                                        <th className="px-6 py-4 text-center">Tendência</th>
                                        <th className="px-6 py-4 text-center">Sugestão (Min/Max)</th>
                                        {typeof coverageDays === "number" && coverageDays > 0 && (
                                            <th className="px-6 py-4 text-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                                Sugestão ({coverageDays}d)
                                            </th>
                                        )}
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-strokedark text-sm">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                                Nenhum registro encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => {
                                            const isCritical = (item.estoque_disponivel || 0) < (item.estoque_min_sugerido || 0);
                                            const isExcess = (item.estoque_disponivel || 0) > (item.estoque_max_sugerido || 0);

                                            let simulationSuggestion = 0;
                                            if (typeof coverageDays === "number" && coverageDays > 0) {
                                                simulationSuggestion = calculatePurchaseSuggestion(item, coverageDays);
                                            }

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                                                    <td className="px-6 py-3 max-w-xs">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-black dark:text-white">{item.pro_codigo}</span>
                                                            <span className="text-gray-600 dark:text-gray-300 truncate" title={item.pro_descricao}>{item.pro_descricao}</span>
                                                            <span className="text-xs text-gray-400 mt-1">{item.mar_descricao}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getABCColor(item.curva_abc)}`}>
                                                            {item.curva_abc}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <span className="font-medium text-black dark:text-white block">
                                                            {Number(item.estoque_disponivel).toLocaleString('pt-BR')}
                                                        </span>
                                                        {item.dias_ruptura > 0 && (
                                                            <div className="flex flex-col items-end mt-0.5">
                                                                <span className="text-xs text-red-500 font-bold leading-none">{item.dias_ruptura}d</span>
                                                                <span className="text-[10px] text-red-400 leading-none uppercase tracking-wide">ruptura</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">
                                                        {(item.demanda_media_dia_ajustada || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2" title={`Fator: ${(item.fator_tendencia || 0).toFixed(2)}`}>
                                                            {getTrendIcon(item.tendencia_label)}
                                                            <span className="text-xs">{item.tendencia_label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2 text-xs font-mono bg-gray-100 dark:bg-meta-4 py-1 px-2 rounded-lg w-fit mx-auto">
                                                            <span className="text-gray-500">Min:</span>
                                                            <span className="font-bold text-black dark:text-white">{item.estoque_min_sugerido}</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-gray-500">Max:</span>
                                                            <span className="font-bold text-black dark:text-white">{item.estoque_max_sugerido}</span>
                                                        </div>
                                                    </td>
                                                    {typeof coverageDays === "number" && coverageDays > 0 && (
                                                        <td className="px-6 py-3 text-center bg-blue-50/50 dark:bg-blue-900/10 relative group">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className={`font-bold text-lg ${simulationSuggestion > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                                                                    {getCalculationDetails(item, coverageDays).suggestionMin.toLocaleString('pt-BR')} - {simulationSuggestion.toLocaleString('pt-BR')}
                                                                </span>
                                                                {simulationSuggestion > 0 && (
                                                                    <span className="text-[10px] text-blue-500 font-medium">unidades</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedCalculationItem({ item, log: getCalculationDetails(item, coverageDays as number) })}
                                                                className="absolute top-1 right-1 text-gray-400 hover:text-blue-600 transition-colors p-1"
                                                            >
                                                                <FaInfoCircle size={12} />
                                                            </button>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-3 text-center">
                                                        {isCritical ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium">
                                                                <FaExclamationTriangle size={10} /> Crítico
                                                            </span>
                                                        ) : isExcess ? (
                                                            <span className="inline-flex px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">
                                                                Excesso
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                                                                <FaBox size={10} className="mr-1" /> Normal
                                                            </span>
                                                        )}

                                                        {item.teve_alteracao_analise && (
                                                            <div
                                                                onClick={() => setSelectedChangeItem(item)}
                                                                className="mt-1 text-[10px] text-blue-500 font-semibold uppercase tracking-wide cursor-pointer hover:text-blue-700 hover:underline"
                                                                title="Clique para ver o histórico de alterações"
                                                            >
                                                                Mudou
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination settings */}
                        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-strokedark">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Página {page} de {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1 rounded border border-gray-200 dark:border-strokedark text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 rounded border border-gray-200 dark:border-strokedark text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {selectedChangeItem && (
                <HistoryModal
                    item={selectedChangeItem}
                    onClose={() => setSelectedChangeItem(null)}
                />
            )}

            {selectedCalculationItem && (
                <CalculationModal
                    log={selectedCalculationItem.log}
                    item={selectedCalculationItem.item}
                    onClose={() => setSelectedCalculationItem(null)}
                />
            )}
        </div>
    );
}
