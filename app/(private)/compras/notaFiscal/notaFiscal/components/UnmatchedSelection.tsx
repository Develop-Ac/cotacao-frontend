"use client";

import { StCalculationResult } from "@/types/icms";
import { useState } from "react";
import { FaCheckSquare, FaSquare, FaExclamationTriangle, FaArrowRight } from "react-icons/fa";

type Props = {
    unmatchedItems: StCalculationResult[];
    onConfirm: (selectedIndices: Set<number>) => void;
    onCancel: () => void;
};

export default function UnmatchedSelection({ unmatchedItems, onConfirm, onCancel }: Props) {
    // Default: Select NONE (User must opt-in) or Select ALL?
    // User said "selecione os que entram ou não". Usually safer to start empty or full?
    // Let's start empty to force review.
    const [selected, setSelected] = useState<Set<number>>(new Set());

    const toggle = (idx: number) => {
        const next = new Set(selected);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === unmatchedItems.length) setSelected(new Set());
        else {
            const next = new Set<number>();
            unmatchedItems.forEach((_, i) => next.add(i));
            setSelected(next);
        }
    };

    return (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark animate-fade-in-up mt-4">
            <div className="flex items-center gap-3 mb-4 text-orange-600 dark:text-orange-400">
                <FaExclamationTriangle size={24} />
                <h3 className="text-lg font-bold">Pré-Análise: Produtos sem vínculo NCM/MVA</h3>
            </div>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
                Os seguintes produtos não possuem MVA cadastrado na referência (Portaria 195).
                Selecione abaixo os que você deseja <b>incluir no relatório</b> mesmo sem cálculo de ST (aparecerão como &quot;NCM s/ Ref&quot;).
                Os não selecionados serão descartados desta análise.
            </p>

            <div className="max-w-full overflow-x-auto border border-stroke dark:border-strokedark rounded-lg mb-6">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-meta-4 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 w-[50px] text-center">
                                <button onClick={toggleAll}>
                                    {selected.size > 0 && selected.size === unmatchedItems.length ? <FaCheckSquare /> : <FaSquare />}
                                </button>
                            </th>
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3">NCM</th>
                            <th className="px-4 py-3">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                        {unmatchedItems.map((row, idx) => {
                            const isSelected = selected.has(idx);
                            return (
                                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors ${isSelected ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggle(idx)} className={isSelected ? 'text-orange-600' : 'text-gray-400'}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-black dark:text-white">{row.produto}</div>
                                        <div className="text-xs text-gray-500">{row.codProd}</div>
                                    </td>
                                    <td className="px-4 py-3">{row.ncmNota}</td>
                                    <td className="px-4 py-3 font-mono">
                                        {row.vlProduto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4 rounded-lg transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={() => onConfirm(selected)}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-md transition-all active:scale-95"
                >
                    <span>Confirmar e Calcular</span>
                    <FaArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
