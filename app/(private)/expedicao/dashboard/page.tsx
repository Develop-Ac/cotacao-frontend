'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { serviceUrl } from '@/lib/services';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

interface Entrega {
    id: number;
    cliente: string;
    status: string;
    id_entregador: number;
    venda: string;
    criado_em: string;
    aceito_em: string;
    disponivel_para_entrega_em: string;
    saiu_para_entrega_em: string;
    finalizado_em: string;
    retorno_entregador_em: string;
    embalado_em: string;
}

interface EntregaProcessada extends Entrega {
    nomeEntregador: string;
    separacao: number;
    embalagem: number;
    aguarEntregador: number;
    aguarRota: number;
    rota: number;
    retorno: number;
    ciclo: number;
}

const MAPA_ENTREGADORES: { [key: number]: string } = {
    18: "ALEX SILVA E SILVA",
    31: "FRANCISCO DOS SANTOS",
    57: "JOÃO MORO",
};

const calcularDuracao = (inicio: string, fim: string): number => {
    if (!inicio || !fim || inicio === '' || fim === '') return 0;

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    // Verifica se as datas são válidas
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) return 0;

    const duracao = (dataFim.getTime() - dataInicio.getTime()) / 1000; // retorna em segundos
    return duracao > 0 ? duracao : 0; // garante que não retorne valores negativos
};

const processarEntregas = (data: Entrega[]): EntregaProcessada[] => {
    return data.map(entrega => {
        const separacao = calcularDuracao(entrega.criado_em, entrega.aceito_em);
        const embalagem = calcularDuracao(entrega.aceito_em, entrega.embalado_em);
        const aguarEntregador = calcularDuracao(entrega.embalado_em, entrega.disponivel_para_entrega_em);
        const aguarRota = calcularDuracao(entrega.disponivel_para_entrega_em, entrega.saiu_para_entrega_em);
        const rota = calcularDuracao(entrega.saiu_para_entrega_em, entrega.finalizado_em);
        const retorno = calcularDuracao(entrega.finalizado_em, entrega.retorno_entregador_em);
        const ciclo = calcularDuracao(entrega.criado_em, entrega.finalizado_em);

        return {
            ...entrega,
            nomeEntregador: MAPA_ENTREGADORES[entrega.id_entregador] || "Desconhecido",
            separacao,
            embalagem,
            aguarEntregador,
            aguarRota,
            rota,
            retorno,
            ciclo
        };
    });
};

const EXPEDICAO_API = serviceUrl("expedicao");

