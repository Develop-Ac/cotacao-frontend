"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
    FaInfoCircle,
    FaLayerGroup,
    FaFileExcel,
    FaCheck,
    FaTimes,
    FaFilter,
    FaChevronRight,
    FaChevronDown,
    FaTags
} from "react-icons/fa";
import { serviceUrl } from "@/lib/services";
import Loading from "@/components/Loading";

import MultiSelect from "@/components/MultiSelect";
import { useContext } from "react";
import { SidebarContext } from "@/components/SidebarContext";
import Select from "@/components/Select";
import { useToast } from "@/components/Toast";
import TableSkeleton from "@/components/TableSkeleton";
import PromotionModal from "./PromotionModal";
import CotacaoModal from "./CotacaoModal";

export type AnaliseItem = {
    id: number;
    pro_codigo: string;
    pro_descricao: string;
    pro_referencia?: string;
    sgr_codigo: number;
    sgr_descricao?: string;
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
    group_id?: string;
    grp_estoque_disponivel?: number;
    grp_qtd_vendida?: number;
    grp_estoque_min_sugerido?: number;
    grp_estoque_max_sugerido?: number;
    grp_demanda_media_dia?: number;
    rateio_prop_grupo?: number;
    grp_estoque_min_ajustado?: number;
    grp_estoque_max_ajustado?: number;
    group_count?: number;
    grp_tendencia_ponderada?: number;
};

type APIResponse = {
    data: AnaliseItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
};

// Helper to measure text width
let measurementCanvas: HTMLCanvasElement | null = null;
const measureText = (text: string, font: string = "14px Outfit, sans-serif") => {
    if (typeof window === "undefined") return 0;
    if (!measurementCanvas) {
        measurementCanvas = document.createElement("canvas");
    }
    const context = measurementCanvas.getContext("2d");
    if (!context) return 0;
    context.font = font;
    return context.measureText(text || "").width;
};

// Memory of calculation
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
    // Group Data
    group?: {
        groupId: string;
        groupCount: number;
        groupStock: number;
        groupMin: number;
        groupMax: number;
        groupAvg: number;
        groupSuggestionMin: number;
        groupSuggestionMax: number;
        itemShare: number;
    }

}

// Interface para itens agrupados visualmente
interface GroupedItem extends AnaliseItem {
    children?: AnaliseItem[];
    isGroupHeader?: boolean;
    expanded?: boolean;
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

