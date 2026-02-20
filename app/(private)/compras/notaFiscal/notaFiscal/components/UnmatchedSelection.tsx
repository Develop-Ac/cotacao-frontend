"use client";

import { StCalculationResult } from "@/types/icms";
import { useState } from "react";
import { FaCheckSquare, FaSquare, FaExclamationTriangle, FaArrowRight } from "react-icons/fa";

type Props = {
    unmatchedItems: StCalculationResult[];
    onConfirm: (selectedIndices: Set<number>, taxTypes: Record<number, 'ST' | 'DIFAL'>) => void;
    onCancel: () => void;
};

export default function UnmatchedSelection({ unmatchedItems, onConfirm, onCancel }: Props) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [taxTypes, setTaxTypes] = useState<Record<number, 'ST' | 'DIFAL'>>({});
    const [headerTaxType, setHeaderTaxType] = useState<'ST' | 'DIFAL' | ''>('');

    const toggle = (idx: number) => {
        const next = new Set(selected);
        if (next.has(idx)) {
            next.delete(idx);
            // Optionally remove from taxTypes if unselected
            const nextTaxes = { ...taxTypes };
            delete nextTaxes[idx];
            setTaxTypes(nextTaxes);
        } else {
            next.add(idx);
            // If header has a type selected, apply it automatically when checking
            if (headerTaxType) {
                setTaxTypes(prev => ({ ...prev, [idx]: headerTaxType }));
            }
        }
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === unmatchedItems.length) {
            setSelected(new Set());
            setTaxTypes({});
        } else {
            const next = new Set<number>();
            const nextTaxes = { ...taxTypes };
            unmatchedItems.forEach((_, i) => {
                next.add(i);
                if (headerTaxType) {
                    nextTaxes[i] = headerTaxType;
                }
            });
            setSelected(next);
            setTaxTypes(nextTaxes);
        }
    };

    const handleHeaderTaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'ST' | 'DIFAL' | '';
        setHeaderTaxType(val);

        if (val) {
            // Apply to all currently selected
            const nextTaxes = { ...taxTypes };
            selected.forEach(idx => {
                nextTaxes[idx] = val;
            });
            setTaxTypes(nextTaxes);
        }
    };

    const handleRowTaxChange = (idx: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'ST' | 'DIFAL' | '';
        if (val) {
            setTaxTypes(prev => ({ ...prev, [idx]: val }));
            // Select the row automatically if tax type is chosen
            if (!selected.has(idx)) {
                setSelected(prev => new Set(prev).add(idx));
            }
        } else {
            const nextTaxes = { ...taxTypes };
            delete nextTaxes[idx];
            setTaxTypes(nextTaxes);
        }
    };

    const handleConfirm = () => {
        // Validation: Every selected item must have a tax type
        const missing = Array.from(selected).filter(idx => !taxTypes[idx]);
        if (missing.length > 0) {
            alert("Você precisa selecionar o Tipo de Imposto (ICMS ST ou DIFAL) para todos os produtos marcados na lista.");
            return;
        }
        onConfirm(selected, taxTypes);
    };

    return (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark animate-fade-in-up mt-4">
            <div className="flex items-center gap-3 mb-4 text-orange-600 dark:text-orange-400">
                <FaExclamationTriangle size={24} />
                <h3 className="text-lg font-bold">Pré-Análise: Seleção de Imposto</h3>
            </div>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
                Os produtos abaixo não possuem vínculo MVA automático ou podem ser cabíveis de DIFAL.
                Selecione os que deseja <b>incluir no relatório</b> e especifique obrigatoriamente
                se o imposto a ser recolhido é <b>ICMS ST</b> ou <b>DIFAL</b>.
            </p>

            <div className="max-w-full overflow-x-auto border border-stroke dark:border-strokedark rounded-lg mb-6 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-meta-4 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 w-[50px] text-center">
                                <button onClick={toggleAll} className="hover:text-blue-600 transition-colors">
                                    {selected.size > 0 && selected.size === unmatchedItems.length ? <FaCheckSquare size={16} /> : <FaSquare size={16} />}
                                </button>
                            </th>
                            <th className="px-4 py-3 min-w-[300px]">Produto / NCM</th>
                            <th className="px-4 py-3 text-right">Valor Prod.</th>
                            <th className="px-4 py-3 w-[200px]">
                                <div className="flex flex-col gap-1">
                                    <span>Imposto a Recolher</span>
                                    <select
                                        value={headerTaxType}
                                        onChange={handleHeaderTaxChange}
                                        className="w-full border p-1 rounded font-normal text-xs bg-white text-black dark:bg-form-input dark:text-white dark:border-form-strokedark focus:ring focus:ring-blue-500/50"
                                    >
                                        <option value="">-- Aplicar a todos --</option>
                                        <option value="ST">ICMS ST</option>
                                        <option value="DIFAL">DIFAL</option>
                                    </select>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                        {unmatchedItems.map((row, idx) => {
                            const isSelected = selected.has(idx);
                            const rowTax = taxTypes[idx] || '';
                            const hasError = isSelected && !rowTax;

                            return (
                                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors ${isSelected ? (hasError ? 'bg-red-50 dark:bg-red-900/10' : 'bg-blue-50 dark:bg-blue-900/10') : ''}`}>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <button onClick={() => toggle(idx)} className={isSelected ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}>
                                            {isSelected ? <FaCheckSquare size={16} /> : <FaSquare size={16} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <div className="font-medium text-black dark:text-white line-clamp-2" title={row.produto}>{row.produto}</div>
                                        <div className="text-xs text-gray-500 mt-1">Cód: {row.codProd} | NCM: {row.ncmNota}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono align-middle font-medium">
                                        {row.vlProduto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <select
                                            value={rowTax}
                                            onChange={(e) => handleRowTaxChange(idx, e)}
                                            className={`w-full border p-1.5 rounded text-sm bg-white dark:bg-form-input focus:ring focus:ring-blue-500/50 transition-colors ${hasError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-form-strokedark'}`}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="ST">ICMS ST</option>
                                            <option value="DIFAL">DIFAL</option>
                                        </select>
                                        {hasError && (
                                            <span className="text-[10px] text-red-500 font-medium block mt-1">
                                                Obrigatório
                                            </span>
                                        )}
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
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4 rounded-lg transition-colors font-medium border border-transparent"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={selected.size === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    <span>Confirmar e Calcular</span>
                    <FaArrowRight size={14} />
                </button>
            </div>
        </div>
    );
}
