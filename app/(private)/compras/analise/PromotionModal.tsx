"use client";   

import { useState } from "react";
import {
    FaFileExcel,
    FaLayerGroup,
    FaChevronUp,
    FaChevronDown,
    FaTimes
} from "react-icons/fa";

import { usePromotionLogic } from "@/hooks/usePromotionLogic";
import PromotionFilters from "@/components/Promotion/PromotionFilters";
import PromotionTable from "@/components/Promotion/PromotionTable";
import CalculationDetailModal from "@/components/Promotion/CalculationDetailModal";
import StockDetailModal from "@/components/Promotion/StockDetailModal";
import { AnaliseItem, CalculationDetails } from "./PromotionTypes";

interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    subgroups: string[];
    brands: string[];
    categories: string[];
}

export default function PromotionModal({ isOpen, onClose, subgroups, brands, categories }: PromotionModalProps) {
    // Logic Hook
    const {
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
        error, setError,
        handleRun,
        handleExport,
        getCalculationDetails
    } = usePromotionLogic({ subgroups, brands, categories });

    // UI Local State
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [selectedCalculationItem, setSelectedCalculationItem] = useState<{ item: AnaliseItem; log: CalculationDetails } | null>(null);
    const [selectedStockDetails, setSelectedStockDetails] = useState<AnaliseItem | null>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-strokedark">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                                🛒 Planejamento de Promoção
                            </h3>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4 border-l pl-4 border-gray-300 dark:border-gray-600">
                            <button
                                onClick={() => setIsGroupedView(!isGroupedView)}
                                className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors flex items-center gap-2 ${isGroupedView
                                    ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                                    : "bg-white text-gray-600 border-gray-200 dark:bg-meta-4 dark:text-gray-300 dark:border-strokedark"
                                    } `}
                            >
                                <FaLayerGroup />
                                {isGroupedView ? "Agrupado" : "Individual"}
                            </button>

                            {data.length > 0 && (
                                <button
                                    onClick={handleExport}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition flex items-center gap-2"
                                    title="Exportar resultado para Excel"
                                >
                                    <FaFileExcel /> Excel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                            {filtersExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
                            {filtersExpanded ? "Ocultar Filtros" : "Mostrar Filtros"}
                        </button>
                        <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 transition-colors">&times;</button>
                    </div>
                </div>

                {/* Inline Error Banner */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm border-b border-red-100 dark:border-red-900/30 flex justify-between items-center animate-in slide-in-from-top-2">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                            <FaTimes />
                        </button>
                    </div>
                )}

                {/* Filters */}
                <PromotionFilters
                    days={days}
                    setDays={setDays}
                    categories={categories}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    subgroups={subgroups}
                    selectedSubgroups={selectedSubgroups}
                    setSelectedSubgroups={setSelectedSubgroups}
                    brandSearch={brandSearch}
                    setBrandSearch={setBrandSearch}
                    handleRun={handleRun}
                    loading={loading}
                    expanded={filtersExpanded}
                />

                {/* Results Table */}
                <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-meta-4/10 p-2 flex flex-col">
                    <PromotionTable
                        loading={loading}
                        hasRun={hasRun}
                        data={data}
                        displayItems={processedItems}
                        days={days}
                        expandedGroups={expandedGroups}
                        toggleGroupExpand={toggleGroupExpand}
                        setSelectedCalculationItem={setSelectedCalculationItem}
                        setSelectedStockDetails={setSelectedStockDetails}
                        getCalculationDetails={getCalculationDetails}
                    />

                    {data.length > 0 && (
                        <div className="p-4 bg-gray-50 dark:bg-meta-4/50 border-t border-gray-100 dark:border-strokedark text-right text-xs text-gray-500">
                            Mostrando {data.length} itens com potencial de promoção.
                        </div>
                    )}
                </div>

            </div>

            {/* Modals */}
            <CalculationDetailModal
                data={selectedCalculationItem}
                onClose={() => setSelectedCalculationItem(null)}
                days={days}
            />

            <StockDetailModal
                data={selectedStockDetails}
                onClose={() => setSelectedStockDetails(null)}
            />

        </div >
    );
}