    if (item.group_id && (item.group_count || 0) > 1) {
        const gStock = item.grp_estoque_disponivel || 0;
        const gMin = item.grp_estoque_min_sugerido || 0;
        const gMax = item.grp_estoque_max_sugerido || 0;
        const gAvg = item.grp_demanda_media_dia || 0; // Using persisted weighted avg or sum
        const share = item.rateio_prop_grupo || 0;

        // Group Suggestions
        const gSugMin = Math.max(0, gMin - gStock);
        const gSugMax = Math.max(0, gMax - gStock);

        log.group = {
            groupId: item.group_id,
            groupCount: item.group_count || 0,
            groupStock: gStock,
            groupMin: gMin,
            groupMax: gMax,
            groupAvg: gAvg,
            groupSuggestionMin: Math.max(0, gMin - gStock),
            groupSuggestionMax: Math.max(0, gMax - gStock),
            itemShare: share
        };
    }

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

const calculatePurchaseSuggestionMin = (item: AnaliseItem, coverageDays: number): number => {
    return getCalculationDetails(item, coverageDays).suggestionMin;
};

const calculatePurchaseSuggestionGroup = (item: AnaliseItem, coverageDays: number): number | undefined => {
    return getCalculationDetails(item, coverageDays).group?.groupSuggestionMax;
};

const calculatePurchaseSuggestionMinGroup = (item: AnaliseItem, coverageDays: number): number | undefined => {
    return getCalculationDetails(item, coverageDays).group?.groupSuggestionMin;
};

// Componente Modal de Memória de Cálculo
function CalculationModal({
    log,
    item,
    isGroupOnly,
    onClose,
}: {
    log: CalculationLog;
    item: AnaliseItem;
    isGroupOnly?: boolean;
    onClose: () => void;
}) {


    // helper: calcula bloco de grupo com/sem cobertura
    const computeGroupView = () => {
        if (!log.group) return null;

        const baseMin = log.group.groupMin ?? 0;
        const baseMax = log.group.groupMax ?? 0;
        const stock = log.group.groupStock ?? 0;

        const baseSugMin = Math.max(0, baseMin - stock);
        const baseSugMax = Math.max(0, baseMax - stock);

        const hasCoverage = log.coverageDays > 0;

        const scaledMin = hasCoverage ? Math.ceil(baseMin * log.scaleFactor) : baseMin;
        const scaledMax = hasCoverage ? Math.ceil(baseMax * log.scaleFactor) : baseMax;

        const scaledSugMin = Math.max(0, scaledMin - stock);
        const scaledSugMax = Math.max(0, scaledMax - stock);

        return {
            baseMin,
            baseMax,
            baseSugMin,
            baseSugMax,
            hasCoverage,
            scaledMin,
            scaledMax,
            scaledSugMin,
            scaledSugMax,
            stock,
        };
    };

    const groupView = computeGroupView();

    // fecha clicando fora (no backdrop)
    const onBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onMouseDown={onBackdropMouseDown}
        >
            <div
                className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden border border-gray-100 dark:border-strokedark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/50">
                    <div>
                        <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                            Memória de Cálculo {isGroupOnly ? "(Grupo)" : ""}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {isGroupOnly ? item.pro_descricao : `${item.pro_codigo} - ${item.pro_descricao}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl text-gray-400 hover:text-gray-600"
                    >
                        &times;
                    </button>
                </div>

                {/* conteúdo com scroll e 2 colunas se tiver grupo, ou 3 colunas se for item individual */}
                <div className={`p-6 ${log.group || isGroupOnly ? 'max-h-[78vh] overflow-y-auto' : ''} text-sm text-gray-700 dark:text-gray-300`}>
                    {(!log.group && !isGroupOnly) ? (
                        // LAYOUT HORIZONTAL COMPACTO (SEM SCROLL)
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 1. DADOS BASE */}
                            <div className="p-4 bg-gray-50 dark:bg-meta-4/30 rounded-lg border border-gray-100 dark:border-strokedark h-fit">
                                <h4 className="font-semibold mb-2 text-black dark:text-white border-b pb-1">
                                    1. Dados Base
                                </h4>
                                <div className="flex justify-between py-1">
                                    <span>Estoque Atual:</span>
                                    <span className="font-mono font-bold">{log.estoqueAtual}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Min Original:</span>
                                    <span className="font-mono">{log.baseMin}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Max Original:</span>
                                    <span className="font-mono">{log.baseMax}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Curva ABC:</span>
                                    <span className="font-mono">{item.curva_abc}</span>
                                </div>
                            </div>

                            {/* 2. AJUSTE COBERTURA */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 h-fit">
                                <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-300 border-b border-blue-200 pb-1">
                                    2. Ajuste de Cobertura
                                </h4>
                                <div className="flex justify-between py-1">
                                    <span>Dias Desejados:</span>
                                    <span className="font-mono">{log.coverageDays} dias</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Referência ({item.curva_abc}):</span>
                                    <span className="font-mono">{log.refDias} dias</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Fator Escala:</span>
                                    <span className="font-mono font-bold text-blue-600">
                                        {log.scaleFactor.toFixed(2)}x
                                    </span>
                                </div>

                                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                    <div className="flex justify-between">
                                        Min Ajustado: <strong>{log.targetMin}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        Max Ajustado: <strong>{log.targetMax}</strong>
                                    </div>
                                </div>

                                {log.adjustmentReason && (
                                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded text-yellow-800 dark:text-yellow-400 text-xs flex items-center gap-1">
                                        <FaExclamationTriangle size={10} />
                                        <span>{log.adjustmentReason}</span>
                                    </div>
                                )}
                            </div>

                            {/* 3. CALCULO FINAL */}
                            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 h-fit">
                                <h4 className="font-semibold mb-2 text-green-800 dark:text-green-300 border-b border-green-200 pb-1">
                                    3. Cálculo Final
                                </h4>

                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center border-b border-green-200/50 pb-2">
                                        <span>Nec. Mín:</span>
                                        <span className="font-mono font-bold">
                                            {log.baseNeededMin}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center border-b border-green-200/50 pb-2">
                                        <span>Nec. Max:</span>
                                        <span className="font-mono font-bold">
                                            {Math.max(0, log.targetMax - log.estoqueAtual)}
                                        </span>
                                    </div>

                                    {log.trendBoost > 1.0 && (
                                        <div className="flex justify-between items-center text-green-700 text-xs">
                                            <span>Boost (+20%):</span>
                                            <span className="font-mono">Sim</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-green-200">
                                        <span className="text-sm font-bold text-green-900 dark:text-green-100">
                                            Sugestão
                                        </span>
                                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                            {log.suggestionMin} - {log.finalSuggestion}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : isGroupOnly ? (
                        /* LAYOUT EXCLUSIVO PARA GRUPO */
                        <div className="max-w-2xl mx-auto space-y-4">
                            {log.group && groupView && (
                                <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                    <h4 className="font-bold mb-4 text-purple-800 dark:text-purple-300 border-b border-purple-200 pb-2 flex items-center gap-2 text-base">
                                        <FaLayerGroup size={18} /> Detalhes do Grupo Unificado
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-purple-100/50 pb-1">
                                                <span className="text-gray-500">Quantidade de Itens:</span>
                                                <span className="font-bold">{log.group.groupCount}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-purple-100/50 pb-1">
                                                <span className="text-gray-500">Estoque Total Disponível:</span>
                                                <span className="font-bold text-purple-700 dark:text-purple-300">
                                                    {groupView.stock.toLocaleString("pt-BR")} un
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-purple-100/50 pb-1">
                                                <span className="text-gray-500">Fator de Tendência (Médio):</span>
                                                <span className="font-bold">{(item.grp_tendencia_ponderada || 0).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            <div className="bg-white/40 dark:bg-black/20 p-3 rounded-lg border border-purple-100/50">
                                                <h5 className="font-semibold text-[10px] uppercase text-purple-400 mb-2">Ajuste de Simulação ({log.coverageDays} dias)</h5>
                                                <div className="flex justify-between py-1">
                                                    <span>Min Grupo (Original):</span>
                                                    <span className="font-mono">{groupView.baseMin}</span>
                                                </div>
                                                <div className="flex justify-between py-1">
                                                    <span>Max Grupo (Original):</span>
                                                    <span className="font-mono">{groupView.baseMax}</span>
                                                </div>
                                                <div className="flex justify-between py-1 mt-1 border-t border-purple-100/30 pt-1 font-bold">
                                                    <span>Min Simulado:</span>
                                                    <span className="text-purple-600 dark:text-purple-400">{groupView.scaledMin}</span>
                                                </div>
                                                <div className="flex justify-between py-1 font-bold">
                                                    <span>Max Simulado:</span>
                                                    <span className="text-purple-600 dark:text-purple-400">{groupView.scaledMax}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-white/60 dark:bg-black/30 rounded-xl border-2 border-purple-200 dark:border-purple-800/50 flex flex-col items-center">
                                        <span className="text-sm font-bold text-purple-900 dark:text-purple-100 mb-1 uppercase tracking-widest">
                                            Sugestão de Compra para o Grupo
                                        </span>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center">
                                                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                                    {groupView.scaledSugMin} - {groupView.scaledSugMax}
                                                </span>
                                                <span className="text-[10px] text-purple-400 font-medium">unidades sugeridas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // LAYOUT ORIGINAL (COM SCROLL E GRUPO)
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                            {/* COLUNA 1: DADOS BASE + COBERTURA (md:col-span-4) */}
                            <div className="md:col-span-4 space-y-3">
                                {/* 1. DADOS BASE */}
                                <div className="p-3 bg-gray-50 dark:bg-meta-4/30 rounded-lg border border-gray-100 dark:border-strokedark">
                                    <h4 className="font-semibold mb-1 text-black dark:text-white border-b border-gray-200 dark:border-strokedark pb-1">
                                        1. Dados Base
                                    </h4>
                                    <div className="flex justify-between py-0.5">
                                        <span>Estoque Atual:</span>
                                        <span className="font-mono font-bold">{log.estoqueAtual}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span>Min Original:</span>
                                        <span className="font-mono">{log.baseMin}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span>Max Original:</span>
                                        <span className="font-mono">{log.baseMax}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span>Curva ABC:</span>
                                        <span className="font-mono">{item.curva_abc}</span>
                                    </div>
                                </div>

                                {/* 2. AJUSTE COBERTURA */}
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <h4 className="font-semibold mb-1 text-blue-800 dark:text-blue-300 border-b border-blue-200 pb-1">
                                        2. Ajuste de Cobertura
                                    </h4>
                                    <div className="flex justify-between py-0.5">
                                        <span>Dias Desejados:</span>
                                        <span className="font-mono">{log.coverageDays} dias</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span>Referência ({item.curva_abc}):</span>
                                        <span className="font-mono">{log.refDias} dias</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                        <span>Fator Escala:</span>
                                        <span className="font-mono font-bold text-blue-600">
                                            {log.scaleFactor.toFixed(2)}x
                                        </span>
                                    </div>
                                    <div className="mt-1 pt-1 border-t border-blue-200/50 text-[10px] text-blue-600 dark:text-blue-400">
                                        <div className="flex justify-between">
                                            Min: <strong>{log.targetMin}</strong>
                                            <span className="mx-1">|</span>
                                            Max: <strong>{log.targetMax}</strong>
                                        </div>
                                    </div>
                                    {log.adjustmentReason && (
                                        <div className="mt-1 p-1 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded text-yellow-800 dark:text-yellow-400 flex items-center gap-1 text-[10px]">
                                            <FaExclamationTriangle size={10} />
                                            <span className="truncate" title={log.adjustmentReason}>
                                                {log.adjustmentReason}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COLUNA 2: CÁLCULO FINAL (md:col-span-4) */}
                            <div className="md:col-span-4 space-y-3">
                                {/* 3. CÁLCULO FINAL */}
                                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 h-full">
                                    <h4 className="font-semibold mb-1 text-green-800 dark:text-green-300 border-b border-green-200 pb-1">
                                        3. Cálculo Final (Item)
                                    </h4>

                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-center border-b border-green-200/50 pb-1">
                                            <span>Necessidade Mín:</span>
                                            <span className="font-mono font-bold">{log.baseNeededMin}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-green-200/50 pb-1">
                                            <span className="text-[10px] text-gray-500 mr-1">({log.targetMin} - {log.estoqueAtual})</span>
                                        </div>

                                        <div className="flex justify-between items-center border-b border-green-200/50 pb-1">
                                            <span>Necessidade Max:</span>
                                            <span className="font-mono font-bold">
                                                {Math.max(0, log.targetMax - log.estoqueAtual)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-green-200/50 pb-1">
                                            <span className="text-[10px] text-gray-500 mr-1">({log.targetMax} - {log.estoqueAtual})</span>
                                        </div>

                                        {log.trendBoost > 1.0 && (
                                            <div className="flex justify-between items-center text-green-700">
                                                <span>Boost Tendência:</span>
                                                <span className="font-mono text-[10px]">Sim (+20%)</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-1">
                                            <span>Arred.:</span>
                                            <span className="italic text-[10px] truncate max-w-[80px]" title={log.roundingRule}>{log.roundingRule}</span>
                                        </div>

                                        <div className="flex flex-col items-center mt-2 pt-2 border-t-2 border-green-200 bg-white/50 dark:bg-black/20 rounded p-2">
                                            <span className="text-xs font-bold text-green-900 dark:text-green-100 mb-1">
                                                SUGESTÃO ITEM
                                            </span>
                                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                                {log.suggestionMin} - {log.finalSuggestion}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COLUNA 3: ANÁLISE GRUPO (md:col-span-4) */}
                            <div className="md:col-span-4 space-y-3">
                                {log.group && groupView && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30 h-full flex flex-col">
                                        <h4 className="font-semibold mb-1 text-purple-800 dark:text-purple-300 border-b border-purple-200 pb-1 flex items-center gap-1">
                                            <FaLayerGroup size={12} /> 4. Análise Grupo
                                        </h4>

                                        <div className="space-y-1 flex-1">
                                            <div className="flex justify-between py-0.5">
                                                <span>Itens:</span>
                                                <span className="font-mono font-bold">{log.group.groupCount}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5">
                                                <span>Estoque Total:</span>
                                                <span className="font-mono font-bold">{groupView.stock.toLocaleString("pt-BR")}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5">
                                                <span>Min/Max Grupo:</span>
                                                <span className="font-mono text-[10px]">{groupView.baseMin} / {groupView.baseMax}</span>
                                            </div>
                                            <div className="flex justify-between py-0.5 border-b border-purple-200/50 pb-1">
                                                <span>Part. Item:</span>
                                                <span className="font-mono font-bold">{(log.group.itemShare * 100).toFixed(1)}%</span>
                                            </div>

                                            {groupView.hasCoverage && (
                                                <div className="mt-2 text-[10px] text-purple-700 dark:text-purple-300 bg-white/40 dark:bg-black/20 p-1 rounded">
                                                    <div>Cobertura ({log.coverageDays}d):</div>
                                                    <div className="flex justify-between">
                                                        Min: <strong>{groupView.scaledMin.toLocaleString("pt-BR")}</strong>
                                                        <span className="mx-1">|</span>
                                                        Max: <strong>{groupView.scaledMax.toLocaleString("pt-BR")}</strong>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-purple-200 dark:border-purple-800/30">
                                            <div className="text-center text-purple-900 dark:text-purple-200 font-bold mb-1">
                                                SUGESTÃO GRUPO
                                            </div>
                                            <div className="flex justify-center items-center">
                                                {groupView.hasCoverage ? (
                                                    <div className="text-center">
                                                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400 block leading-none">
                                                            {groupView.scaledSugMin.toLocaleString("pt-BR")} - {groupView.scaledSugMax.toLocaleString("pt-BR")}
                                                        </span>
                                                        <span className="text-[9px] text-purple-500 opacity-80 mt-1 block">
                                                            (Sug. Original: {groupView.baseSugMin} - {groupView.baseSugMax})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                                        {groupView.baseSugMin.toLocaleString("pt-BR")} - {groupView.baseSugMax.toLocaleString("pt-BR")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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

// Componente Modal de Confirmação
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-strokedark transform scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-meta-4 font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AnaliseProdutosPage() {
    const { success, error, info, warning } = useToast();
    const [items, setItems] = useState<AnaliseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [overflowVisible, setOverflowVisible] = useState(false);
    const [isGroupedView, setIsGroupedView] = useState(true); // Default to grouped view if preferred
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (showAdvancedFilters) {
            timeout = setTimeout(() => {
                setOverflowVisible(true);
            }, 300); // Wait for transition to finish
        } else {
            setOverflowVisible(false);
        }
        return () => clearTimeout(timeout);
    }, [showAdvancedFilters]);

    // Click outside to collapse filters
    const filtersRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filtersRef.current && !filtersRef.current.contains(event.target as Node) && showAdvancedFilters) {
                setShowAdvancedFilters(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showAdvancedFilters]);

    const [selectedChangeItem, setSelectedChangeItem] = useState<AnaliseItem | null>(null);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
    });

    const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmState({ isOpen: true, title, message, onConfirm });
    };

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ show: boolean, x: number, y: number, item: AnaliseItem | null }>({
        show: false,
        x: 0,
        y: 0,
        item: null
    });

    const handleContextMenu = (e: React.MouseEvent, item: AnaliseItem) => {
        e.preventDefault();
        setContextMenu({
            show: true,
            x: e.pageX,
            y: e.pageY,
            item
        });
    };

    // Close Context Menu on Click
    const [promotionModalOpen, setPromotionModalOpen] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, show: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    const [selectedCalculationItem, setSelectedCalculationItem] = useState<{ item: AnaliseItem, log: CalculationLog, isGroupOnly?: boolean } | null>(null);

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
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
    const [filterGroupName, setFilterGroupName] = useState<string | null>(null);
    // Search match type
    const [searchMatchType, setSearchMatchType] = useState<'contains' | 'starts_with' | 'exact'>('contains');
    const [subgroupOptions, setSubgroupOptions] = useState<{ label: string, value: string }[]>([]);
    const [brandOptions, setBrandOptions] = useState<{ label: string, value: string }[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ label: string, value: string }[]>([]);
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



    useEffect(() => {
        const fetchSubgroups = async () => {
            try {
                const baseUrl = serviceUrl("analiseEstoque");

                // Fetch Subgroups
                const resSub = await fetch(`${baseUrl}/subgroups`);
                if (resSub.ok) {
                    const data: string[] = await resSub.json();
                    setSubgroupOptions(data.map(s => ({ label: s, value: s })));
                }

                // Fetch Brands
                const resBrand = await fetch(`${baseUrl}/brands`);
                if (resBrand.ok) {
                    const data: string[] = await resBrand.json();
                    setBrandOptions(data.map(s => ({ label: s, value: s })));
                }

                // Fetch Categories
                const resCat = await fetch(`${baseUrl}/categories`);
                if (resCat.ok) {
                    const data: string[] = await resCat.json();
                    setCategoryOptions(data.map(c => ({ label: c, value: c })));
                }

            } catch (e) {
                console.error("Failed to load options", e);
            }
        };
        fetchSubgroups();
    }, []);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setErrorMsg(null);
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
                    params.append("match_type", searchMatchType);
                }
            }

            if (debouncedBrand) {
                params.append("marca", debouncedBrand);
            }

            if (filterGroupId) {
                params.append("group_id", filterGroupId);
            }

            if (selectedSubgroups.length > 0) {
                params.append("subgrupo", selectedSubgroups.join(","));
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

            if (typeof coverageDays === "number" && coverageDays > 0) {
                params.append("coverage_days", String(coverageDays));
            }

            if (isGroupedView) {
                params.append("grouped_view", "true");
            }

            const baseUrl = serviceUrl("analiseEstoque");
            // Fallback para localhost em dev se necessario, ou via proxy
            const url = `${baseUrl}/analise?${params.toString()}`;
            console.log("[analise] GET =", url);
            const res = await fetch(url, { signal: abortControllerRef.current.signal });
            if (!res.ok) {
                throw new Error(`Erro ao buscar dados: ${res.status}`);
            }

            const data: APIResponse = await res.json();
            setItems(data.data || []);
            setTotalPages(data.total_pages || 1);

        } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.error(e);
            setErrorMsg(e.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, onlyChanges, critical, debouncedSearch, debouncedBrand, selectedCurves, selectedTrends, selectedStatus, selectedSubgroups, filterGroupId, searchMatchType, coverageDays, isGroupedView]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [onlyChanges, critical, debouncedSearch, debouncedBrand, selectedCurves, selectedTrends, selectedStatus, selectedSubgroups, filterGroupId, searchMatchType, coverageDays, isGroupedView]);

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

    const matchTypeOptions = [
        { label: "Contém", value: "contains" },
        { label: "Começa", value: "starts_with" },
        { label: "Exato", value: "exact" },
    ];

    // Resizable Columns State
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        produto: 400, // Merged Product + Brand
        curva: 70,    // Compact
        estoque: 120, // Merged Stock + Avg
        tendencia: 110,
        sugestao: 160,
        sugestao_sim: 140,
        status: 100,
    });

    const getColumnOrder = useCallback(() => {
        const order = ['produto', 'curva', 'estoque', 'tendencia', 'sugestao'];
        if (typeof coverageDays === "number" && coverageDays > 0) order.push('sugestao_sim');
        order.push('status');
        return order;
    }, [coverageDays]);

    const [resizing, setResizing] = useState<{ col: string, nextCol: string | null, startX: number, startWidth: number, startWidthNext: number } | null>(null);

    // Persist Preferences (Placed here after state definitions to avoid ReferenceError)
    useEffect(() => {
        // Load
        const savedMatchType = localStorage.getItem("analise_estoque_match_type");
        if (savedMatchType) {
            setSearchMatchType(savedMatchType as any);
        }

        const savedWidths = localStorage.getItem("analise_estoque_column_widths");
        if (savedWidths) {
            try {
                setColumnWidths(JSON.parse(savedWidths));
            } catch (e) {
                console.error("Erro ao ler larguras salvas", e);
            }
        }
    }, []);

    useEffect(() => {
        // Save Match Type
        localStorage.setItem("analise_estoque_match_type", searchMatchType);
    }, [searchMatchType]);

    useEffect(() => {
        // Save Column Widths
        const timer = setTimeout(() => {
            localStorage.setItem("analise_estoque_column_widths", JSON.stringify(columnWidths));
        }, 1000);
        return () => clearTimeout(timer);
    }, [columnWidths]);

    const startResize = useCallback((e: React.MouseEvent, col: string) => {
        // Remove individual e.preventDefault() to allow dblclick events
        e.stopPropagation();
        console.log("startResize called for column:", col);
        const order = getColumnOrder();
        const currentIndex = order.indexOf(col);
        const nextCol = currentIndex >= 0 && currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

        setResizing({
            col,
            nextCol,
            startX: e.clientX,
            startWidth: columnWidths[col],
            startWidthNext: nextCol ? columnWidths[nextCol] : 0
        });
    }, [columnWidths, getColumnOrder]);

    const minColumnWidths: Record<string, number> = {
        produto: 250,
        curva: 50,
        estoque: 100,
        tendencia: 90,
        sugestao: 140,
        sugestao_sim: 120,
        status: 80,
    };

    const doResize = useCallback((e: MouseEvent) => {
        if (!resizing) return;
        const diff = e.clientX - resizing.startX;

        const minW = minColumnWidths[resizing.col] || 60;
        let newWidth = Math.max(minW, resizing.startWidth + diff);

        // If there is a next column, limit growth/shrinkage against next column's limits
        if (resizing.nextCol) {
            const minWNext = minColumnWidths[resizing.nextCol] || 60;
            const maxDiff = resizing.startWidthNext - minWNext; // Max amount we can take from next

            // Constrain newWidth if it would shrink next column below min
            // The actual diff applied is (newWidth - startWidth)
            const actualDiff = newWidth - resizing.startWidth;
            if (actualDiff > maxDiff) {
                newWidth = resizing.startWidth + maxDiff;
            }

            const newWidthNext = resizing.startWidthNext - (newWidth - resizing.startWidth);
            setColumnWidths(prev => ({
                ...prev,
                [resizing.col]: newWidth,
                [resizing.nextCol as string]: newWidthNext
            }));
        } else {
            // If no next column (last column), just resize it (table grows)
            setColumnWidths(prev => ({ ...prev, [resizing.col]: newWidth }));
        }
    }, [resizing]);

    const stopResize = useCallback(() => {
        setResizing(null);
    }, []);

    const autoAdjustColumns = useCallback(() => {
        const order = getColumnOrder();
        const newWidths = { ...columnWidths };
        const font = "14px Outfit, sans-serif";
        const headerFont = "bold 12px Outfit, sans-serif";
        const padding = 48;

        const headerLabels: Record<string, string> = {
            produto: "Produto", // + Marca
            curva: "ABC",
            estoque: "Estoque / Média",
            tendencia: "Tendência",
            sugestao: "Sugestão",
            sugestao_sim: `Simulação (${coverageDays}d)`,
            status: "Status",
        };

        order.forEach(col => {
            let maxWidth = measureText(headerLabels[col] || "", headerFont);

            items.forEach(item => {
                let text = "";
                switch (col) {
                    case "produto":
                        // Estimate merged width: Code + Desc or Desc + Brand
                        const descWidth = measureText(item.pro_descricao, font);
                        maxWidth = Math.max(maxWidth, descWidth);
                        break;
                    case "curva":
                        text = item.curva_abc;
                        break;
                    case "estoque":
                        const stock = Number(item.estoque_disponivel).toLocaleString('pt-BR');
                        const avg = (item.demanda_media_dia_ajustada || 0).toFixed(2);
                        text = `${stock} / ${avg}`;
                        break;
                    case "tendencia":
                        text = item.tendencia_label;
                        break;
                    case "sugestao":
                        text = `${item.estoque_min_sugerido} - ${item.estoque_max_sugerido}`;
                        break;
                    case "sugestao_sim":
                        const details = getCalculationDetails(item, Number(coverageDays));
                        text = `${details.suggestionMin} - ${calculatePurchaseSuggestion(item, Number(coverageDays))}`;
                        break;
                    case "status":
                        text = "Critico";
                        break;
                }

                if (text) {
                    maxWidth = Math.max(maxWidth, measureText(text, font));
                }
            });

            const minW = minColumnWidths[col] || 60;
            const maxW = col === 'produto' ? 800 : 400;
            newWidths[col] = Math.min(maxW, Math.max(minW, maxWidth + padding));
        });

        setColumnWidths(newWidths);
    }, [items, coverageDays, columnWidths, getColumnOrder]);

    useEffect(() => {
        if (resizing) {
            window.addEventListener('mousemove', doResize);
            window.addEventListener('mouseup', stopResize);
        } else {
            window.removeEventListener('mousemove', doResize);
            window.removeEventListener('mouseup', stopResize);
        }
        return () => {
            window.removeEventListener('mousemove', doResize);
            window.removeEventListener('mouseup', stopResize);
        };
    }, [resizing, doResize, stopResize]);

    // .... existing useEffects .... 

    // Render Resize Handle
    const ResizeHandle = ({ col }: { col: string }) => (
        <div
            className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize group z-10 select-none"
            onMouseDown={(e) => startResize(e, col)}
            onDoubleClick={(e) => {
                console.log("Double click detected on handle for column:", col);
                e.preventDefault();
                e.stopPropagation();
                autoAdjustColumns();
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute right-[3px] top-0 bottom-0 w-[2px] bg-gray-300/50 dark:bg-gray-600/50 group-hover:bg-primary group-active:bg-primary transition-colors" />
        </div>
    );

    // Calculate total width based on visible columns
    const totalWidth = Object.keys(columnWidths).reduce((acc, key) => {
        if (key === 'sugestao_sim' && (!coverageDays || coverageDays <= 0)) return acc;
        return acc + columnWidths[key];
    }, 0);

    const activeGroupDisplay = filterGroupName || filterGroupId;

    // Selection State
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    // Modal de Cotação
    const [showCotacaoModal, setShowCotacaoModal] = useState(false);

    // Helper to toggle selection
    const toggleSelection = (code: string) => {
        const newSet = new Set(selectedProducts);
        if (newSet.has(code)) {
            newSet.delete(code);
        } else {
            newSet.add(code);
        }
        setSelectedProducts(newSet);
    };

    // Helper to select multiple
    const handleSelectProduct = (code: string) => {
        const newSet = new Set(selectedProducts);
        newSet.add(code);
        setSelectedProducts(newSet);
    };

    const handleDeselectProduct = (code: string) => {
        const newSet = new Set(selectedProducts);
        newSet.delete(code);
        setSelectedProducts(newSet);
    };

    const clearSelection = () => {
        setSelectedProducts(new Set());
    };

    // Actions
    const handleLinkProducts = async () => {
        if (selectedProducts.size < 2) return;

        const codes = Array.from(selectedProducts);

        requestConfirm(
            "Vincular Produtos",
            "Deseja realmente VINCULAR os produtos selecionados? Eles passarão a ser analisados como um grupo único.",
            async () => {
                try {
                    const baseUrl = serviceUrl("analiseEstoque");
                    const res = await fetch(`${baseUrl}/similar/group`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pro_codigos: codes })
                    });

                    if (!res.ok) throw new Error("Falha ao vincular produtos");

                    success("Produtos vinculados com sucesso! Clique em 'Recalcular' para atualizar os valores.");
                    // select remains, but data refreshed
                    fetchData();
                } catch (e: any) {
                    error(e.message || "Erro ao vincular produtos");
                }
            }
        );
    };

    const handleUnlinkProducts = async () => {
        if (selectedProducts.size === 0) return;
        const codes = Array.from(selectedProducts);

        requestConfirm(
            "Desvincular Produtos",
            "Deseja realmente desvincular os produtos selecionados?",
            async () => {
                try {
                    const baseUrl = serviceUrl("analiseEstoque");
                    const res = await fetch(`${baseUrl}/similar/ungroup`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pro_codigos: codes })
                    });

                    if (!res.ok) throw new Error("Falha ao desvincular");

                    fetchData();
                    success("Produtos desvinculados com sucesso.");
                } catch (e: any) {
                    error(e.message || "Erro ao desvincular");
                }
            }
        );
    };

    const handleRecalculate = async () => {
        if (selectedProducts.size === 0) return;
        const codes = Array.from(selectedProducts);

        try {
            setLoading(true); // Small loading indicator
            const baseUrl = serviceUrl("analiseEstoque");
            const res = await fetch(`${baseUrl}/similar/recalc`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pro_codigos: codes })
            });

            if (!res.ok) throw new Error("Falha ao recalcular");

            const data = await res.json();
            success(data.message || "Recálculo concluído com sucesso.");
            fetchData(); // Refresh grid to see new values
        } catch (e: any) {
            error(e.message || "Erro ao recalcular");
        } finally {
            setLoading(false);
        }
    };





    // Helper: Group Items for Display
    const getProcessedItems = (): GroupedItem[] => {
        if (!isGroupedView) return items;

        const processed: GroupedItem[] = [];
        const seenGroups = new Set<string>();

        // Sort items so defined groups come first or handle logically?
        // Actually, the API returns sorted by Group already.

        // We need to iterate and bundle
        // Since api can return partial groups (fixed by smart fetch), we can just bundle sequentially or map.
        // Map is safer.

        const groupMap = new Map<string, AnaliseItem[]>();
        const singles: AnaliseItem[] = [];

        items.forEach(item => {
            if (item.group_id) {
                if (!groupMap.has(item.group_id)) {
                    groupMap.set(item.group_id, []);
                }
                groupMap.get(item.group_id)?.push(item);
            } else {
                singles.push(item);
            }
        });

        // Now reconstruct list preserving order roughly?
        // Actually, let's just iterate original items. If item has group and group not processed, process whole group.
        // If item has group and group processed, skip.
        // If item no group, add.

        items.forEach(item => {
            if (!item.group_id) {
                processed.push(item);
            } else {
                if (!seenGroups.has(item.group_id)) {
                    seenGroups.add(item.group_id);
                    const members = groupMap.get(item.group_id) || [];

                    // If group has only 1 item, treat as regular item
                    if (members.length === 1) {
                        processed.push(members[0]);
                        return;
                    }

                    // Find best curve for the group (A < B < C < D)
                    const groupCurves = members.map(m => m.curva_abc || "C");
                    let bestCurve = "C";
                    if (groupCurves.includes("A")) bestCurve = "A";
                    else if (groupCurves.includes("B")) bestCurve = "B";
                    else if (groupCurves.includes("C")) bestCurve = "C";
                    else if (groupCurves.includes("D")) bestCurve = "D";

                    // Create Header Item
                    // Calculate Weighted Trend Manually: Sum(share * trend_factor)
                    const calculatedGroupTrend = members.reduce((acc, m) => {
                        const share = m.rateio_prop_grupo || 0;
                        const trend = m.fator_tendencia || 1; // Default to 1 (Stable) if missing? Or 0? Usually 1 is neutral if multiplicative, but here it's likely a factor around 1.0.
                        return acc + (share * trend);
                    }, 0);

                    const header: GroupedItem = {
                        ...item, // Base item data
                        id: -1 * item.id, // Negative ID for uniqueness
                        pro_descricao: item.pro_descricao,
                        children: members,
                        isGroupHeader: true,
                        curva_abc: bestCurve, // Use best curve for calculations
                        // Use Aggregated values for display
                        estoque_disponivel: item.grp_estoque_disponivel || 0,
                        demanda_media_dia_ajustada: item.grp_demanda_media_dia || 0,
                        // Tendencia Ponderada do Grupo (Calculated Manually)
                        tendencia_label: getTrendLabel(calculatedGroupTrend),
                        fator_tendencia: calculatedGroupTrend,
                        grp_tendencia_ponderada: calculatedGroupTrend,
                        // Sugestao Grupo
                        estoque_min_sugerido: item.grp_estoque_min_sugerido || 0,
                        estoque_max_sugerido: item.grp_estoque_max_sugerido || 0,
                        // Is expanded?
                        expanded: expandedGroups.has(item.group_id)
                    };
                    processed.push(header);

                    // If expanded, add children (handled in render loop usually, but here we can return flat list or hierarchical)
                    // Let's return flat list with flag? Or Hierarchical?
                    // Flat list is easier for Table Rendering usually if we just map.
                    if (expandedGroups.has(item.group_id)) {
                        members.forEach(m => processed.push({ ...m, isGroupHeader: false }));
                    }
                }
            }
        });

        return processed;
    };

    const getTrendLabel = (val?: number): string => {
        if (val === undefined || val === null) return "Estável";
        if (val > 1.05) return "Subindo";
        if (val < 0.95) return "Caindo";
        return "Estável";
    };

    const toggleGroupExpand = (groupId: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupId)) {
            newSet.delete(groupId);
        } else {
            newSet.add(groupId);
        }
        setExpandedGroups(newSet);
    };

    const displayItems = getProcessedItems();

    return (
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10" onContextMenu={(e) => contextMenu.show && e.preventDefault()}>

            {/* Floating Selection Bar */}
            {selectedProducts.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark shadow-2xl rounded-full px-6 py-3 z-[9999] flex items-center gap-4 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 border-r border-gray-200 dark:border-strokedark pr-4">
                        <span className="font-bold text-lg text-primary">{selectedProducts.size}</span>
                        <span className="text-sm text-gray-500">selecionados</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedProducts.size >= 2 && (
                            <button
                                onClick={handleLinkProducts}
                                className="px-4 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-opacity-90 transition-all flex items-center gap-2"
                            >
                                <FaLayerGroup /> Vincular
                            </button>
                        )}

                        <button
                            onClick={handleUnlinkProducts}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                            <FaTimes /> Desvincular
                        </button>

                        {/* Nova ação: Gerar Cotação */}
                        <button
                            onClick={() => setShowCotacaoModal(true)}
                            className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium hover:bg-yellow-100 transition-all flex items-center gap-2 border border-yellow-200"
                        >
                            <FaFileExcel /> Gerar Cotação
                        </button>

                        <div className="w-[1px] h-6 bg-gray-200 dark:bg-strokedark mx-1"></div>

                        <button
                            onClick={handleRecalculate}
                            className="px-4 py-2 bg-green-50 text-green-600 rounded-full text-sm font-medium hover:bg-green-100 transition-all flex items-center gap-2 border border-green-200"
                            title="Recalcular estatísticas do grupo no banco"
                        >
                            <FaSync /> Recalcular Valores
                        </button>
                    </div>

                    <button
                        onClick={clearSelection}
                        className="ml-2 text-gray-400 hover:text-gray-600 rounded-full p-1"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.show && contextMenu.item && (
                <div
                    className="fixed z-[99999] bg-white dark:bg-boxdark rounded-lg shadow-xl border border-gray-200 dark:border-strokedark py-1 min-w-[200px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-2 text-sm font-bold border-b border-gray-100 dark:border-strokedark text-gray-800 dark:text-gray-200">
                        {contextMenu.item.pro_codigo}
                    </div>

                    {/* Selection Option */}
                    <button
                        onClick={() => {
                            if (contextMenu.item) {
                                toggleSelection(contextMenu.item.pro_codigo);
                            }
                            setContextMenu({ ...contextMenu, show: false });
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors flex items-center gap-2 text-blue-600"
                    >
                        {selectedProducts.has(contextMenu.item.pro_codigo) ? (
                            <>
                                <FaTimes /> Desmarcar Produto
                            </>
                        ) : (
                            <>
                                <FaCheck /> Selecionar Produto
                            </>
                        )}
                    </button>

                    <div className="border-t border-gray-100 dark:border-strokedark my-1"></div>

                    {contextMenu.item.group_id ? (
                        <button
                            onClick={() => {
                                if (contextMenu.item) {
                                    setFilterGroupId(contextMenu.item.group_id || null);
                                    setFilterGroupName(contextMenu.item.pro_descricao);
                                }
                                setContextMenu({ ...contextMenu, show: false });
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors flex items-center gap-2 text-primary"
                        >
                            <FaLayerGroup />
                            Filtrar Similares
                        </button>
                    ) : (
                        <div className="px-4 py-2 text-sm text-gray-400 italic">Sem grupo de similares</div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    {/* ... existing header code ... */}
                    <h2 className="text-3xl font-bold text-black dark:text-white">
                        <Link href="/" className="hover:text-primary transition-colors">Intranet</Link> /
                        <Link href="/compras/cotacao" className="hover:text-primary transition-colors ml-2">Compras</Link> /
                        <span className="ml-2">Análise de Produtos</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Análise semanal de estoque, curva ABC e Sugestão de compra
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
                                    params.append("match_type", searchMatchType);
                                }
                            }

                            if (debouncedBrand) params.append("marca", debouncedBrand);
                            if (filterGroupId) params.append("group_id", filterGroupId);
                            if (selectedCurves.length > 0) params.append("curve", selectedCurves.join(","));
                            if (selectedTrends.length > 0) params.append("trend", selectedTrends.join(","));
                            if (selectedStatus.length > 0) params.append("status", selectedStatus.join(","));
                            if (selectedSubgroups.length > 0) params.append("subgrupo", selectedSubgroups.join(","));

                            if (coverageDays && Number(coverageDays) > 0) {
                                params.append("coverage_days", String(coverageDays));
                            }

                            if (isGroupedView) {
                                params.append("grouped_view", "true");
                            }

                            window.open(`${serviceUrl("analiseEstoque")}/analise/export?${params.toString()}`, "_blank");
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                        <FaFileExcel /> Exportar Excel
                    </button>

                    <button
                        onClick={() => setPromotionModalOpen(true)}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition flex items-center gap-2"
                        title="Simular Promoção de Estoque Obsoleto"
                    >
                        <FaTags /> Simular Promoção
                    </button>

                    <button
                        onClick={() => setIsGroupedView(!isGroupedView)}
                        className={`px-4 py-2 rounded-lg transition border flex items-center gap-2 ${isGroupedView
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-white dark:bg-meta-4 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4"
                            }`}
                        title={isGroupedView ? "Alternar para Lista Plana" : "Agrupar Similares"}
                    >
                        <FaLayerGroup />
                        {isGroupedView ? "Agrupado" : "Individual"}
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

            {/* Active Filter Indicator */}
            {
                activeGroupDisplay && (
                    <div className="mb-4 flex items-center gap-2 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <FaLayerGroup />
                        <span className="font-medium">Filtro de Grupo Similar Ativo:</span>
                        <span className="font-mono text-sm">{activeGroupDisplay}</span>
                        <button
                            onClick={() => {
                                setFilterGroupId(null);
                                setFilterGroupName(null);
                            }}
                            className="ml-auto text-sm hover:underline font-semibold"
                        >
                            Limpar Filtro
                        </button>
                    </div>
                )
            }

            {/* Filters */}
            <div ref={filtersRef} className="bg-white dark:bg-boxdark rounded-xl shadow-sm p-4 mb-6 border border-gray-100 dark:border-strokedark space-y-4">
                {/* Top Row: Search + Actions + Quick Filters */}
                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">

                    {/* Left Group: Search + Coverage + Advanced Toggle */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">

                        {/* Search & Match Type - Reduced Width */}
                        <div className="flex items-center h-10 w-full sm:w-80 border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-form-input transition-all overflow-hidden shadow-sm">
                            <div className="pl-3 pr-2 text-gray-400">
                                <FaSearch size={14} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-full bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-gray-400 min-w-0"
                            />
                            <div className="h-5 w-[1px] bg-gray-200 dark:bg-strokedark mx-2"></div>
                            <Select
                                options={matchTypeOptions}
                                value={searchMatchType}
                                onChange={(val) => setSearchMatchType(val as any)}
                                className="h-full"
                                triggerClassName="h-full px-2 text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors bg-transparent border-0 flex items-center gap-1"
                                dropdownWidth={140}
                            />
                        </div>

                        {/* Coverage Input - Moved Up */}
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-meta-4/30 border border-gray-200 dark:border-form-strokedark rounded-lg px-3 h-10 hover:border-gray-300 transition-colors cursor-text group flex-shrink-0" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider group-hover:text-primary transition-colors">Cobertura</span>
                            <input
                                type="number"
                                value={coverageDays}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "") {
                                        setCoverageDays("");
                                        return;
                                    }
                                    let num = Number(val);
                                    // Limit between 0 and 730 days (2 years)
                                    if (num < 0) num = 0;
                                    if (num > 730) num = 730;
                                    setCoverageDays(num);
                                }}
                                className="w-12 bg-transparent text-sm font-bold text-center outline-none text-black dark:text-white p-0 "
                                placeholder="0"
                            />
                            <span className="text-xs text-gray-400">dias</span>
                        </div>

                        {/* Advanced Filters Toggle */}
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`
                                h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border
                                ${showAdvancedFilters || (brand || selectedSubgroups.length > 0 || selectedCurves.length > 0 || selectedTrends.length > 0 || selectedStatus.length > 0)
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-meta-4/30 dark:text-gray-300 dark:border-strokedark"
                                }
                            `}
                        >
                            <FaFilter size={12} />
                            Filtros Avançados
                            {(brand || selectedSubgroups.length > 0 || selectedCurves.length > 0 || selectedTrends.length > 0 || selectedStatus.length > 0) && !showAdvancedFilters && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-white font-bold ml-1">
                                    {[!!brand, selectedSubgroups.length > 0, selectedCurves.length > 0, selectedTrends.length > 0, selectedStatus.length > 0].filter(Boolean).length}
                                </span>
                            )}
                            {showAdvancedFilters ? <FaMinus size={10} /> : <FaArrowDown size={10} />}
                        </button>
                    </div>

                    {/* Active Filters Summary Chips (Visible when Advanced Filters Hidden) */}
                    {!showAdvancedFilters && (
                        <div className="flex flex-wrap items-center gap-2 flex-1 justify-start xl:justify-center overflow-hidden h-10">
                            {brand && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-meta-4 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
                                    Marca: {brand} <button onClick={() => setBrand("")} className="hover:text-red-500"><FaTimes size={10} /></button>
                                </span>
                            )}
                            {selectedSubgroups.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-meta-4 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
                                    Subgrupos ({selectedSubgroups.length}) <button onClick={() => setSelectedSubgroups([])} className="hover:text-red-500"><FaTimes size={10} /></button>
                                </span>
                            )}
                            {selectedCurves.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-meta-4 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
                                    Curva ({selectedCurves.length}) <button onClick={() => setSelectedCurves([])} className="hover:text-red-500"><FaTimes size={10} /></button>
                                </span>
                            )}
                            {selectedTrends.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-meta-4 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
                                    Tendência ({selectedTrends.length}) <button onClick={() => setSelectedTrends([])} className="hover:text-red-500"><FaTimes size={10} /></button>
                                </span>
                            )}
                            {selectedStatus.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-meta-4 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
                                    Status ({selectedStatus.length}) <button onClick={() => setSelectedStatus([])} className="hover:text-red-500"><FaTimes size={10} /></button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Right Side Actions / Changes Filter */}
                    <div className="flex items-center gap-3 self-end xl:self-auto ml-auto xl:ml-0">
                        <label
                            className={`
                                flex items-center gap-2 px-4 h-10 rounded-lg cursor-pointer border transition-all select-none whitespace-nowrap
                                ${onlyChanges
                                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"
                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-form-input dark:border-form-strokedark dark:text-gray-400"
                                }
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={onlyChanges}
                                onChange={(e) => setOnlyChanges(e.target.checked)}
                                className="hidden"
                            />
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full ${onlyChanges ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                                <FaExchangeAlt size={10} />
                            </div>
                            <span className="text-sm font-medium">Apenas Alterações</span>
                        </label>
                    </div>
                </div>

                {/* Advanced Filters Section (Collapsible with smooth transition) */}
                <div
                    className={`transition-all duration-200 ease-in-out ${showAdvancedFilters ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'} ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
                >
                    <div className="pt-1">
                        <div className="h-[1px] bg-gray-100 dark:bg-strokedark w-full mb-4"></div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Brand Input */}
                            <div className="h-10 w-40">
                                <input
                                    type="text"
                                    placeholder="Filtrar Marca..."
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    className="w-full h-full px-3 text-sm border border-gray-200 dark:border-form-strokedark rounded-lg bg-gray-50 dark:bg-meta-4/30 focus:bg-white dark:focus:bg-form-input focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            <MultiSelect
                                options={subgroupOptions}
                                value={selectedSubgroups}
                                onChange={setSelectedSubgroups}
                                placeholder="Subgrupo"
                                className="w-40 h-10"
                            />

                            <MultiSelect
                                options={curveOptions}
                                value={selectedCurves}
                                onChange={setSelectedCurves}
                                placeholder="Curva ABC"
                                className="w-32 h-10"
                            />

                            <MultiSelect
                                options={trendOptions}
                                value={selectedTrends}
                                onChange={setSelectedTrends}
                                placeholder="Tendência"
                                className="w-32 h-10"
                            />

                            <MultiSelect
                                options={statusOptions}
                                value={selectedStatus}
                                onChange={setSelectedStatus}
                                placeholder="Status"
                                className="w-32 h-10"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {
                errorMsg && (
                    <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-lg mb-6">
                        {errorMsg}
                    </div>
                )
            }

            {
                loading ? (
                    <div className="mt-6">
                        <TableSkeleton cols={8} rows={12} />
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-boxdark rounded-xl shadow-md border border-gray-100 dark:border-strokedark">
                            <div>
                                <table
                                    className="text-left border-collapse table-fixed"
                                    style={{ minWidth: '100%', width: totalWidth }}
                                >
                                    <colgroup>
                                        <col style={{ width: columnWidths.produto }} />
                                        <col style={{ width: columnWidths.curva }} />
                                        <col style={{ width: columnWidths.estoque }} />
                                        <col style={{ width: columnWidths.tendencia }} />
                                        <col style={{ width: columnWidths.sugestao }} />
                                        {typeof coverageDays === "number" && coverageDays > 0 && (
                                            <col style={{ width: columnWidths.sugestao_sim }} />
                                        )}
                                        <col style={{ width: columnWidths.status }} />
                                    </colgroup>
                                    <thead className="sticky top-[0px] z-20 shadow-sm bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-3 py-4 text-left pl-6 relative group">
                                                Produto / Marca
                                                <ResizeHandle col="produto" />
                                            </th>
                                            <th className="px-1 py-4 text-center relative group">
                                                ABC
                                                <ResizeHandle col="curva" />
                                            </th>
                                            <th className="px-3 py-4 text-right relative group">
                                                Estoque / Média
                                                <ResizeHandle col="estoque" />
                                            </th>
                                            <th className="px-3 py-4 text-center relative group">
                                                Tendência
                                                <ResizeHandle col="tendencia" />
                                            </th>
                                            <th className="px-3 py-4 text-center relative group">
                                                Sugestão (Min-Max)
                                                <ResizeHandle col="sugestao" />
                                            </th>
                                            {typeof coverageDays === "number" && coverageDays > 0 && (
                                                <th className="px-3 py-4 text-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 whitespace-nowrap relative group">
                                                    Simulação ({coverageDays}d)
                                                    <ResizeHandle col="sugestao_sim" />
                                                </th>
                                            )}
                                            <th className="px-3 py-4 text-center relative group">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-strokedark text-sm">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="bg-gray-100 dark:bg-meta-4/50 p-4 rounded-full mb-3">
                                                            <FaSearch size={24} className="text-gray-400" />
                                                        </div>
                                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum registro encontrado</p>
                                                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                                            Tente ajustar seus filtros de busca para encontrar o que procura.
                                                        </p>
                                                        {(search || brand || selectedCurves.length > 0 || selectedSubgroups.length > 0) && (
                                                            <button
                                                                onClick={() => {
                                                                    setSearch("");
                                                                    setBrand("");
                                                                    setSelectedCurves([]);
                                                                    setSelectedTrends([]);
                                                                    setSelectedStatus([]);
                                                                    setSelectedSubgroups([]);
                                                                    setCoverageDays("");
                                                                    setFilterGroupId(null);
                                                                    setFilterGroupName(null);
                                                                    setPage(1);
                                                                }}
                                                                className="mt-4 text-primary hover:underline text-sm font-medium"
                                                            >
                                                                Limpar Filtros
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            displayItems.map((item) => {
                                                // 1. RENDER GROUP HEADER
                                                if (item.isGroupHeader) {
                                                    const isExpanded = expandedGroups.has(item.group_id || "");
                                                    // Calculate Group Status Logic
                                                    const gStock = item.grp_estoque_disponivel || 0;
                                                    const gMin = item.grp_estoque_min_sugerido || 0;
                                                    const gMax = item.grp_estoque_max_sugerido || 0;

                                                    // Simulation logic for group
                                                    let gScaledMin = gMin;
                                                    let gScaledMax = gMax;
                                                    let gSimSuggestion = 0;
                                                    let gSimMin = 0;

                                                    if (typeof coverageDays === "number" && coverageDays > 0) {
                                                        const log = getCalculationDetails(item, coverageDays);
                                                        gScaledMin = Math.ceil(gMin * log.scaleFactor);
                                                        gScaledMax = Math.ceil(gMax * log.scaleFactor);

                                                        // Group Suggestion Simulation
                                                        const simMin = Math.max(0, gScaledMin - gStock);
                                                        gSimSuggestion = Math.max(0, gScaledMax - gStock);
                                                        gSimMin = simMin;
                                                    }

                                                    // Status
                                                    const isGCritical = gStock < gScaledMin;
                                                    const isGExcess = gStock > gScaledMax;

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            className={`${isExpanded ? "bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/40" : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50"} transition-colors cursor-pointer border-b border-purple-100 dark:border-purple-800/30`}
                                                            onClick={() => item.group_id && toggleGroupExpand(item.group_id)}
                                                        >
                                                            <td className="px-3 py-3 pl-6 align-top">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold min-w-[24px]">
                                                                        {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                                                        <FaLayerGroup />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                            {item.pro_descricao}
                                                                        </span>
                                                                        <span className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1">
                                                                            Grupo Unificado ({item.children?.length} itens)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 2. ABC (Empty) */}
                                                            <td className="px-1 py-3 text-center align-top pt-4">
                                                                <span className="text-gray-400 text-xs">-</span>
                                                            </td>

                                                            {/* 3. STOCK / AVG (Group Aggregates) */}
                                                            <td className="px-3 py-3 text-right align-top">
                                                                <div className="flex flex-col items-end gap-0.5">
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                                            {Number(item.grp_estoque_disponivel).toLocaleString('pt-BR')}
                                                                        </span>
                                                                        <span className="text-xs text-purple-400 font-normal">un</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                        <span className="font-medium">{(item.grp_demanda_media_dia || 0).toFixed(2)}</span>
                                                                        <span className="text-[10px] text-gray-400">/dia</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 4. TREND (Weighted) */}
                                                            <td className="px-3 py-3 text-center align-top pt-4">
                                                                <div className="flex flex-col items-center justify-center gap-1" title={`Fator Ponderado: ${(item.grp_tendencia_ponderada || 0).toFixed(2)}`}>
                                                                    <div className="p-1.5 rounded-full bg-white dark:bg-black/20">
                                                                        {getTrendIcon(item.tendencia_label)}
                                                                    </div>
                                                                    {item.tendencia_label !== 'Estável' && (
                                                                        <span className="text-[10px] font-medium text-gray-500">{item.tendencia_label}</span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* 5. SUGGESTION (Group) */}
                                                            <td className="px-3 py-3 text-center align-top">
                                                                <div className="flex flex-col items-center justify-center h-full pt-1">
                                                                    <div className="bg-white dark:bg-black/20 rounded-lg px-3 py-2 border border-purple-100 dark:border-purple-800/30 w-full max-w-[140px]">
                                                                        <div className="flex justify-center items-baseline gap-2 text-sm font-bold text-purple-900 dark:text-purple-100">
                                                                            <span>{item.grp_estoque_min_sugerido}</span>
                                                                            <span className="text-purple-300 font-light mx-[-2px]">-</span>
                                                                            <span>{item.grp_estoque_max_sugerido}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-purple-400 uppercase tracking-wider font-medium mt-0.5">Min - Max (Grp)</div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* 6. SIMULATION (Group) */}
                                                            {typeof coverageDays === "number" && coverageDays > 0 && (
                                                                <td className="px-3 py-3 text-center bg-purple-100/30 dark:bg-purple-900/10 align-top relative group/sim">
                                                                    <div className="flex flex-col items-center justify-center pt-1">
                                                                        <div className={`
                                                                            px-3 py-2 rounded-lg w-full max-w-[140px] border 
                                                                            ${gSimSuggestion > 0
                                                                                ? "bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-900/40 dark:border-purple-800 dark:text-purple-200"
                                                                                : "bg-white border-purple-100 text-gray-400 dark:bg-black/20 dark:border-purple-900/30"
                                                                            }
                                                                        `}>
                                                                            <div className="flex justify-center items-baseline gap-2 text-sm font-bold">
                                                                                <span>{gSimMin.toLocaleString('pt-BR')}</span>
                                                                                <span className="opacity-50 font-light mx-[-2px]">-</span>
                                                                                <span>{gSimSuggestion.toLocaleString('pt-BR')}</span>
                                                                            </div>
                                                                            {gSimSuggestion > 0 && (
                                                                                <div className="text-[10px] opacity-70 uppercase tracking-wider font-medium mt-0.5">Sug. Grp</div>
                                                                            )}
                                                                        </div>

                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedCalculationItem({
                                                                                    item,
                                                                                    log: getCalculationDetails(item, coverageDays as number),
                                                                                    isGroupOnly: true
                                                                                });
                                                                            }}
                                                                            className="absolute top-2 right-2 text-purple-400 hover:text-purple-600 transition-colors p-1 opacity-0 group-hover/sim:opacity-100"
                                                                            title="Ver memória de cálculo do grupo"
                                                                        >
                                                                            <FaInfoCircle size={12} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}

                                                            {/* 7. STATUS (Group) */}
                                                            <td className="px-3 py-3 text-center align-top pt-3">
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    {isGCritical ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/50">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                                            Crítico
                                                                        </span>
                                                                    ) : isGExcess ? (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800/50">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                                            Excesso
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs font-medium border border-green-100 dark:border-green-800/50">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                            Normal
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                // 2. RENDER REGULAR ITEM (OR CHILD)
                                                // Status Logic (Dynamic vs Static)
                                                let isCritical = false;
                                                let isExcess = false;
                                                let statusMin = item.estoque_min_sugerido || 0;
                                                let statusMax = item.estoque_max_sugerido || 0;

                                                if (typeof coverageDays === "number" && coverageDays > 0) {
                                                    // Dynamic Status
                                                    const log = getCalculationDetails(item, coverageDays);
                                                    statusMin = log.targetMin;
                                                    statusMax = log.targetMax;

                                                    isCritical = (item.estoque_disponivel || 0) < statusMin;
                                                    isExcess = (item.estoque_disponivel || 0) > statusMax;
                                                } else {
                                                    // Static Status (DB)
                                                    isCritical = (item.estoque_disponivel || 0) < statusMin;
                                                    isExcess = (item.estoque_disponivel || 0) > statusMax;
                                                }

                                                // Unified Analysis Logic
                                                const hasGroup = !!item.group_id && (item.group_count || 0) > 1;
                                                const isChild = hasGroup && isGroupedView; // Only treat as child if we are in grouped view (and it has a group)

                                                const groupStock = item.grp_estoque_disponivel || 0;
                                                const groupMax = item.grp_estoque_max_sugerido || 0;
                                                const groupMin = item.grp_estoque_min_sugerido || 0;
                                                const groupAvg = item.grp_demanda_media_dia || 0;

                                                let simulationSuggestion = 0;
                                                if (typeof coverageDays === "number" && coverageDays > 0) {
                                                    simulationSuggestion = calculatePurchaseSuggestion(item, coverageDays);
                                                }

                                                // Lógica de Status do Grupo
                                                let effectiveGroupMin = groupMin;
                                                let effectiveGroupMax = groupMax;

                                                if (typeof coverageDays === "number" && coverageDays > 0) {
                                                    const log = getCalculationDetails(item, coverageDays);
                                                    effectiveGroupMin = Math.ceil(groupMin * log.scaleFactor);
                                                    effectiveGroupMax = Math.ceil(groupMax * log.scaleFactor);
                                                }

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className={`
                                                        group transition-colors relative border-b border-gray-50 dark:border-strokedark
                                                        ${selectedProducts.has(item.pro_codigo)
                                                                ? "bg-blue-50/60 dark:bg-blue-900/10"
                                                                : "hover:bg-gray-50 dark:hover:bg-meta-4"
                                                            }
                                                        ${isChild ? "bg-purple-50 dark:bg-purple-900/20" : ""}
                                                    `}
                                                        onContextMenu={(e) => handleContextMenu(e, item)}
                                                    >
                                                        {/* 1. PRODUTO / MARCA */}
                                                        <td className="px-3 py-3 pl-6 align-top">
                                                            <div className={`flex items-start gap-4 ${isChild ? "pl-8 border-l-2 border-purple-200 dark:border-purple-800 ml-2" : ""}`}>
                                                                {/* Checkbox */}
                                                                {/* Checkbox - Visible only if selection is active */}
                                                                {selectedProducts.size > 0 && (
                                                                    <div
                                                                        className="mt-1 flex-shrink-0"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <label className="flex items-center cursor-pointer relative group/checkbox">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="sr-only"
                                                                                checked={selectedProducts.has(item.pro_codigo)}
                                                                                onChange={() => toggleSelection(item.pro_codigo)}
                                                                            />
                                                                            <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedProducts.has(item.pro_codigo)
                                                                                ? "bg-primary border-primary"
                                                                                : "border-gray-300 dark:border-gray-500 group-hover/checkbox:border-primary"
                                                                                }`}>
                                                                                {selectedProducts.has(item.pro_codigo) && <FaCheck size={8} className="text-white" />}
                                                                            </div>
                                                                        </label>
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                        <span className="font-bold text-black dark:text-white text-sm">
                                                                            {item.pro_codigo}
                                                                        </span>
                                                                        {hasGroup && !isGroupedView && (
                                                                            <span className="text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800" title={`Grupo: ${item.group_id} (${item.group_count} itens)`}>
                                                                                <FaLayerGroup size={8} /> Unificado
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium group-hover:whitespace-normal group-hover:break-words transition-all duration-300" title={item.pro_descricao}>
                                                                        {item.pro_descricao}
                                                                    </span>
                                                                    {item.pro_referencia && (
                                                                        <span className="text-xs text-gray-500 font-normal mt-0.5 block">
                                                                            ref: {item.pro_referencia}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide font-medium">
                                                                        {item.mar_descricao}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* 2. ABC */}
                                                        <td className="px-1 py-3 text-center align-top pt-4">
                                                            <span
                                                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-sm ${getABCColor(item.curva_abc)}`}
                                                                title={`Curva ${item.curva_abc}`}
                                                            >
                                                                {item.curva_abc}
                                                            </span>
                                                        </td>

                                                        {/* 3. ESTOQUE / MÉDIA */}
                                                        <td className="px-3 py-3 text-right align-top">
                                                            <div className="flex flex-col items-end gap-0.5">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-sm font-bold text-black dark:text-white">
                                                                        {Number(item.estoque_disponivel).toLocaleString('pt-BR')}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400 font-normal">un</span>
                                                                </div>

                                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                    <span className="font-medium">{(item.demanda_media_dia_ajustada || 0).toFixed(2)}</span>
                                                                    <span className="text-[10px] text-gray-400">/dia</span>
                                                                </div>

                                                                {/* Group Data (Unified) - Only show if NOT in grouped view (otherwise header shows it) or if user wants to see individual logic? 
                                                                    Actually the design request was to show it. But if we have header, maybe we don't need it repeated for every child.
                                                                    However, the original "Unified Visual" bug report implies the visual wasn't triggering.
                                                                    Let's hide the group aggregate chip for children if isGroupedView is ON, to avoid clutter.
                                                                */}
                                                                {hasGroup && !isGroupedView && (
                                                                    <div className="mt-1 w-full flex justify-end">
                                                                        <div className="flex gap-1 items-center text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30" title="Estoque / Média do Grupo">
                                                                            <FaLayerGroup size={8} />
                                                                            <span>{Number(groupStock).toLocaleString('pt-BR')}</span>
                                                                            <span className="text-purple-300">|</span>
                                                                            <span>{groupAvg.toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {item.dias_ruptura > 0 && (
                                                                    <div className="mt-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-100 dark:border-red-800/50 flex items-center gap-1">
                                                                        <FaExclamationTriangle size={8} />
                                                                        -{item.dias_ruptura}d
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 4. TENDÊNCIA */}
                                                        <td className="px-3 py-3 text-center align-top pt-4">
                                                            <div className="flex flex-col items-center justify-center gap-1" title={`Fator: ${(item.fator_tendencia || 0).toFixed(2)}`}>
                                                                <div className="p-1.5 rounded-full bg-gray-50 dark:bg-meta-4/50">
                                                                    {getTrendIcon(item.tendencia_label)}
                                                                </div>
                                                                {item.tendencia_label !== 'Estável' && (
                                                                    <span className="text-[10px] font-medium text-gray-500">{item.tendencia_label}</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 5. SUGESTÃO (MIN-MAX) */}
                                                        <td className="px-3 py-3 text-center align-top">
                                                            <div className="flex flex-col items-center justify-center h-full pt-1">
                                                                <div className="bg-gray-50 dark:bg-meta-4/30 rounded-lg px-3 py-2 border border-gray-100 dark:border-strokedark w-full max-w-[140px]">
                                                                    <div className="flex justify-center items-baseline gap-2 text-sm font-bold text-black dark:text-white">
                                                                        <span>{item.estoque_min_sugerido}</span>
                                                                        <span className="text-gray-300 font-light mx-[-2px]">-</span>
                                                                        <span>{item.estoque_max_sugerido}</span>
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mt-0.5">Min - Max</div>
                                                                </div>

                                                                {/* Group Suggestion - Same logic: Hide if grouped view active (header handled it) */}
                                                                {hasGroup && !isGroupedView && (
                                                                    <div className="flex flex-col items-center justify-center w-full max-w-[140px] px-1">
                                                                        <div className="flex gap-1 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800/30 w-full justify-center" title="Sugestão do Grupo (Min - Max)">
                                                                            <span>Grp: {Number(groupMin).toLocaleString('pt-BR')}</span>
                                                                            <span className="text-purple-300">|</span>
                                                                            <span>{Number(groupMax).toLocaleString('pt-BR')}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 6. SIMULAÇÃO */}
                                                        {typeof coverageDays === "number" && coverageDays > 0 && (
                                                            <td className="px-3 py-3 text-center bg-blue-50/30 dark:bg-blue-900/5 align-top relative group/sim">
                                                                <div className="flex flex-col items-center justify-center pt-1">
                                                                    <div className={`
                                                                    px-3 py-2 rounded-lg w-full max-w-[140px] border 
                                                                    ${simulationSuggestion > 0
                                                                            ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                                                                            : "bg-gray-50 border-gray-100 text-gray-400 dark:bg-meta-4/30 dark:border-strokedark"
                                                                        }
                                                                `}>
                                                                        <div className="flex justify-center items-baseline gap-2 text-sm font-bold">
                                                                            <span>{getCalculationDetails(item, coverageDays).suggestionMin.toLocaleString('pt-BR')}</span>
                                                                            <span className="opacity-50 font-light mx-[-2px]">-</span>
                                                                            <span>{simulationSuggestion.toLocaleString('pt-BR')}</span>
                                                                        </div>
                                                                        {simulationSuggestion > 0 && (
                                                                            <div className="text-[10px] opacity-70 uppercase tracking-wider font-medium mt-0.5">Sugerido</div>
                                                                        )}
                                                                    </div>

                                                                    {/* Scaled Group Suggestion */}
                                                                    {hasGroup && !isGroupedView && (
                                                                        (() => {
                                                                            const log = getCalculationDetails(item, coverageDays);
                                                                            if (log.group) {
                                                                                // Use same logic as CalculationModal: scale base min/max by scaleFactor
                                                                                const simGroupMin = Math.ceil(log.group.groupMin * log.scaleFactor);
                                                                                const simGroupMax = Math.ceil(log.group.groupMax * log.scaleFactor);

                                                                                const sgSugMin = Math.max(0, simGroupMin - log.group.groupStock);
                                                                                const sgSugMax = Math.max(0, simGroupMax - log.group.groupStock);

                                                                                return (
                                                                                    <div className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center w-full max-w-[140px] border border-purple-200 dark:border-purple-800/30">
                                                                                        <span className="font-bold">Grp: {sgSugMin.toLocaleString('pt-BR')} - {sgSugMax.toLocaleString('pt-BR')}</span>
                                                                                    </div>
                                                                                )
                                                                            }
                                                                            return null;
                                                                        })()
                                                                    )}

                                                                    <button
                                                                        onClick={() => setSelectedCalculationItem({ item, log: getCalculationDetails(item, coverageDays as number) })}
                                                                        className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 transition-colors p-1 opacity-0 group-hover/sim:opacity-100"
                                                                        title="Ver memória de cálculo"
                                                                    >
                                                                        <FaInfoCircle size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}

                                                        {/* 7. STATUS */}
                                                        <td className="px-3 py-3 text-center align-top pt-3">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                {isCritical ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/50">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                                        Crítico
                                                                    </span>
                                                                ) : isExcess ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800/50">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                                        Excesso
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-xs font-medium border border-green-100 dark:border-green-800/50">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                        Normal
                                                                    </span>
                                                                )}

                                                                {hasGroup && !isGroupedView && (
                                                                    <div className="mt-1 flex justify-center w-full">
                                                                        {groupStock < effectiveGroupMin ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-bold border border-red-200 dark:border-red-800/50">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                                                                                Grp Crítico
                                                                            </span>
                                                                        ) : groupStock > effectiveGroupMax ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[9px] font-bold border border-orange-200 dark:border-orange-800/50">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                                                Grp Excesso
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-[9px] font-medium border border-green-100 dark:border-green-800/50">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                                Grp Normal
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {item.teve_alteracao_analise && (
                                                                    <button
                                                                        onClick={() => setSelectedChangeItem(item)}
                                                                        className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide hover:text-blue-700 hover:underline flex items-center gap-1"
                                                                    >
                                                                        <FaExchangeAlt size={8} /> Alteração
                                                                    </button>
                                                                )}
                                                            </div>
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
                )
            }

            {
                selectedChangeItem && (
                    <HistoryModal
                        item={selectedChangeItem}
                        onClose={() => setSelectedChangeItem(null)}
                    />
                )
            }

            {
                selectedCalculationItem && (
                    <CalculationModal
                        log={selectedCalculationItem.log}
                        item={selectedCalculationItem.item}
                        isGroupOnly={selectedCalculationItem.isGroupOnly}
                        onClose={() => setSelectedCalculationItem(null)}
                    />
                )
            }

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />

            <PromotionModal
                isOpen={promotionModalOpen}
                onClose={() => setPromotionModalOpen(false)}
                subgroups={subgroupOptions.map(o => o.value)}
                brands={brandOptions.map(o => o.value)}
                categories={categoryOptions.map(o => o.value)}
            />
        {/* Modal de Cotação */}
        {/* Lista de itens para o modal de cotação */}
        {(() => {
            const cotacaoItems = Array.from(selectedProducts)
                .map(code => {
                    const i = items.find(x => x.pro_codigo === code);
                    if (!i) return null;
                    let simulacao = null;
                    if (typeof coverageDays === "number" && coverageDays > 0) {
                        if (i.group_id && i.group_count && i.group_count > 1) {
                            // Sempre buscar o header do grupo para simulação
                            const groupHeader = items.find(g => g.group_id === i.group_id && typeof g.id === "number" && g.id < 0);
                            if (groupHeader) {
                                const min = calculatePurchaseSuggestionMinGroup(groupHeader, coverageDays);
                                let max = calculatePurchaseSuggestionGroup(groupHeader, coverageDays);
                                if (typeof max === "number") {
                                    max = max -1
                                }
                                simulacao = `${min !== undefined ? min.toLocaleString("pt-BR") : "-"} - ${max !== undefined ? max.toLocaleString("pt-BR") : "-"}`;
                            } else {
                                // fallback: calcula pelo próprio item, mas usando função de grupo
                                const min = calculatePurchaseSuggestionMinGroup(i, coverageDays);
                                let max = calculatePurchaseSuggestionGroup(i, coverageDays);
                                if (typeof max === "number") {
                                    max = max -1
                                }
                                simulacao = `${min !== undefined ? min.toLocaleString("pt-BR") : "-"} - ${max !== undefined ? max.toLocaleString("pt-BR") : "-"}`;
                            }
                        } else {
                            // Item individual
                            const min = calculatePurchaseSuggestionMin(i, coverageDays);
                            const max = calculatePurchaseSuggestion(i, coverageDays);
                            simulacao = `${min !== undefined ? min.toLocaleString("pt-BR") : "-"} - ${max !== undefined ? max.toLocaleString("pt-BR") : "-"}`;
                        }
                    }
                    return {
                        pro_codigo: i.pro_codigo,
                        pro_descricao: i.pro_descricao,
                        simulacao
                    };
                })
                .filter(Boolean) as { pro_codigo: string; pro_descricao: string; simulacao?: string | null }[];
            return (
                <CotacaoModal
                    open={showCotacaoModal}
                    onClose={() => setShowCotacaoModal(false)}
                    items={cotacaoItems}
                    coverageDays={coverageDays}
                />
            );
        })()}
    </div>
    );
}

