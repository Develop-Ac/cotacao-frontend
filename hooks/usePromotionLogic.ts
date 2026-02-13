"use client";

import { useState, useMemo } from "react";
import { serviceUrl } from "@/lib/services";
import { AnaliseItem, GroupedItem, CalculationDetails } from "@/app/(private)/compras/analise/PromotionTypes";

interface UsePromotionLogicProps {
    subgroups: string[];
    brands: string[];
    categories: string[];
}

export function usePromotionLogic({ subgroups, brands, categories }: UsePromotionLogicProps) {
    // Filters
    const [days, setDays] = useState<number>(60);
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [brandSearch, setBrandSearch] = useState("");
    const [isGroupedView, setIsGroupedView] = useState(false);

    // Data State
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<AnaliseItem[]>([]);
    const [hasRun, setHasRun] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI Logic State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Helper Calculation Logic
    const getCalculationDetails = (item: AnaliseItem, coverageDays: number): CalculationDetails => {
        let refDias = 120; // Default reference days
        let estoqueMaxSugerido = item.estoque_max_sugerido || 0;
        let estoqueDisponivel = item.estoque_disponivel || 0;
        let demandaMediaDia = item.demanda_media_dia_ajustada || 0;

        // If it's a group header, use group-specific values
        if (item.isGroupHeader && item.group_id) {
            estoqueMaxSugerido = item.grp_estoque_max_sugerido || 0;
            estoqueDisponivel = item.grp_estoque_disponivel || 0;
            demandaMediaDia = item.grp_demanda_media_dia || 0;
        }

        // Determine refDias based on sgr_codigo and curva_abc
        if (item.sgr_codigo === 154) { // Specific subgroup logic
            if (item.curva_abc === "A") refDias = 120;
            else if (item.curva_abc === "B") refDias = 180;
            else refDias = 240;
        } else { // General logic
            if (item.curva_abc === "A") refDias = 60;
            else if (item.curva_abc === "B") refDias = 90;
            else refDias = 120;
        }

        let scaleFactor = coverageDays / refDias;
        if (!isFinite(scaleFactor) || scaleFactor < 0) scaleFactor = 0;

        const estoqueMaxSugeridoSanitized = isFinite(estoqueMaxSugerido) ? estoqueMaxSugerido : 0;
        const estoqueDisponivelSanitized = isFinite(estoqueDisponivel) ? estoqueDisponivel : 0;

        const targetMax = Math.ceil(estoqueMaxSugeridoSanitized * scaleFactor);
        const excess = Math.max(0, estoqueDisponivelSanitized - targetMax);

        return {
            refDias,
            scaleFactor,
            originalMax: estoqueMaxSugerido,
            targetMax,
            estoqueDisponivel,
            excess,
            demandaMediaDia,
            isGroup: item.isGroupHeader && !!item.group_id,
            group: (item.isGroupHeader && item.group_id) ? {
                groupStock: item.grp_estoque_disponivel || 0,
                groupSuggestionMax: item.grp_estoque_max_sugerido || 0,
                groupDemand: item.grp_demanda_media_dia || 0,
            } : undefined
        };
    };

    // Processed Items (Memoized)
    const processedItems = useMemo((): GroupedItem[] => {
        if (!isGroupedView) return data;

        const processed: GroupedItem[] = [];
        const seenGroups = new Set<string>();
        const groupMap = new Map<string, AnaliseItem[]>();

        // 1. Map groups
        data.forEach(item => {
            if (item.group_id) {
                if (!groupMap.has(item.group_id)) {
                    groupMap.set(item.group_id, []);
                }
                groupMap.get(item.group_id)?.push(item);
            }
        });

        // 2. Build List
        data.forEach(item => {
            if (!item.group_id) {
                processed.push(item);
            } else {
                if (!seenGroups.has(item.group_id)) {
                    seenGroups.add(item.group_id);
                    const members = groupMap.get(item.group_id) || [];

                    if (members.length === 1) {
                        processed.push(members[0]);
                        return;
                    }

                    // Create Header
                    const groupCurves = members.map(m => m.curva_abc || "C");
                    let bestCurve = "C";
                    if (groupCurves.includes("A")) bestCurve = "A";
                    else if (groupCurves.includes("B")) bestCurve = "B";
                    else if (groupCurves.includes("C")) bestCurve = "C";
                    else if (groupCurves.includes("D")) bestCurve = "D";

                    const header: GroupedItem = {
                        ...item, // Base props
                        id: -1 * item.id,
                        pro_descricao: item.pro_descricao,
                        children: members,
                        isGroupHeader: true,
                        curva_abc: bestCurve,
                        estoque_disponivel: item.grp_estoque_disponivel || 0,
                        demanda_media_dia_ajustada: item.grp_demanda_media_dia || 0,
                        estoque_min_sugerido: item.grp_estoque_min_sugerido || 0,
                        estoque_max_sugerido: item.grp_estoque_max_sugerido || 0,
                        expanded: expandedGroups.has(item.group_id)
                    };

                    // Calculate Group Excess as SUM of Children Excess
                    let totalExcess = 0;
                    members.forEach(m => {
                        const d = getCalculationDetails(m, days);
                        totalExcess += d.excess;
                    });
                    (header as any).calculated_group_excess = totalExcess;

                    processed.push(header);

                    if (expandedGroups.has(item.group_id)) {
                        members.forEach(m => processed.push({ ...m, isGroupHeader: false, _isChild: true }));
                    }
                }
            }
        });

        return processed;
    }, [data, isGroupedView, expandedGroups, days]); // Added days as dependency since calculated_group_excess depends on it

    const toggleGroupExpand = (groupId: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(groupId)) {
            newSet.delete(groupId);
        } else {
            newSet.add(groupId);
        }
        setExpandedGroups(newSet);
    };

    const handleRun = async () => {
        setError(null);
        let finalBrands: string[] = [];
        if (brandSearch.trim()) {
            finalBrands = brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
            if (finalBrands.length === 0) {
                setError("Nenhuma marca encontrada com o termo pesquisado.");
                return;
            }
        } else {
            finalBrands = [];
        }

        setLoading(true);
        try {
            const url = `${serviceUrl("analiseEstoque")}/promo/plan`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    days: days,
                    subgroups: selectedSubgroups,
                    brands: finalBrands,
                    categories: selectedCategories,
                    grouped_view: isGroupedView
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
                throw new Error(errorData.detail || "Erro ao buscar dados");
            }

            const json = await res.json();
            setData(json);
            setHasRun(true);
        } catch (error: any) {
            console.error(error);
            setError(`Erro ao gerar plano de promoção: ${error.message || error} `);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setError(null);
        let finalBrands: string[] = [];
        if (brandSearch.trim()) {
            finalBrands = brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
            if (finalBrands.length === 0) {
                setError("Nenhuma marca encontrada com o termo pesquisado.");
                return;
            }
        } else {
            finalBrands = [];
        }

        try {
            const url = `${serviceUrl("analiseEstoque")}/promo/export`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    days: days,
                    subgroups: selectedSubgroups,
                    brands: finalBrands,
                    categories: selectedCategories,
                    grouped_view: isGroupedView
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
                throw new Error(errorData.detail || "Erro ao exportar dados");
            }

            const blob = await res.blob();
            const urlBlob = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `plano_promocao_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(urlBlob);
            document.body.removeChild(a);

        } catch (error: any) {
            console.error(error);
            setError(`Erro ao exportar: ${error.message || error} `);
        }
    };

    return {
        // State
        days, setDays,
        selectedSubgroups, setSelectedSubgroups,
        selectedCategories, setSelectedCategories,
        brandSearch, setBrandSearch,
        isGroupedView, setIsGroupedView,
        expandedGroups, toggleGroupExpand,
        loading,
        data,
        processedItems,
        hasRun,
        error, setError, // Exposed setError for dismiss action

        // Actions
        handleRun,
        handleExport,
        getCalculationDetails
    };
}
