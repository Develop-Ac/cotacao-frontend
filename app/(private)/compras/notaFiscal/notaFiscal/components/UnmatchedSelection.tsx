"use client";

import { StCalculationResult } from "@/types/icms";
import { useState } from "react";
import { FaCheckSquare, FaSquare, FaExclamationTriangle, FaArrowRight } from "react-icons/fa";

type Props = {
    unmatchedItems: StCalculationResult[];
    onConfirm: (
        selectedIndices: Set<number>,
        taxTypes: Record<number, 'ST' | 'DIFAL' | 'TRIBUTADA'>,
        destinations: Record<number, 'COMERCIALIZACAO' | 'USO_CONSUMO'>,
    ) => void;
    onCancel: () => void;
};

export default function UnmatchedSelection({ unmatchedItems, onConfirm, onCancel }: Props) {
    const isDentroDoEstado = (idx: number) => String(unmatchedItems[idx]?.chaveNfe || '').startsWith('51');

    const [selected, setSelected] = useState<Set<number>>(() => {
        const init = new Set<number>();
        unmatchedItems.forEach((item, idx) => {
            if (item.matchType && item.matchType !== 'Não Encontrado') {
                init.add(idx);
            }
        });
        return init;
    });

    const [taxTypes, setTaxTypes] = useState<Record<number, 'ST' | 'DIFAL' | 'TRIBUTADA'>>(() => {
        const initTaxes: Record<number, 'ST' | 'DIFAL' | 'TRIBUTADA'> = {};
        unmatchedItems.forEach((item, idx) => {
            if (item.matchType && item.matchType !== 'Não Encontrado') {
                initTaxes[idx] = 'ST';
            }
        });
        return initTaxes;
    });

    const [headerTaxType, setHeaderTaxType] = useState<'ST' | 'DIFAL' | 'TRIBUTADA' | ''>('');
    const [destinations, setDestinations] = useState<Record<number, 'COMERCIALIZACAO' | 'USO_CONSUMO'>>(() => {
        const initial: Record<number, 'COMERCIALIZACAO' | 'USO_CONSUMO'> = {};
        unmatchedItems.forEach((item, idx) => {
            const imposto = (item.matchType && item.matchType !== 'Não Encontrado') ? 'ST' : 'DIFAL';
            initial[idx] = imposto === 'ST' ? 'COMERCIALIZACAO' : 'USO_CONSUMO';
        });
        return initial;
    });
    const [headerDestination, setHeaderDestination] = useState<'COMERCIALIZACAO' | 'USO_CONSUMO' | ''>('');

    const toggle = (idx: number) => {
        const next = new Set(selected);
        if (next.has(idx)) {
            next.delete(idx);
            const nextTaxes = { ...taxTypes };
            delete nextTaxes[idx];
            setTaxTypes(nextTaxes);
        } else {
            next.add(idx);
            if (headerTaxType) {
                setTaxTypes(prev => ({ ...prev, [idx]: headerTaxType as 'ST' | 'DIFAL' | 'TRIBUTADA' }));
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
        const val = e.target.value as 'ST' | 'DIFAL' | 'TRIBUTADA' | '';
        setHeaderTaxType(val);

        if (val) {
            const nextTaxes = { ...taxTypes };
            selected.forEach(idx => {
                nextTaxes[idx] = val as 'ST' | 'DIFAL' | 'TRIBUTADA';
            });
            setTaxTypes(nextTaxes);
        }
    };

    const handleHeaderDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'COMERCIALIZACAO' | 'USO_CONSUMO' | '';
        setHeaderDestination(val);
        if (!val) return;

        const next = { ...destinations };
        unmatchedItems.forEach((_, idx) => {
            next[idx] = val;
        });
        setDestinations(next);
    };

    const handleRowTaxChange = (idx: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'ST' | 'DIFAL' | 'TRIBUTADA' | '';
        if (val) {
            setTaxTypes(prev => ({ ...prev, [idx]: val as 'ST' | 'DIFAL' | 'TRIBUTADA' }));
            setDestinations(prev => ({
                ...prev,
                [idx]: val === 'ST' ? 'COMERCIALIZACAO' : (prev[idx] || 'USO_CONSUMO'),
            }));
            if (!selected.has(idx)) {
                setSelected(prev => new Set(prev).add(idx));
            }
        } else {
            const nextTaxes = { ...taxTypes };
            delete nextTaxes[idx];
            setTaxTypes(nextTaxes);
        }
    };

    const handleRowDestinationChange = (idx: number, e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as 'COMERCIALIZACAO' | 'USO_CONSUMO' | '';
        if (!val) return;

        setDestinations(prev => ({ ...prev, [idx]: val }));
        if (!selected.has(idx)) {
            setSelected(prev => new Set(prev).add(idx));
        }
    };

    const handleConfirm = () => {
        const missingDestination = Array.from(selected).filter((idx) => !destinations[idx]);
        if (missingDestination.length > 0) {
            alert("Você precisa definir a destinação da mercadoria para todos os itens selecionados.");
            return;
        }

        const missingTax = Array.from(selected).filter((idx) => {
            const destino = destinations[idx];
            const imposto = taxTypes[idx];

            if (destino === 'USO_CONSUMO') {
                // Dentro do estado: imposto opcional
                if (isDentroDoEstado(idx)) return false;
                // Fora do estado: DIFAL obrigatório
                return imposto !== 'DIFAL';
            }

            // Comercialização: imposto obrigatório
            return !imposto;
        });

        if (missingTax.length > 0) {
            alert("Revise o imposto dos itens selecionados: para Uso e Consumo fora do estado é obrigatório DIFAL; dentro do estado o imposto é opcional.");
            return;
        }

        const normalizedTaxTypes = { ...taxTypes };
        selected.forEach((idx) => {
            if (!normalizedTaxTypes[idx]) {
                const destino = destinations[idx];
                // Preenche fallback para manter o payload consistente.
                normalizedTaxTypes[idx] = destino === 'USO_CONSUMO' ? 'TRIBUTADA' : 'ST';
            }
        });

        onConfirm(selected, normalizedTaxTypes, destinations);
    };

    return (
        <div className="bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark animate-fade-in-up mt-4">
            <div className="flex items-center gap-3 mb-4 text-primary dark:text-blue-400">
                <FaExclamationTriangle size={24} />
                <h3 className="text-lg font-bold">Pré-Análise: Seleção de Impostos da NFe</h3>
            </div>

            <p className="mb-6 text-gray-600 dark:text-gray-300">
                Abaixo estão todos os produtos da nota. Itens com vínculo de MVA já vêm selecionados como <b>ICMS ST</b>.
                Para produtos de uso e consumo, você pode trocar livremente a opção para <b>DIFAL</b>.
                Para compras fora do estado a destinação é sugerida automaticamente, mas pode ser alterada manualmente.
                Itens sem MVA vêm desmarcados, selecione-os e escolha a tributação obrigatoriamente caso deseje calculá-los.
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
                                        <option value="TRIBUTADA">Tributada</option>
                                    </select>
                                </div>
                            </th>
                            <th className="px-4 py-3 w-[220px]">
                                <div className="flex flex-col gap-1">
                                    <span>Destinação</span>
                                    <select
                                        value={headerDestination}
                                        onChange={handleHeaderDestinationChange}
                                        className="w-full border p-1 rounded font-normal text-xs bg-white text-black dark:bg-form-input dark:text-white dark:border-form-strokedark focus:ring focus:ring-blue-500/50"
                                    >
                                        <option value="">-- Aplicar a todos --</option>
                                        <option value="COMERCIALIZACAO">Compra para Comercialização</option>
                                        <option value="USO_CONSUMO">Uso e Consumo</option>
                                    </select>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                        {unmatchedItems.map((row, idx) => {
                            const isSelected = selected.has(idx);
                            const rowTax = taxTypes[idx] || '';
                            const rowDestination = destinations[idx] || '';
                            const hasError = isSelected && !rowTax;
                            const hasDestinationError = isSelected && !rowDestination;

                            return (
                                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors ${isSelected ? (hasError || hasDestinationError ? 'bg-red-50 dark:bg-red-900/10' : 'bg-blue-50 dark:bg-blue-900/10') : ''}`}>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <button onClick={() => toggle(idx)} className={isSelected ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}>
                                            {isSelected ? <FaCheckSquare size={16} /> : <FaSquare size={16} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <div className="font-medium text-black dark:text-white line-clamp-2" title={row.produto}>{row.produto}</div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span>Cód: {row.codProd}</span> | <span>NCM: {row.ncmNota}</span>
                                            {row.matchType && row.matchType !== 'Não Encontrado' && (
                                                <> | <span className="text-blue-600 font-semibold text-[10px] bg-blue-50 px-1 rounded border border-blue-200">MVA Ref: {row.mvaRef}%</span></>
                                            )}
                                        </div>
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
                                            <option value="TRIBUTADA">Tributada</option>
                                        </select>
                                        {hasError && (
                                            <span className="text-[10px] text-red-500 font-medium block mt-1">
                                                Obrigatório
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <select
                                            value={rowDestination}
                                            onChange={(e) => handleRowDestinationChange(idx, e)}
                                            className={`w-full border p-1.5 rounded text-sm bg-white dark:bg-form-input focus:ring focus:ring-blue-500/50 transition-colors ${hasDestinationError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-form-strokedark'}`}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="COMERCIALIZACAO">Compra para Comercialização</option>
                                            <option value="USO_CONSUMO">Uso e Consumo</option>
                                        </select>
                                        {hasDestinationError && (
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
