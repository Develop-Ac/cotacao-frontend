import { FaChevronDown, FaChevronRight, FaExclamationTriangle, FaInfoCircle, FaLayerGroup } from "react-icons/fa";
import Loading from "@/components/Loading";
import { AnaliseItem, GroupedItem, CalculationDetails } from "@/app/(private)/compras/produtos/PromotionTypes";

interface PromotionTableProps {
    loading: boolean;
    hasRun: boolean;
    data: AnaliseItem[];
    displayItems: GroupedItem[];
    days: number;
    expandedGroups: Set<string>;
    toggleGroupExpand: (groupId: string) => void;
    setSelectedCalculationItem: (item: { item: AnaliseItem; log: CalculationDetails }) => void;
    setSelectedStockDetails: (item: AnaliseItem) => void;
    getCalculationDetails: (item: AnaliseItem, days: number) => CalculationDetails;
}

export default function PromotionTable({
    loading,
    hasRun,
    data,
    displayItems,
    days,
    expandedGroups,
    toggleGroupExpand,
    setSelectedCalculationItem,
    setSelectedStockDetails,
    getCalculationDetails
}: PromotionTableProps) {
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loading />
            </div>
        );
    }

    if (!hasRun) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-gray-400 opacity-60">
                <div className="mb-4 text-5xl">🔍</div>
                <p>Configure os filtros acima e clique em Gerar Plano</p>
            </div>
        );
    }

    if (displayItems.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-gray-500">
                Nenhum produto com excesso encontrado para esses critérios.
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-boxdark rounded-lg border border-gray-200 dark:border-strokedark shadow overflow-auto flex-1 relative h-full">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 w-[40%] min-w-[300px]">Produto</th>
                        <th className="px-4 py-3 text-center">Cat. Estocagem</th>
                        <th className="px-4 py-3 text-center">ABC</th>
                        <th className="px-4 py-3 text-right">Estoque</th>
                        <th className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">Obsoleto</th>
                        <th className="px-4 py-3 text-right text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10">Excesso</th>
                        <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-strokedark text-sm">
                    {displayItems.map((item) => {
                        // RENDER GROUP HEADER
                        if (item.isGroupHeader) {
                            const isExpanded = expandedGroups.has(item.group_id || "");
                            const excessQty = (item as any).calculated_group_excess || 0;
                            const gStock = item.grp_estoque_disponivel || 0;

                            return (
                                <tr
                                    key={item.id}
                                    className={`${isExpanded ? "bg-purple-100 dark:bg-purple-900/40 border-l-purple-600 dark:border-l-purple-400" : "bg-white dark:bg-boxdark hover:bg-gray-50 dark:hover:bg-meta-4 border-l-transparent"} cursor-pointer transition-all border-l-4 group`}
                                    onClick={() => item.group_id && toggleGroupExpand(item.group_id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            item.group_id && toggleGroupExpand(item.group_id);
                                        }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={isExpanded}
                                >
                                    <td className="px-3 py-3 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-purple-500 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                                {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                                    <FaLayerGroup className="text-purple-500" size={12} />
                                                    {item.pro_descricao}
                                                </div>
                                                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                                    Grupo Unificado ({item.children?.length} itens)
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center"></td>
                                    <td className="px-3 py-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.curva_abc === 'A' ? 'bg-green-100 text-green-700' :
                                            item.curva_abc === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {item.curva_abc}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono">
                                        {gStock.toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-orange-600 font-bold">
                                        -
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono text-red-600 font-bold bg-red-50 dark:bg-red-900/10 rounded">
                                        {excessQty.toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                            Grupo
                                        </span>
                                    </td>
                                </tr>
                            );
                        }

                        // REGULAR ITEM (or Child)
                        const details = getCalculationDetails(item, days);
                        const finalMax = details.targetMax;
                        const excessQty = Math.max(0, (item.estoque_disponivel || 0) - finalMax);

                        const isChild = (item as any)._isChild;
                        const isObsolete = (item.categoria_saldo_atual || "").toUpperCase() === 'OBSOLETO';

                        return (
                            <tr key={item.id} className={`
                                ${isChild ? "bg-purple-50/50 dark:bg-purple-900/10 border-l-4 border-l-purple-200 dark:border-l-purple-800" : "bg-white dark:bg-boxdark border-b border-gray-100 dark:border-strokedark"} 
                                hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors
                            `}>
                                <td className={`px-3 py-3 ${isChild ? "pl-12" : "pl-4"}`}>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">
                                            {item.pro_codigo}
                                        </span>
                                        <span className="text-xs text-gray-500 truncate max-w-[450px]" title={item.pro_descricao}>
                                            {item.pro_descricao}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    {isObsolete ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold border border-red-200">
                                            <FaExclamationTriangle size={10} /> OBSOLETO
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-gray-500 font-medium px-2 py-1 rounded bg-gray-100 dark:bg-white/5 inline-block border border-gray-200 dark:border-gray-700">
                                            {item.categoria_saldo_atual || "NORMAL"}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.curva_abc === 'A' ? 'bg-green-100 text-green-700' :
                                        item.curva_abc === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {item.curva_abc}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-sm text-gray-700 dark:text-gray-300">
                                    {Number(item.estoque_disponivel).toLocaleString('pt-BR')}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-sm">
                                    {(item.estoque_obsoleto || 0) > 0 ? (
                                        <button
                                            onClick={() => setSelectedStockDetails(item)}
                                            className="text-orange-600 font-bold hover:underline"
                                        >
                                            {Number(item.estoque_obsoleto).toLocaleString('pt-BR')}
                                        </button>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-sm text-red-600 font-bold">
                                    {excessQty > 0 ? excessQty.toLocaleString('pt-BR') : '-'}
                                </td>
                                <td className="px-3 py-3 text-center">
                                    {excessQty > 0 ? (
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => setSelectedCalculationItem({ item, log: details })}
                                                className="text-blue-500 hover:text-blue-700"
                                                title="Ver Detalhes"
                                            >
                                                <FaInfoCircle />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">Normal</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
