"use client";

import { useEffect, useState } from "react";
import { FaCalendarAlt, FaSearch, FaSync, FaExclamationTriangle, FaCheckCircle, FaClipboardCheck, FaSave, FaHistory, FaStickyNote, FaCheck, FaFileExcel, FaFilePdf } from "react-icons/fa";
import { AuditoriaItem, AuditoriaService } from "@/lib/auditoria.service";
import Link from "next/link";
import AnimatedDatePicker from "@/components/AnimatedDatePicker";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Simples Hook para pegar usuários (simplificado do contagem/page.tsx)
const useUsuarios = () => {
    const [usuarios, setUsuarios] = useState<any[]>([]);
    useEffect(() => {
        // Ajuste URL se necessário conforme env do usuário
        fetch("http://sistema-service.acacessorios.local/usuarios")
            .then(res => res.json())
            .then(data => {
                const arr = Array.isArray(data) ? data : [];
                setUsuarios(arr);
            })
            .catch(err => console.error("Erro usuarios", err));
    }, []);
    return usuarios;
};

export default function AuditoriaPage() {
    const [dataAuditoria, setDataAuditoria] = useState("");
    const [piso, setPiso] = useState("");

    const [allItems, setAllItems] = useState<AuditoriaItem[]>([]); // Todos os itens da data
    const [itens, setItens] = useState<AuditoriaItem[]>([]); // Itens filtrados para exibição

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [lastFetchedDate, setLastFetchedDate] = useState<string | null>(null); // Para travar o botão

    const [expandedItem, setExpandedItem] = useState<number | null>(null); // Cod Produto
    const [hideAudited, setHideAudited] = useState(true); // Default true para focar no erro

    // Histórico Modal
    const [historicoList, setHistoricoList] = useState<any[]>([]);
    const [showHistoricoModal, setShowHistoricoModal] = useState(false);
    const [loadingHistorico, setLoadingHistorico] = useState(false);


    // Controle de Input: { tipo: 'BAIXA' | 'INCLUSAO' | 'CORRETO', qtd: number }
    const [auditoriaValores, setAuditoriaValores] = useState<Record<string, { tipo?: 'BAIXA' | 'INCLUSAO' | 'CORRETO', qtd?: number }>>({});
    const [observacoes, setObservacoes] = useState<Record<string, string>>({});

    // UX Improvements State
    const [expandedHistory, setExpandedHistory] = useState<number | null>(null); // Toggle Histórico Inline
    const [historicoMap, setHistoricoMap] = useState<Record<number, any[]>>({}); // Cache de histórico por produto

    const usuarios = useUsuarios();

    // Mock de usuário logado (pegar do contexto de auth real se existir)
    // Vou pegar o primeiro usuário 'Estoque' que encontrar ou fixar um ID para teste se não tiver auth
    const usuarioLogadoId = usuarios.find(u => u.setor === 'Estoque')?.id || "user_id_placeholder";

    // 1. Fetch de Itens (Apenas pela DATA)
    const fetchItens = async () => {
        if (!dataAuditoria) return;
        setLoading(true);
        setMsg(null);
        try {
            // Removemos o piso da busca para trazer tudo e filtrar localmente
            // A chamada ao service ignora o parametro piso se não passar, ou se passar undefined
            const data = await AuditoriaService.getPendentes(dataAuditoria);
            setAllItems(data);
            setLastFetchedDate(dataAuditoria); // Trava a busca para esta data
            if (data.length === 0) setMsg("Nenhum item para auditoria nesta data.");
        } catch (e: any) {
            setMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    // 2. Filtro Local (Auto-filtro quando piso muda ou dados mudam)
    useEffect(() => {
        let filtered = allItems;

        if (piso && piso.trim() !== "") {
            const filterPiso = piso.trim().toLowerCase();
            filtered = filtered.filter(item => {
                // Filtra pelo campo 'piso' retornado pelo backend
                const itemPiso = item.piso ? String(item.piso).toLowerCase() : "";

                // Opcional: Se quiser filtrar tambem por localização começando com o piso
                const locMatch = item.locacoes.some(l => l && l.toLowerCase().startsWith(filterPiso));

                return itemPiso.includes(filterPiso) || locMatch;
            });
        }

        setItens(filtered);
    }, [piso, allItems]);

    const handleSave = async (item: AuditoriaItem) => {
        const inputState = auditoriaValores[item.cod_produto] || { tipo: 'BAIXA' }; // Default Baixa se não começou
        const tipo = inputState.tipo || 'BAIXA';
        const qtd = inputState.qtd || 0;

        if (tipo !== 'CORRETO' && (qtd <= 0 || isNaN(qtd))) {
            alert("Informe a quantidade do ajuste (deve ser maior que zero).");
            return;
        }

        const obs = observacoes[item.cod_produto] || "";
        if (tipo !== 'CORRETO' && !obs.trim()) {
            alert("Para ajustes (Baixa/Inclusão), a observação é obrigatória.");
            return;
        }

        if (!confirm(`Confirma a auditoria para o produto ${item.cod_produto} como ${tipo} ${tipo !== 'CORRETO' ? qtd : ''}?`)) return;

        try {
            await AuditoriaService.save({
                contagem_cuid: item.contagem_cuid,
                cod_produto: item.cod_produto,
                tipo_movimento: tipo,
                quantidade_movimento: qtd,
                observacao: obs,
                usuario_id: usuarioLogadoId
            });
            alert("Auditoria salva com sucesso!");
            // Atualiza tanto allItems quanto itens para refletir a mudança
            setAllItems(prev => prev.map(i => i.cod_produto === item.cod_produto ? {
                ...i,
                ja_auditado: true,
                audit_dados: {
                    tipo: tipo,
                    qtd: qtd,
                    obs: obs
                }
            } : i));
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        }
    };

    const handleToggleHistorico = async (codProduto: number) => {
        if (expandedHistory === codProduto) {
            setExpandedHistory(null);
            return;
        }

        setExpandedHistory(codProduto);

        // Se já tem no cache, não busca de novo
        if (historicoMap[codProduto]) return;

        setLoadingHistorico(true);
        try {
            const data = await AuditoriaService.getHistorico(codProduto);
            setHistoricoMap(prev => ({ ...prev, [codProduto]: data }));
        } catch (e) {
            alert("Erro ao buscar histórico");
        } finally {
            setLoadingHistorico(false);
        }
    };


    // Resetar o estado de "travado" se o usuário mudar a data manualmente no input
    useEffect(() => {
        if (dataAuditoria !== lastFetchedDate) {
            // Apenas destrava (reagitividade via disabled do botao)
        }
    }, [dataAuditoria, lastFetchedDate]);

    // Helper para gerar dados planos por localização
    const generateReportData = () => {
        const rows: any[] = [];
        const filteredItens = itens.filter(i => !hideAudited || !i.ja_auditado);

        filteredItens.forEach(item => {
            // Coletar todas as localizações únicas encontradas nos logs das 3 contagens
            const locs = new Set<string>();

            // Adicionar localizações do cadastro se não houver logs
            // item.locacoes.forEach(l => l && locs.add(l));

            // Verificar logs da Contagem 1
            if (item.history && item.history[1] && item.history[1].logs) {
                item.history[1].logs.forEach(log => log.local && locs.add(log.local));
            }
            // Verificar logs da Contagem 2
            if (item.history && item.history[2] && item.history[2].logs) {
                item.history[2].logs.forEach(log => log.local && locs.add(log.local));
            }
            // Verificar logs da Contagem 3 (Auditoria)
            if (item.history && item.history[3] && item.history[3].logs) {
                item.history[3].logs.forEach(log => log.local && locs.add(log.local));
            }

            // Se não achou localização em logs, usa as do cadastro para mostrar zerado
            if (locs.size === 0) {
                item.locacoes.forEach(l => l && locs.add(l));
            }

            // Para cada local, calcular qtds
            locs.forEach(local => {
                const qtd1 = item.history?.[1]?.logs?.filter(l => l.local === local).reduce((acc, curr) => acc + curr.qtd, 0) || 0;
                const qtd2 = item.history?.[2]?.logs?.filter(l => l.local === local).reduce((acc, curr) => acc + curr.qtd, 0) || 0;
                const qtd3 = item.history?.[3]?.logs?.filter(l => l.local === local).reduce((acc, curr) => acc + curr.qtd, 0) || 0;

                rows.push({
                    cod: item.cod_produto,
                    desc: item.desc_produto,
                    local: local,
                    piso: item.piso || '-',
                    c1: qtd1,
                    c2: qtd2,
                    c3: qtd3,
                    est_snapshot: item.estoque_snapshot ?? 0,
                    est_atual: item.estoque_atual ?? 0,
                    diff3: item.diferencas[3] ?? 0,
                    status: item.ja_auditado ? "Auditado" : "Pendente"
                });
            });
        });

        // Ordenar por produto e local
        return rows.sort((a, b) => {
            if (a.cod !== b.cod) return a.cod - b.cod;
            return a.local.localeCompare(b.local);
        });
    };

    const formatDateHeader = (dateStr: string) => {
        if (!dateStr) return "";
        // Se já tiver barra, assume que está ok (DD/MM/AAAA)
        if (dateStr.includes('/')) return dateStr;
        // Se for YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }


    const handleExportExcel = () => {
        const data = generateReportData();
        if (data.length === 0) return alert("Sem dados para exportar com os filtros atuais.");

        const mappedData = data.map(r => ({
            "Cód": r.cod,
            "Produto": r.desc,
            "Local": r.local,
            "Piso": r.piso,
            "1ª Contagem": r.c1,
            "2ª Contagem": r.c2,
            "Auditoria (3ª)": r.c3,
            "Saldo Momento": r.est_snapshot,
            "Diferença 3ª": r.diff3,
            "Saldo Atual": r.est_atual,
            "Status": r.status
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(mappedData);
        // Adjust column widths
        const wscols = [
            { wch: 8 }, // Cód
            { wch: 40 }, // Produto
            { wch: 15 }, // Local
            { wch: 8 }, // Piso
            { wch: 10 }, // C1
            { wch: 10 }, // C2
            { wch: 10 }, // C3
            { wch: 12 }, // Saldo Momento
            { wch: 12 }, // Dif 3
            { wch: 12 }, // Saldo Atual
            { wch: 10 } // Status
        ];
        ws["!cols"] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Auditoria Detalhada");
        XLSX.writeFile(wb, `Auditoria_Detalhada_${dataAuditoria.replace(/\//g, "-")}.xlsx`);
    };

    const handleExportPDF = () => {
        const data = generateReportData();
        if (data.length === 0) return alert("Sem dados para exportar com os filtros atuais.");

        const doc = new jsPDF();
        const showStatus = !hideAudited;

        doc.setFontSize(16);
        doc.text(`Relatório de Auditoria - ${formatDateHeader(dataAuditoria)}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Filtro Piso: ${piso || 'Todos'} | Itens: ${data.length}`, 14, 22);

        const headers = ['Cód', 'Produto', 'Local', '1ª', '2ª', '3ª', 'S. Mom', 'Dif. 3ª', 'S. Atual'];
        if (showStatus) headers.push('Status');

        const tableData: any[] = [];

        // Agrupar dados
        for (let i = 0; i < data.length; i++) {
            const item = data[i];

            // Verifica o tamanho do grupo (quantas linhas tem o mesmo codigo)
            let span = 1;
            for (let j = i + 1; j < data.length; j++) {
                if (data[j].cod === item.cod) {
                    span++;
                } else {
                    break;
                }
            }

            const isFirstOfGroup = (i === 0) || (data[i - 1].cod !== item.cod);
            const currentRowSpan = isFirstOfGroup ? span : 1;

            if (isFirstOfGroup) {
                const row = [
                    { content: item.cod, rowSpan: currentRowSpan, styles: { valign: 'middle' } },
                    { content: item.desc.substring(0, 35), rowSpan: currentRowSpan, styles: { valign: 'middle' } },
                    item.local,
                    item.c1,
                    item.c2,
                    item.c3,
                    { content: item.est_snapshot, rowSpan: currentRowSpan, styles: { valign: 'middle' } },
                    { content: item.diff3, rowSpan: currentRowSpan, styles: { valign: 'middle', fontStyle: 'bold', textColor: item.diff3 !== 0 ? [200, 0, 0] : [0, 100, 0] } },
                    { content: item.est_atual, rowSpan: currentRowSpan, styles: { valign: 'middle' } }
                ];
                if (showStatus) {
                    row.push({ content: item.status, rowSpan: currentRowSpan, styles: { valign: 'middle' } });
                }
                tableData.push(row);
            } else {
                // Linhas subsequentes do grupo: Adiciona APENAS as colunas variáveis
                // Local, c1, c2, c3
                const row = [
                    item.local,
                    item.c1,
                    item.c2,
                    item.c3
                ];
                tableData.push(row);
            }
        }

        const columnStyles: any = {
            0: { cellWidth: 15, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 20, halign: 'left' },
            3: { cellWidth: 10 },
            4: { cellWidth: 10 },
            5: { cellWidth: 10 },
            6: { cellWidth: 15 },
            7: { cellWidth: 15 }
        };
        if (showStatus) {
            columnStyles[8] = { cellWidth: 20 };
        }

        autoTable(doc, {
            startY: 25,
            head: [headers],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [60, 80, 224] },
            styles: { fontSize: 8, cellPadding: 1, halign: 'center' },
            columnStyles: columnStyles,
            didParseCell: (dataCell) => {
                // Recupera o item original. O índice da linha na tabela bate com o índice em 'data'
                const originalItem = data[dataCell.row.index];
                if (originalItem && originalItem.status === 'Auditado') {
                    dataCell.cell.styles.fillColor = [230, 230, 230];
                }
            }
        });

        doc.save(`Auditoria_${dataAuditoria.replace(/\//g, "-")}.pdf`);
    };


    return (
        <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white">
                        <Link href="/" className="hover:text-primary transition-colors">
                            Intranet
                        </Link>{" "}
                        / <Link href="/estoque/contagem" className="hover:text-primary transition-colors">Estoque</Link> / Auditoria
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Finalização e ajuste de diferenças de estoque
                    </p>
                </div>
            </div>

            {/* Filters - Estilo novo baseado em compras/produtos */}
            <div className="bg-white dark:bg-boxdark rounded-xl shadow-md p-4 mb-6 border border-gray-100 dark:border-strokedark">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    <div className="flex gap-4 w-full md:w-auto flex-wrap items-center justify-center md:justify-start">
                        {/* Filtro Data */}
                        <div className="flex items-center gap-2 border-r border-gray-200 dark:border-strokedark pr-4 mr-2 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Data da Contagem:</span>
                            <div className="w-[180px]">
                                <AnimatedDatePicker
                                    value={dataAuditoria}
                                    onChange={setDataAuditoria}
                                    placeholder="dd/mm/aaaa"
                                />
                            </div>
                        </div>

                        {/* Filtro Piso */}
                        <div className="flex items-center gap-2 pr-4 mr-2 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Piso:</span>
                            <input
                                type="text"
                                value={piso}
                                onChange={(e) => setPiso(e.target.value)}
                                placeholder="Autofiltro"
                                className="w-24 h-10 px-2 border border-gray-300 dark:border-form-strokedark rounded-lg focus:ring-2 focus:ring-primary outline-none bg-transparent dark:text-white dark:bg-form-input"
                            />
                        </div>

                        <button
                            onClick={fetchItens}
                            disabled={loading || !dataAuditoria || dataAuditoria === lastFetchedDate}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
                            title={dataAuditoria === lastFetchedDate ? "Altere a data para buscar novamente" : "Buscar pendências"}
                        >
                            {loading ? <FaSync className="animate-spin" /> : <FaSearch />}
                            {dataAuditoria === lastFetchedDate ? "Buscado" : "Buscar"}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={handleExportExcel}
                                disabled={itens.length === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap text-sm"
                                title="Exportar Excel"
                            >
                                <FaFileExcel /> Excel
                            </button>
                            <button
                                onClick={handleExportPDF}
                                disabled={itens.length === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap text-sm"
                                title="Exportar PDF"
                            >
                                <FaFilePdf /> PDF
                            </button>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none ml-4">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary border-gray-300 dark:border-strokedark dark:bg-boxdark"
                            checked={hideAudited}
                            onChange={(e) => setHideAudited(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ocultar Auditados/Corretos
                        </span>
                    </label>
                </div>
                {msg && <p className="mt-4 text-gray-500">{msg}</p>}
            </div>

            <div className="flex flex-col gap-4">
                {itens.filter(i => !hideAudited || !i.ja_auditado).map((item) => {
                    const isRecorrente = !item.ja_auditado && item.recorrencia_erro;
                    return (
                        <div key={item.cod_produto} className={`bg-white dark:bg-boxdark rounded-lg shadow border-l-4 ${item.ja_auditado ? 'border-green-500' : (isRecorrente ? 'border-red-600 ring-1 ring-red-100 dark:ring-red-900 bg-red-50/50 dark:bg-red-900/10' : 'border-red-500')} p-4`}>

                            <div className="flex justify-between items-start flex-wrap gap-4">
                                <div className="flex-1 min-w-[300px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg font-bold text-gray-800 dark:text-white">
                                            #{item.cod_produto} - {item.desc_produto}
                                        </span>
                                        {item.ja_auditado && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">AUDITADO</span>}
                                        {isRecorrente && (
                                            <div className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse border border-red-200">
                                                <FaExclamationTriangle /> RECORRÊNCIA DE ERRO
                                            </div>
                                        )}
                                        {/* TODO: Ícone de histórico se tiver histórico anterior */}
                                    </div>
                                    <div className="text-sm text-gray-500 mb-2">
                                        Locais: {item.locacoes.join(", ")}
                                    </div>
                                    <div className="grid grid-cols-5 gap-2 text-center text-sm mb-3">
                                        <div className="bg-gray-50 p-2 rounded">
                                            <div className="text-gray-400 text-xs text-[10px] whitespace-nowrap">Estoque (Contagem)</div>
                                            <div className="font-bold">{item.estoque_snapshot ?? '-'}</div>
                                        </div>
                                        <div className="bg-blue-50 text-blue-800 p-2 rounded">
                                            <div className="text-blue-400 text-xs text-[10px] whitespace-nowrap">Estoque (Atual)</div>
                                            <div className="font-bold">{item.estoque_atual ?? '-'}</div>
                                        </div>
                                        <div className={`p - 2 rounded ${item.diferencas[1] === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} `}>
                                            <div className="text-xs opacity-70">1ª Cont.</div>
                                            <div className="font-bold">{item.diferencas[1] > 0 ? `+ ${item.diferencas[1]} ` : item.diferencas[1]}</div>
                                        </div>
                                        <div className={`p - 2 rounded ${item.diferencas[2] === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} `}>
                                            <div className="text-xs opacity-70">2ª Cont.</div>
                                            <div className="font-bold">{item.diferencas[2] > 0 ? `+ ${item.diferencas[2]} ` : item.diferencas[2]}</div>
                                        </div>
                                        <div className={`p - 2 rounded ${item.diferencas[3] === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} `}>
                                            <div className="text-xs opacity-70">3ª Cont.</div>
                                            <div className="font-bold">{item.diferencas[3] > 0 ? `+ ${item.diferencas[3]} ` : item.diferencas[3]}</div>
                                        </div>
                                    </div>

                                    {/* Botões movidos para a esquerda para otimizar espaço */}
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setExpandedItem(expandedItem === item.cod_produto ? null : item.cod_produto)}
                                            className={`text-xs hover:underline flex items-center gap-1 ${expandedItem === item.cod_produto ? 'text-primary font-bold' : 'text-gray-500 hover:text-primary'}`}
                                        >
                                            <FaHistory /> {expandedItem === item.cod_produto ? 'Ocultar Detalhes' : 'Ver Detalhes das Contagens'}
                                        </button>

                                        <button
                                            onClick={() => handleToggleHistorico(item.cod_produto)}
                                            className={`text-xs hover:underline flex items-center gap-1 ${expandedHistory === item.cod_produto ? 'text-primary font-bold' : 'text-gray-500 hover:text-primary'}`}
                                        >
                                            <FaClipboardCheck /> {expandedHistory === item.cod_produto ? 'Ocultar Histórico' : 'Ver Histórico de Auditorias'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[300px] flex flex-col gap-2">
                                    {/* Botões antigos removidos daqui */}

                                    {/* Área de Ação de Auditoria - Layout Estável */}
                                    {!item.ja_auditado ? (
                                        <div className="flex flex-col gap-3 bg-gray-50 dark:bg-meta-4 p-3 rounded border border-gray-100 dark:border-strokedark transition-all">
                                            {/* Tabs de Tipo de Ação */}
                                            <div className="flex bg-white dark:bg-boxdark rounded-lg p-1 border border-gray-200 dark:border-strokedark shadow-sm">
                                                {['BAIXA', 'INCLUSAO', 'CORRETO'].map((t) => {
                                                    const currentType = auditoriaValores[item.cod_produto]?.tipo || 'BAIXA';
                                                    const isActive = currentType === t;

                                                    let activeClass = "";
                                                    if (t === 'BAIXA') activeClass = "bg-red-50 text-red-700 border-red-200";
                                                    if (t === 'INCLUSAO') activeClass = "bg-blue-50 text-blue-700 border-blue-200";
                                                    if (t === 'CORRETO') activeClass = "bg-green-50 text-green-700 border-green-200";

                                                    return (
                                                        <button
                                                            key={t}
                                                            onClick={() => setAuditoriaValores(prev => ({
                                                                ...prev,
                                                                [item.cod_produto]: {
                                                                    ...prev[item.cod_produto],
                                                                    tipo: t as any,
                                                                    qtd: t === 'CORRETO' ? 0 : (prev[item.cod_produto]?.qtd || 0)
                                                                }
                                                            }))}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${isActive ? `${activeClass} shadow-sm border` : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-strokedark'}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Inputs Condicionais com Altura Reservada para evitar pulo */}
                                            <div className="min-h-[40px] flex gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                                                {(auditoriaValores[item.cod_produto]?.tipo || 'BAIXA') !== 'CORRETO' && (
                                                    <div className="w-[100px]">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-10 border border-gray-300 rounded px-2 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark font-bold"
                                                            placeholder="Qtd"
                                                            value={auditoriaValores[item.cod_produto]?.qtd || ''}
                                                            onChange={(e) => setAuditoriaValores(prev => ({
                                                                ...prev,
                                                                [item.cod_produto]: { ...prev[item.cod_produto], qtd: Math.abs(Number(e.target.value)) }
                                                            }))}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder={(auditoriaValores[item.cod_produto]?.tipo || 'BAIXA') === 'CORRETO' ? "Observação (Opcional)" : "Observação (Obrigatória)"}
                                                        className="w-full h-10 border border-gray-300 rounded px-3 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-boxdark"
                                                        value={observacoes[item.cod_produto] || ''}
                                                        onChange={(e) => setObservacoes(prev => ({ ...prev, [item.cod_produto]: e.target.value }))}
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => handleSave(item)}
                                                    className="h-10 bg-green-600 text-white px-4 rounded font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm active:scale-95"
                                                    title="Confirmar Auditoria"
                                                >
                                                    <FaCheck />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-200 dark:border-strokedark dark:bg-meta-4 p-3 rounded flex flex-col gap-2">
                                            <div className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-100 pb-1 mb-1 flex justify-between items-center">
                                                <span>
                                                    <FaCheckCircle className="inline text-green-500 mr-1" />
                                                    Auditoria Salva
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded font-bold ${item.audit_dados?.tipo === 'BAIXA' ? 'bg-red-100 text-red-700' :
                                                    item.audit_dados?.tipo === 'INCLUSAO' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.audit_dados?.tipo || 'CORRETO'}
                                                </span>
                                            </div>
                                            <div className="text-sm grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-gray-500 text-xs block">Quantidade:</span>
                                                    <span className="font-mono font-bold">{item.audit_dados?.qtd ?? 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs block">Observação:</span>
                                                    <span className="italic text-gray-600 dark:text-gray-400 text-xs break-words">
                                                        {item.audit_dados?.obs || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seção de Conteúdo Expandido (Tabs ou Accordion) */}
                            {(expandedItem === item.cod_produto || expandedHistory === item.cod_produto) && (
                                <div className="mt-4 border-t pt-4 border-gray-100 dark:border-strokedark animate-in slide-in-from-top-2 duration-300">

                                    {/* Detalhes das Contagens Atuais */}
                                    {expandedItem === item.cod_produto && (
                                        <>
                                            <h4 className="font-bold text-sm mb-3 text-gray-600 flex items-center gap-2">
                                                <FaHistory /> Detalhes das Contagens (Atual)
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                {[1, 2, 3].map(round => (
                                                    <div key={round} className="bg-gray-50 dark:bg-meta-4 p-3 rounded text-xs border border-gray-100 dark:border-strokedark">
                                                        <div className="font-bold border-b pb-1 mb-2 flex justify-between">
                                                            <span>Contagem {round}</span>
                                                            <span className="bg-gray-200 dark:bg-black/20 px-1.5 rounded">Total: {(item.history as any)[round].total}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                            {(item.history as any)[round].logs.map((log: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between border-b border-gray-200 dark:border-strokedark pb-1 last:border-0 hover:bg-white dark:hover:bg-black/10 p-1 rounded transition-colors">
                                                                    <span>{log.usuario} <span className="text-gray-400">({log.local})</span></span>
                                                                    <span className="font-bold">{log.qtd}</span>
                                                                </div>
                                                            ))}
                                                            {(item.history as any)[round].logs.length === 0 && <span className="text-gray-400 italic text-center py-2">Sem registros</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Histórico Anterior (Inline) */}
                                    {expandedHistory === item.cod_produto && (
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
                                            <h4 className="font-bold text-sm mb-3 text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                <FaClipboardCheck /> Histórico de Auditorias Anteriores
                                            </h4>

                                            {loadingHistorico && !historicoMap[item.cod_produto] ? (
                                                <div className="text-center py-4 text-gray-500"><FaSync className="animate-spin inline mr-2" /> Carregando histórico...</div>
                                            ) : (historicoMap[item.cod_produto] || []).length === 0 ? (
                                                <div className="text-center py-4 text-gray-500 italic bg-white dark:bg-black/20 rounded">Nenhuma auditoria anterior encontrada.</div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left bg-white dark:bg-boxdark rounded overflow-hidden">
                                                        <thead className="bg-gray-100 dark:bg-meta-4 text-gray-700 dark:text-gray-300">
                                                            <tr>
                                                                <th className="p-2">Data</th>
                                                                <th className="p-2">Usuário</th>
                                                                <th className="p-2">Tipo</th>
                                                                <th className="p-2 text-right">Qtd</th>
                                                                <th className="p-2">Obs</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-strokedark">
                                                            {(historicoMap[item.cod_produto] || []).map((h: any) => (
                                                                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-meta-4/50">
                                                                    <td className="p-2 whitespace-nowrap">{formatDateHeader(new Date(h.created_at).toLocaleDateString())}</td>
                                                                    <td className="p-2">{h.usuario?.nome || '-'}</td>
                                                                    <td className="p-2">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${h.tipo_movimento === 'BAIXA' ? 'bg-red-100 text-red-700' :
                                                                            h.tipo_movimento === 'INCLUSAO' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-green-100 text-green-700'
                                                                            }`}>
                                                                            {h.tipo_movimento}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-2 text-right font-mono font-bold">{h.quantidade_movimento}</td>
                                                                    <td className="p-2 text-gray-500 italic max-w-[200px] truncate" title={h.observacao}>{h.observacao}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div >
    );
}
