import { FaLayerGroup, FaTimes } from "react-icons/fa";
import { AnaliseItem } from "@/app/(private)/compras/produtos/PromotionTypes";

interface StockDetailModalProps {
    data: AnaliseItem | null;
    onClose: () => void;
}

export default function StockDetailModal({ data, onClose }: StockDetailModalProps) {
    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-boxdark rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-strokedark">
                <div className="p-4 border-b border-gray-100 dark:border-strokedark flex items-center justify-between bg-gray-50 dark:bg-meta-4">
                    <h3 className="font-bold text-lg text-black dark:text-white flex items-center gap-2">
                        <FaLayerGroup className="text-orange-500" />
                        Detalhamento de Lotes
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full p-1"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <h4 className="font-bold text-gray-800 dark:text-white">
                            {data.pro_descricao}
                        </h4>
                        <div className="text-xs text-gray-500">{data.pro_codigo}</div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded mb-4 flex justify-between items-center border border-orange-100 dark:border-orange-800">
                        <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">Total Obsoleto ({'>'}240 dias)</span>
                        <span className="font-mono font-bold text-lg text-orange-700 dark:text-orange-300">
                            {Number(data.estoque_obsoleto).toLocaleString('pt-BR')}
                        </span>
                    </div>

                    <div className="max-h-[300px] overflow-auto border rounded border-gray-100 dark:border-strokedark">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-meta-4 text-xs font-bold text-gray-500 uppercase sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">Data Compra</th>
                                    <th className="px-3 py-2 text-center">Dias Estoque</th>
                                    <th className="px-3 py-2 text-right">Qtd</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                                {(data.lotes_estoque || []).map((lote, idx) => {
                                    const isObsolete = lote.dias_em_estoque > 240;
                                    return (
                                        <tr key={idx} className={isObsolete ? "bg-orange-50/50 dark:bg-orange-900/5" : ""}>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                {new Date(lote.data_compra).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className={`px-3 py-2 text-center font-medium ${isObsolete ? "text-red-500" : "text-gray-500"}`}>
                                                {lote.dias_em_estoque}d
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                {Number(lote.qtd).toLocaleString('pt-BR')}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {(!data.lotes_estoque || data.lotes_estoque.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">
                                            Nenhum lote registrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
