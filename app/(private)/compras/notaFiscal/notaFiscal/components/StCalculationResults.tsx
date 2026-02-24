"use client";

import { serviceUrl } from "@/lib/services";
import { NotaFiscalRow, StCalculationResult } from "@/types/icms";
import { useMemo, useState, useEffect } from "react";
import { FaExclamationTriangle, FaCheckCircle, FaMoneyBillWave, FaCalculator, FaArrowLeft, FaFilePdf, FaFileArchive, FaCheckSquare, FaSquare } from "react-icons/fa";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useToast } from "@/components/Toast";

type Props = {
    results: StCalculationResult[];
    originalItems: NotaFiscalRow[];
    selectedInvoices: Set<string>;
    onBack: () => void;
    onSuccess: () => void;
};

export default function StCalculationResults({ results, originalItems, selectedInvoices, onBack, onSuccess }: Props) {
    const { success, error } = useToast();
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // Selection state: Set of indices
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // --- PDF / ZIP STATE ---
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const activeOriginalItems = useMemo(() => {
        return originalItems.filter(i => selectedInvoices.has(i.CHAVE_NFE));
    }, [originalItems, selectedInvoices]);

    useEffect(() => {
        // If single invoice selected and active, fetch PDF preview automatically
        if (activeOriginalItems.length === 1) {
            const item = activeOriginalItems[0];
            if (item.XML_COMPLETO) {
                setGenerating(true);
                // Use relative URL or env var
                fetch(`${serviceUrl("calculadoraSt")}/icms/danfe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ xml: item.XML_COMPLETO })
                })
                    .then(res => res.blob())
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        setPdfUrl(url);
                    })
                    .catch(err => console.error("Error fetching preview PDF", err))
                    .finally(() => setGenerating(false));
            }
        } else {
            setPdfUrl(null);
        }
    }, [activeOriginalItems]);

    const handleDownloadZip = async () => {
        if (activeOriginalItems.length === 0) return;
        setGenerating(true);
        try {
            const invoices = activeOriginalItems
                .filter(i => i.XML_COMPLETO)
                .map(i => ({ xml: i.XML_COMPLETO!, chave: i.CHAVE_NFE }));

            const res = await fetch(`${serviceUrl("calculadoraSt")}/icms/danfe/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoices })
            });

            if (!res.ok) throw new Error("Erro ao gerar ZIP");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DANFEs_Selecionadas.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Erro ao baixar ZIP.");
        } finally {
            setGenerating(false);
        }
    };

    // Initialize selection: default all "valid" items? 
    // Or users requirement: "selecione se ele vai entrar ou não". 
    // Let's default to selecting items that have a match (mvaRef > 0) OR allowing user to pick.
    // For now, let's select ALL by default so the initial calculation matches the "total".
    useEffect(() => {
        const initial = new Set<number>();
        results.forEach((_, i) => initial.add(i));
        setSelectedIndices(initial);
    }, [results]);

    const toggleItem = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };

    const toggleAll = () => {
        if (selectedIndices.size === results.length) {
            setSelectedIndices(new Set());
        } else {
            const next = new Set<number>();
            results.forEach((_, i) => next.add(i));
            setSelectedIndices(next);
        }
    };

    const metrics = useMemo(() => {
        // Filter only selected items for metrics
        const activeResults = results.filter((_, i) => selectedIndices.has(i));

        const stResults = activeResults.filter(r => r.impostoEscolhido === 'ST');
        const difalResults = activeResults.filter(r => r.impostoEscolhido === 'DIFAL');

        const netStSum = stResults.reduce((acc, curr) => acc + curr.diferenca, 0);
        const totalStComplementar = Math.max(0, netStSum);

        const totalDifal = difalResults.reduce((acc, curr) => acc + (curr.vlDifal || 0), 0);

        const totalDestacado = stResults.reduce((acc, curr) => acc + curr.stDestacado, 0);
        const qtdDivergencia = activeResults.filter(r => r.status === 'Guia Complementar').length;

        // The total value requested by the user interface might be the sum, but let's keep it separate for UI 
        return { totalStComplementar, totalDifal, totalDestacado, qtdDivergencia, count: activeResults.length, activeResults };
    }, [results, selectedIndices]);

    const handleSaveClick = () => {
        setConfirmModalOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        // Group ALL items by Chave NFe (not just active ones)
        const allItemsByInvoice: Record<string, StCalculationResult[]> = {};
        results.forEach(r => {
            if (!allItemsByInvoice[r.chaveNfe]) allItemsByInvoice[r.chaveNfe] = [];
            allItemsByInvoice[r.chaveNfe].push(r);
        });

        // Determine Status per Invoice
        const payload = Array.from(selectedInvoices).map(chave => {
            const invoiceItems = allItemsByInvoice[chave] || [];

            // Check which items of this invoice are selected/active
            const activeItemsForInvoice = invoiceItems.filter(item => {
                const idx = results.indexOf(item);
                return selectedIndices.has(idx);
            });

            // Logic:
            let status = 'Tributado - Verificado';
            let totalValue = 0;
            let tipoImposto = '';

            const hasCalculatedItems = activeItemsForInvoice.some(i => i.mvaRef > 0 || (i.matchType && i.matchType !== 'Não Encontrado'));

            if (activeItemsForInvoice.length > 0 && hasCalculatedItems) {
                // Sum NET ST differences (positive + negative)
                const stItems = activeItemsForInvoice.filter(i => i.impostoEscolhido === 'ST');
                const netStVal = stItems.reduce((acc, curr) => acc + curr.diferenca, 0);
                const stTotal = Math.max(0, netStVal);

                // Sum DIFAL differences
                const difalItems = activeItemsForInvoice.filter(i => i.impostoEscolhido === 'DIFAL');
                const difalTotal = difalItems.reduce((acc, curr) => acc + (curr.vlDifal || 0), 0);

                totalValue = stTotal + difalTotal;

                if (totalValue > 0.05) {
                    status = 'Tem Guia Complementar';
                } else {
                    status = 'Sem Guia - Verificado';
                }

                const tiposArr = [];
                if (stItems.length > 0) tiposArr.push('ICMS ST');
                if (difalItems.length > 0) tiposArr.push('DIFAL');
                tipoImposto = tiposArr.join('/');
            }

            const usuarioId = (() => {
                try {
                const userData = localStorage.getItem("userData");
                if (!userData) return null;
                const parsed = JSON.parse(userData);
                return parsed?.id ?? null;
                } catch {
                return null;
                }
            })();

            return {
                chaveNfe: chave,
                observacoes: status,
                usuario: usuarioId,
                valor: Number(totalValue.toFixed(2))
            };
        });

        try {
            const res = await fetch(`${serviceUrl("calculadoraSt")}/icms/payment-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                success("Status salvo com sucesso!");
                setConfirmModalOpen(false);
                onSuccess(); // Refresh list
            } else {
                error("Erro ao salvar status.");
            }
        } catch (e) {
            console.error(e);
            error("Erro de conexão ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="mt-4 bg-white dark:bg-boxdark rounded-xl shadow-lg p-6 border border-stroke dark:border-strokedark animate-fade-in-up">
            <ConfirmationModal
                isOpen={confirmModalOpen}
                title="Salvar Status"
                message="Deseja salvar o status dessas notas no sistema?"
                onConfirm={handleConfirmSave}
                onCancel={() => setConfirmModalOpen(false)}
                isLoading={isSaving}
                confirmText="Salvar"
                cancelText="Cancelar"
            />

            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors"
                >
                    <FaArrowLeft /> Voltar para Lista
                </button>
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                        <FaCalculator className="text-blue-600" />
                        Análise ICMS ST ({metrics.count} itens)
                    </h3>
                    <button
                        onClick={handleSaveClick}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                    >
                        <FaCheckCircle /> Salvar Status
                    </button>
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                        <FaMoneyBillWave />
                        <span className="font-semibold text-sm">ICMS ST a Recolher</span>
                    </div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {formatCurrency(metrics.totalStComplementar)}
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                        <FaMoneyBillWave />
                        <span className="font-semibold text-sm">DIFAL a Recolher</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrency(metrics.totalDifal)}
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <FaFileInvoiceDollar />
                        <span className="font-semibold text-sm">Total ST Destacado</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(metrics.totalDestacado)}
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                        <FaExclamationTriangle />
                        <span className="font-semibold text-sm">Itens com Divergência</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {metrics.qtdDivergencia}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto border border-stroke dark:border-strokedark rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-meta-4 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 w-[50px] text-center">
                                <button onClick={toggleAll}>
                                    {selectedIndices.size === results.length && results.length > 0 ? <FaCheckSquare /> : <FaSquare />}
                                </button>
                            </th>
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3 text-center">Imposto</th>
                            <th className="px-4 py-3">NCM / MVA</th>
                            <th className="px-4 py-3 text-right">Valor Prod.</th>
                            <th className="px-4 py-3 text-right">ST Destacado</th>
                            <th className="px-4 py-3 text-right">Calc. (Ref)</th>
                            <th className="px-4 py-3 text-right">A Recolher</th>
                            <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                        {results.map((row, idx) => {
                            const isSelected = selectedIndices.has(idx);
                            const isDifal = row.impostoEscolhido === 'DIFAL';
                            const valorARecolher = isDifal ? (row.vlDifal || 0) : row.diferenca;

                            return (
                                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors ${isSelected ? '' : 'opacity-50 grayscale'}`}>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleItem(idx)} className={isSelected ? 'text-blue-600' : 'text-gray-400'}>
                                            {isSelected ? <FaCheckSquare /> : <FaSquare />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-black dark:text-white">{row.produto}</div>
                                        <div className="text-xs text-gray-500">{row.codProd}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold">
                                        {isDifal ? (
                                            <span className="text-purple-600">DIFAL</span>
                                        ) : (
                                            <span className="text-blue-600">ICMS ST</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">NCM: {row.ncmNota}</div>
                                        {!isDifal && ( // Só exibe MVA se for ST, DIFAL não usa MVA para comparar
                                            <div className="text-xs">
                                                MVA Nota: {row.mvaNota}% | Ref: {row.mvaRef}%
                                            </div>
                                        )}
                                        <div className={`text-[10px] px-1.5 py-0.5 rounded inline-block mt-1 ${row.matchType === 'Exato' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            Match: {row.matchType}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {formatCurrency(row.vlProduto)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-600 dark:text-gray-400">
                                        {!isDifal ? formatCurrency(row.stDestacado) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                                        {!isDifal ? formatCurrency(row.stCalculado) : '-'}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${valorARecolher > 0.05 ? 'text-red-600' : valorARecolher < -0.05 ? 'text-green-600' : 'text-gray-400'
                                        }`}>
                                        {formatCurrency(valorARecolher)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isDifal ? (
                                            valorARecolher > 0 ? <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">DIFAL a Recolher</span>
                                                : <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">OK</span>
                                        ) : (
                                            <StatusBadge status={row.status} />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* DOCUMENTOS SECTION */}
            <div className="bg-gray-50 dark:bg-meta-4 p-6 rounded-lg border border-stroke dark:border-strokedark mt-6">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2 text-black dark:text-white">
                    <FaFilePdf className="text-red-500" />
                    Documentos da Nota (Visualização e Download)
                </h4>

                {activeOriginalItems.length === 1 ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-black dark:text-white">Visualizando DANFE: {activeOriginalItems[0].CHAVE_NFE}</span>
                            <button
                                onClick={() => handleDownloadZip()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
                            >
                                <FaFilePdf /> Baixar PDF
                            </button>
                        </div>
                        {generating ? (
                            <div className="h-96 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded animate-pulse text-gray-500">
                                Carregando PDF...
                            </div>
                        ) : pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-[600px] border rounded shadow-sm bg-white" title="DANFE Preview" />
                        ) : (
                            <div className="h-20 flex items-center justify-center text-gray-500 border border-dashed rounded">PDF indisponível ou aguardando seleção.</div>
                        )}
                    </div>
                ) : activeOriginalItems.length > 1 ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-lg text-black dark:text-white">{activeOriginalItems.length} Notas Selecionadas</p>
                            <p className="text-sm text-gray-500">Faça o download de todas as DANFEs em um único arquivo ZIP.</p>
                        </div>
                        <button
                            onClick={handleDownloadZip}
                            disabled={generating}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow flex items-center gap-2 disabled:opacity-50"
                        >
                            {generating ? <span className="animate-spin">⌛</span> : <FaFileArchive />}
                            Baixar ZIP ({activeOriginalItems.length} arquivos)
                        </button>
                    </div>
                ) : (
                    <div className="text-gray-500 italic p-4 text-center border border-dashed rounded">Nenhuma nota selecionada para visualização.</div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status.includes('Guia Complementar') || status.includes('Guia Compl.')) {
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">{status}</span>;
    }
    if (status.includes('Pago a Maior') || status.includes('Pago Maior')) {
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{status}</span>;
    }
    if (status.includes('OK')) {
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 flex items-center justify-center gap-1"><FaCheckCircle /> {status}</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">{status}</span>;
}

function FaFileInvoiceDollar(props: any) {
    return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zm64 320H64V320c35.3 0 64 28.7 64 64zM64 192V128h64c0 35.3-28.7 64-64 64zM448 384c0-35.3 28.7-64 64-64v64H448zm64-192c-35.3 0-64-28.7-64-64h64v64zM288 160a96 96 0 1 1 0 192 96 96 0 1 1 0-192z" /></svg>;
}
