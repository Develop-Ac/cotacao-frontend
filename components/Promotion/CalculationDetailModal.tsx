import { FaBox, FaInfoCircle, FaLayerGroup, FaTimes } from "react-icons/fa";
import { AnaliseItem, CalculationDetails } from "@/app/(private)/compras/analise/PromotionTypes";

interface CalculationDetailModalProps {
    data: { item: AnaliseItem; log: CalculationDetails } | null;
    onClose: () => void;
    days: number;
}

export default function CalculationDetailModal({ data, onClose, days }: CalculationDetailModalProps) {
    if (!data) return null;

    const { item, log } = data;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-strokedark">
                <div className="p-4 border-b border-gray-100 dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-meta-4">
                    <h3 className="font-bold text-lg text-black dark:text-white flex items-center gap-2">
                        <FaInfoCircle className="text-blue-500" />
                        Detalhes do Cálculo
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full p-1"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                            {log.isGroup ? <FaLayerGroup className="text-purple-500" /> : <FaBox className="text-gray-500" />}
                            {item.pro_descricao}
                        </h4>
                        <div className="text-xs text-gray-500">
                            {item.pro_codigo}
                            {log.isGroup && " (Grupo Unificado)"}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-meta-4/20 p-4 rounded-lg border border-gray-100 dark:border-strokedark">
                        <div>
                            <span className="block text-xs text-gray-500 mb-1">Dias de Cobertura (Input)</span>
                            <span className="font-mono font-bold text-lg text-black dark:text-white">{days} dias</span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500 mb-1">Dias de Referência (Config)</span>
                            <span className="font-mono font-bold text-lg text-black dark:text-white">{log.refDias} dias</span>
                        </div>
                        <div className="col-span-2 text-xs text-gray-500 italic border-l-2 border-primary pl-2">
                            Fator Multiplicador: <strong>{log.scaleFactor.toFixed(4)}x</strong> (Cobertura / Referência)
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-strokedark">
                            <span className="text-sm font-medium">Estoque Máximo (Base)</span>
                            <span className="font-mono text-gray-600 dark:text-gray-300">
                                {log.originalMax.toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-strokedark bg-blue-50 dark:bg-blue-900/10 px-2 rounded">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Estoque Máximo Simulado ({days}d)</span>
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                {log.targetMax.toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-strokedark">
                            <span className="text-sm font-medium">Estoque Disponível</span>
                            <span className="font-mono text-gray-600 dark:text-gray-300">
                                {log.estoqueDisponivel.toLocaleString('pt-BR')}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-3 bg-red-50 dark:bg-red-900/10 px-3 rounded-lg border border-red-100 dark:border-red-900/20">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">Excesso Calculado</span>
                            <span className="font-mono font-bold text-red-700 dark:text-red-400 text-lg">
                                {log.excess.toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-[10px] text-gray-400 text-center">
                            Excesso = Max(0, Estoque Disponível - Máximo Simulado)
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-meta-4 border-t border-gray-100 dark:border-strokedark flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-meta-4 dark:text-white rounded hover:bg-gray-300 transition-colors font-medium text-sm"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