export default function EntregasPage() {
    const [entregas, setEntregas] = useState<EntregaProcessada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filteredData, setFilteredData] = useState<EntregaProcessada[]>([]);
    const [dataInicio, setDataInicio] = useState<string>('');
    const [dataFim, setDataFim] = useState<string>('');



    // --- Gráfico de entregas por dia ---
    const entregasPorDia = React.useMemo(() => {
        const counts: { [date: string]: number } = {};
        filteredData.forEach((entrega) => {
            const data = entrega.criado_em.split('T')[0];
            counts[data] = (counts[data] || 0) + 1;
        });
        // Ordena por data e formata para dd/mm/yyyy
        return Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .reduce<{ labels: string[]; values: number[] }>((acc, [date, count]) => {
                // date está em yyyy-mm-dd
                const [y, m, d] = date.split('-');
                const dataFormatada = `${d}/${m}/${y}`;
                acc.labels.push(dataFormatada);
                acc.values.push(count);
                return acc;
            }, { labels: [], values: [] });
    }, [filteredData]);

    // --- Gráfico de Status (Pizza) ---
    const statusEntregas = React.useMemo(() => {
        const counts: { [status: string]: number } = {};
        filteredData.forEach((entrega) => {
            const status = entrega.status || 'Indefinido';
            counts[status] = (counts[status] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            values: Object.values(counts),
        };
    }, [filteredData]);

    // --- Gráfico de Tempo Médio de Ciclo por Dia (Linha) ---
    const cicloPorDia = React.useMemo(() => {
        const dadosPorDia: { [date: string]: { total: number; count: number } } = {};

        filteredData.forEach((entrega) => {
            if (entrega.ciclo > 0) {
                const data = entrega.criado_em.split('T')[0];
                if (!dadosPorDia[data]) {
                    dadosPorDia[data] = { total: 0, count: 0 };
                }
                dadosPorDia[data].total += entrega.ciclo;
                dadosPorDia[data].count += 1;
            }
        });

        return Object.entries(dadosPorDia)
            .sort(([a], [b]) => a.localeCompare(b))
            .reduce<{ labels: string[]; values: number[] }>((acc, [date, data]) => {
                const [y, m, d] = date.split('-');
                const dataFormatada = `${d}/${m}/${y}`;
                acc.labels.push(dataFormatada);
                // Calcula em minutos com 2 casas decimais
                const minutos = parseFloat((data.total / data.count / 60).toFixed(2));
                acc.values.push(minutos);
                return acc;
            }, { labels: [], values: [] });
    }, [filteredData]);

    const formatarTempo = (segundos: number): string => {
        if (!segundos || segundos <= 0) return "0s";

        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const segs = Math.floor(segundos % 60);

        const partes = [];
        if (horas > 0) partes.push(`${horas}h`);
        if (minutos > 0) partes.push(`${minutos}m`);
        if (segs > 0 || partes.length === 0) partes.push(`${segs}s`);

        return partes.join(' ');
    };

    const formatarMinutos = (segundos: number): string => {
        if (!segundos || segundos <= 0) return "0:00";

        const minutosDecimal = segundos / 60;
        const minutosInteiros = Math.floor(minutosDecimal);
        const segundosRestantes = Math.floor((minutosDecimal - minutosInteiros) * 60);

        return `${minutosInteiros}:${segundosRestantes.toString().padStart(2, '0')}`;
    };



    useEffect(() => {
        const fetchEntregas = async () => {
            try {
                const response = await fetch(`${EXPEDICAO_API}/expedicao/entregas`);
                if (!response.ok) {
                    throw new Error('Erro ao carregar dados');
                }
                const data: Entrega[] = await response.json();
                const processedData = processarEntregas(data);
                setEntregas(processedData);
                setFilteredData(processedData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro desconhecido');
            } finally {
                setLoading(false);
            }
        };

        fetchEntregas();
    }, []);

    useEffect(() => {
        let filtered = entregas;

        // Filtro por data
        if (dataInicio) {
            const dataInicioTimestamp = new Date(dataInicio).getTime();
            filtered = filtered.filter(e => new Date(e.criado_em).getTime() >= dataInicioTimestamp);
        }

        if (dataFim) {
            const dataFimTimestamp = new Date(dataFim + ' 23:59:59').getTime();
            filtered = filtered.filter(e => new Date(e.criado_em).getTime() <= dataFimTimestamp);
        }

        setFilteredData(filtered);
    }, [entregas, dataInicio, dataFim]);

    const calcularKPIs = () => {
        if (filteredData.length === 0) return { total: 0, mediaCiclo: 0, mediaRota: 0 };

        const total = filteredData.length;

        // Calcula média apenas dos valores válidos (> 0)
        const ciclosValidos = filteredData.filter(e => e.ciclo > 0);
        const rotasValidas = filteredData.filter(e => e.rota > 0);

        const mediaCiclo = ciclosValidos.length > 0
            ? ciclosValidos.reduce((acc, e) => acc + e.ciclo, 0) / ciclosValidos.length
            : 0;

        const mediaRota = rotasValidas.length > 0
            ? rotasValidas.reduce((acc, e) => acc + e.rota, 0) / rotasValidas.length
            : 0;

        return { total, mediaCiclo, mediaRota };
    };

    const calcularMediasPorEtapa = (): [string, number][] => {
        if (filteredData.length === 0) return [];

        const etapas = ['separacao', 'embalagem', 'aguarEntregador', 'aguarRota', 'rota', 'retorno'];
        const nomeEtapas = ['Separação', 'Embalagem', 'Aguar. Entregador', 'Aguar. Rota', 'Rota', 'Retorno'];

        const medias: { [key: string]: number } = {};

        etapas.forEach((etapa, index) => {
            // Filtra apenas valores maiores que 0 para calcular a média real
            const valoresValidos = filteredData
                .map(e => (e as any)[etapa])
                .filter(valor => valor > 0);

            if (valoresValidos.length > 0) {
                const media = valoresValidos.reduce((acc, valor) => acc + valor, 0) / valoresValidos.length;
                medias[nomeEtapas[index]] = media;
            } else {
                medias[nomeEtapas[index]] = 0;
            }
        });

        return Object.entries(medias).sort((a, b) => b[1] - a[1]);
    };

    const calcularMediasPorEntregador = () => {
        if (filteredData.length === 0) return [];

        const entregadores = [...new Set(filteredData.map(e => e.nomeEntregador).filter(e => e !== "Desconhecido"))];

        return entregadores.map(entregador => {
            const entregasDoEntregador = filteredData.filter(e => e.nomeEntregador === entregador);

            // Calcula médias apenas dos valores válidos para cada etapa
            const calcularMediaEtapa = (etapa: keyof EntregaProcessada) => {
                const valoresValidos = entregasDoEntregador
                    .map(e => e[etapa] as number)
                    .filter(valor => valor > 0);

                return valoresValidos.length > 0
                    ? valoresValidos.reduce((acc, valor) => acc + valor, 0) / valoresValidos.length
                    : 0;
            };

            return {
                entregador: entregador.split(' ')[0], // Pega só o primeiro nome
                totalEntregas: entregasDoEntregador.length,
                aguarRota: calcularMediaEtapa('aguarRota'),
                rota: calcularMediaEtapa('rota'),
                retorno: calcularMediaEtapa('retorno'),
                ciclo: calcularMediaEtapa('ciclo')
            };
        });
    };

    const exportarParaExcel = () => {
        const mediasPorEntregadorData = calcularMediasPorEntregador();

        // Prepara dados da tabela de médias por entregador
        const dadosEntregadores = mediasPorEntregadorData.map(entregador => ({
            'Entregador': entregador.entregador,
            'Total de Entregas': entregador.totalEntregas,
            'Aguar. Rota': formatarTempo(entregador.aguarRota),
            'Rota': formatarTempo(entregador.rota),
            'Retorno': formatarTempo(entregador.retorno),
            'Ciclo': formatarTempo(entregador.ciclo)
        }));

        // Prepara dados da tabela detalhada (limitada a 50 registros como na tela)
        const dadosDetalhados = filteredData.slice(0, 50).map(entrega => ({
            'Cliente': entrega.cliente.substring(0, 50),
            'Venda': entrega.venda,
            'Entregador': entrega.nomeEntregador.split(' ')[0],
            'Separação': formatarMinutos(entrega.separacao),
            'Embalagem': formatarMinutos(entrega.embalagem),
            'Aguar. Entregador': formatarMinutos(entrega.aguarEntregador),
            'Aguar. Rota': formatarMinutos(entrega.aguarRota),
            'Rota': formatarMinutos(entrega.rota),
            'Retorno': formatarMinutos(entrega.retorno),
            'Ciclo': formatarMinutos(entrega.ciclo)
        }));

        // Adiciona linha de média geral
        if (filteredData.length > 0) {
            const calcularMediaColuna = (campo: keyof EntregaProcessada) => {
                const valoresValidos = filteredData.filter(e => (e[campo] as number) > 0);
                const media = valoresValidos.length > 0
                    ? valoresValidos.reduce((acc, e) => acc + (e[campo] as number), 0) / valoresValidos.length
                    : 0;
                return formatarMinutos(media);
            };

            dadosDetalhados.push({
                'Cliente': 'MÉDIA GERAL',
                'Venda': '',
                'Entregador': '',
                'Separação': calcularMediaColuna('separacao'),
                'Embalagem': calcularMediaColuna('embalagem'),
                'Aguar. Entregador': calcularMediaColuna('aguarEntregador'),
                'Aguar. Rota': calcularMediaColuna('aguarRota'),
                'Rota': calcularMediaColuna('rota'),
                'Retorno': calcularMediaColuna('retorno'),
                'Ciclo': calcularMediaColuna('ciclo')
            });
        }

        // Cria o workbook
        const workbook = XLSX.utils.book_new();

        // Adiciona planilha de médias por entregador
        const wsEntregadores = XLSX.utils.json_to_sheet(dadosEntregadores);
        XLSX.utils.book_append_sheet(workbook, wsEntregadores, 'Médias por Entregador');

        // Adiciona planilha de dados detalhados
        const wsDetalhados = XLSX.utils.json_to_sheet(dadosDetalhados);
        XLSX.utils.book_append_sheet(workbook, wsDetalhados, 'Dados Detalhados');

        // Gera nome do arquivo com data atual
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
        const nomeArquivo = `entregas_${dataFormatada}.xlsx`;

        // Faz o download
        XLSX.writeFile(workbook, nomeArquivo);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Carregando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500 text-lg">Erro: {error}</div>
            </div>
        );
    }

    const kpis = calcularKPIs();
    const mediasPorEtapa = calcularMediasPorEtapa();
    const mediasPorEntregador = calcularMediasPorEntregador();

    return (
        <div className="mx-auto p-4 md:p-6 2xl:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-title-md2 font-bold text-black dark:text-white">
                    Dashboard de Expedição
                </h2>
                <nav>
                    <ol className="flex items-center gap-2">
                        <li>
                            <a className="font-medium" href="/expedicao/dashboard">Expedição /</a>
                        </li>
                        <li className="font-medium text-primary">Dashboard</li>
                    </ol>
                </nav>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5 mb-6">
                <div className="rounded-xl border border-stroke bg-white p-6 shadow-md dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
                    <div>
                        <h4 className="text-title-md font-bold text-black dark:text-white">
                            {kpis.total}
                        </h4>
                        <span className="text-sm font-medium">Total de Entregas</span>
                    </div>
                    <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                        <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 7H21V21H13V7ZM3 7H11V21H3V7ZM3 3H21V5H3V3Z" fill="" />
                        </svg>
                    </div>
                </div>

                <div className="rounded-xl border border-stroke bg-white p-6 shadow-md dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
                    <div>
                        <h4 className="text-title-md font-bold text-black dark:text-white">
                            {formatarTempo(kpis.mediaCiclo)}
                        </h4>
                        <span className="text-sm font-medium">Tempo Médio de Ciclo</span>
                    </div>
                    <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                        <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.2 16.2L11 13V7H12.5V12.2L17 14.9L16.2 16.2Z" fill="" />
                        </svg>
                    </div>
                </div>

                <div className="rounded-xl border border-stroke bg-white p-6 shadow-md dark:border-strokedark dark:bg-boxdark flex items-center justify-between">
                    <div>
                        <h4 className="text-title-md font-bold text-black dark:text-white">
                            {formatarTempo(kpis.mediaRota)}
                        </h4>
                        <span className="text-sm font-medium">Tempo Médio de Rota</span>
                    </div>
                    <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                        <svg className="fill-primary dark:fill-white" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18ZM14.31 12.9L10.63 15.03L9.87 13.71L12.75 12.05V8.5H14.25V12.9H14.31Z" fill="" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="rounded-xl border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-6">
                <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                    Filtros
                </h4>
                <div className="flex flex-col gap-5.5 sm:flex-row mb-4">
                    <div className="w-full sm:w-1/2">
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                            Data de Início
                        </label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                    </div>
                    <div className="w-full sm:w-1/2">
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                            Data de Fim
                        </label>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-4 mb-4">
                    <button
                        onClick={() => {
                            setDataInicio('');
                            setDataFim('');
                        }}
                        className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-white hover:bg-opacity-90"
                    >
                        Limpar Datas
                    </button>
                    <button
                        onClick={exportarParaExcel}
                        className="flex justify-center rounded bg-success py-2 px-6 font-medium text-white hover:bg-opacity-90"
                    >
                        Exportar Excel
                    </button>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5 mb-6">
                {/* Entregas por Dia */}
                <div className="col-span-12 rounded-xl border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-12">
                    <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
                        Entregas por Dia
                    </h4>
                    <div className="h-80">
                        <Bar
                            data={{
                                labels: entregasPorDia.labels,
                                datasets: [
                                    {
                                        label: 'Entregas',
                                        data: entregasPorDia.values,
                                        backgroundColor: '#3C50E0',
                                        borderRadius: 4,
                                    },
                                ],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                },
                                scales: {
                                    x: {
                                        grid: { display: false },
                                        ticks: { color: '#64748B' }
                                    },
                                    y: {
                                        grid: { color: '#E2E8F0' },
                                        ticks: { color: '#64748B' }
                                    },
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Tempo Médio de Ciclo (Linha) */}
                <div className="col-span-12 rounded-xl border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5">
                    <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
                        Evolução do Tempo de Ciclo (min)
                    </h4>
                    <div className="h-80">
                        <Line
                            data={{
                                labels: cicloPorDia.labels,
                                datasets: [
                                    {
                                        label: 'Tempo Médio',
                                        data: cicloPorDia.values,
                                        borderColor: '#10B981',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        fill: true,
                                        tension: 0.4,
                                    },
                                ],
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: function (context) {
                                                const totalMinutes = context.parsed.y;
                                                if (totalMinutes === null) return '';
                                                const hrs = Math.floor(totalMinutes / 60);
                                                const mins = Math.round(totalMinutes % 60);
                                                const formatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                                                return `Tempo Médio: ${formatted}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: false },
                                        ticks: { color: '#64748B' }
                                    },
                                    y: {
                                        grid: { color: '#E2E8F0' },
                                        ticks: {
                                            color: '#64748B',
                                            callback: function (value) {
                                                const val = Number(value);
                                                const hrs = Math.floor(val / 60);
                                                const mins = Math.round(val % 60);
                                                if (hrs > 0) return `${hrs}h ${mins}m`;
                                                return `${mins}m`;
                                            }
                                        }
                                    },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Gargalos Operacionais */}
            <div className="rounded-xl border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-6">
                <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                    Gargalos Operacionais (Tempo Médio por Etapa)
                </h4>
                <div className="flex flex-col gap-4 mb-6">
                    {mediasPorEtapa.map(([etapa, tempo], index) => (
                        <div key={etapa} className="flex items-center">
                            <div className="w-40 text-sm font-medium text-black dark:text-white">{etapa}:</div>
                            <div className="flex-1 bg-gray-200 dark:bg-meta-4 rounded-full h-4 relative">
                                <div
                                    className="bg-primary h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                    style={{ width: `${mediasPorEtapa.length > 0 ? (tempo / mediasPorEtapa[0][1]) * 100 : 0}%` }}
                                >
                                </div>
                            </div>
                            <div className="w-24 text-right text-sm font-bold text-black dark:text-white ml-4">
                                {formatarTempo(tempo)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabela de Médias por Entregador */}
            <div className="rounded-xl border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1 mb-6">
                <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                    Médias por Entregador
                </h4>
                <div className="max-w-full overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">Entregador</th>
                                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Entregas</th>
                                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Aguar. Rota</th>
                                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Rota</th>
                                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Retorno</th>
                                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Ciclo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mediasPorEntregador.map((entregador, index) => (
                                <tr key={entregador.entregador} className="border-b border-[#eee] dark:border-strokedark">
                                    <td className="py-5 px-4 pl-9 xl:pl-11">
                                        <h5 className="font-medium text-black dark:text-white">{entregador.entregador}</h5>
                                    </td>
                                    <td className="py-5 px-4">
                                        <p className="text-black dark:text-white">{entregador.totalEntregas}</p>
                                    </td>
                                    <td className="py-5 px-4">
                                        <p className="text-black dark:text-white">{formatarTempo(entregador.aguarRota)}</p>
                                    </td>
                                    <td className="py-5 px-4">
                                        <p className="text-black dark:text-white">{formatarTempo(entregador.rota)}</p>
                                    </td>
                                    <td className="py-5 px-4">
                                        <p className="text-black dark:text-white">{formatarTempo(entregador.retorno)}</p>
                                    </td>
                                    <td className="py-5 px-4">
                                        <p className="text-success">{formatarTempo(entregador.ciclo)}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="rounded-xl border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
                <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                    Detalhamento de Entregas
                </h4>
                <div className="max-w-full overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Cliente</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Venda</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Entregador</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Separação</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Embalagem</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Aguar. Entregador</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Aguar. Rota</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Rota</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Retorno</th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">Ciclo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.slice(0, 50).map((entrega) => (
                                <tr key={entrega.id} className="border-b border-[#eee] dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4">
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{entrega.cliente.substring(0, 20)}...</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{entrega.venda}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{entrega.nomeEntregador.split(' ')[0]}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.separacao)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.embalagem)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.aguarEntregador)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.aguarRota)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.rota)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.retorno)}</td>
                                    <td className="py-4 px-4 text-sm text-black dark:text-white">{formatarMinutos(entrega.ciclo)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredData.length > 50 && (
                    <p className="text-sm text-gray-500 mt-4 mb-4">
                        Mostrando 50 de {filteredData.length} registros
                    </p>
                )}
            </div>
        </div>
    );
}
