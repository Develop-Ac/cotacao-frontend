'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { serviceUrl } from '@/lib/services';

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
};

export default function EntregasPage() {
    const [entregas, setEntregas] = useState<EntregaProcessada[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filteredData, setFilteredData] = useState<EntregaProcessada[]>([]);
    const [dataInicio, setDataInicio] = useState<string>('');
    const [dataFim, setDataFim] = useState<string>('');

    const calcularDuracao = (inicio: string, fim: string): number => {
        if (!inicio || !fim || inicio === '' || fim === '') return 0;
        
        const dataInicio = new Date(inicio);
        const dataFim = new Date(fim);
        
        // Verifica se as datas são válidas
        if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) return 0;
        
        const duracao = (dataFim.getTime() - dataInicio.getTime()) / 1000; // retorna em segundos
        return duracao > 0 ? duracao : 0; // garante que não retorne valores negativos
    };

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
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">📦 Dashboard de Análise de Eficiência Logística</h1>
            
            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">Filtros</h2>
                
                {/* Filtro de Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium mb-2">Data de Início:</label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Data de Fim:</label>
                        <input
                            type="date"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                
                {/* Botão para limpar filtros */}
                <div className="mt-4 flex gap-2">
                    <button
                        onClick={() => {
                            setDataInicio('');
                            setDataFim('');
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Limpar Datas
                    </button>
                    <button
                        onClick={exportarParaExcel}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        📊 Exportar Excel
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{kpis.total}</div>
                    <div className="text-sm text-gray-600">📦 Total de Entregas Filtradas</div>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatarTempo(kpis.mediaCiclo)}</div>
                    <div className="text-sm text-gray-600">⏱️ Tempo Médio de Ciclo Total</div>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{formatarTempo(kpis.mediaRota)}</div>
                    <div className="text-sm text-gray-600">🚀 Tempo Médio de Rota</div>
                </div>
            </div>

            {/* Gráfico de Gargalos */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">Tempo Médio por Etapa (Gargalos Operacionais)</h2>
                <div className="space-y-2">
                    {mediasPorEtapa.map(([etapa, tempo], index) => (
                        <div key={etapa} className="flex items-center">
                            <div className="w-32 text-sm font-medium">{etapa}:</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                <div 
                                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${mediasPorEtapa.length > 0 ? (tempo / mediasPorEtapa[0][1]) * 100 : 0}%` }}
                                >
                                    <span className="text-white text-xs font-bold">{formatarTempo(tempo)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabela de Médias por Entregador */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">📊 Médias por Entregador</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left font-semibold">Entregador</th>
                                <th className="px-4 py-3 text-left font-semibold">Entregas</th>
                                <th className="px-4 py-3 text-left font-semibold">Aguar. Rota</th>
                                <th className="px-4 py-3 text-left font-semibold">Rota</th>
                                <th className="px-4 py-3 text-left font-semibold">Retorno</th>
                                <th className="px-4 py-3 text-left font-semibold">Ciclo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mediasPorEntregador.map((entregador, index) => (
                                <tr key={entregador.entregador} className={`border-t ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <td className="px-4 py-3 font-medium">{entregador.entregador}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{entregador.totalEntregas}</td>
                                    <td className="px-4 py-3">{formatarTempo(entregador.aguarRota)}</td>
                                    <td className="px-4 py-3">{formatarTempo(entregador.rota)}</td>
                                    <td className="px-4 py-3">{formatarTempo(entregador.retorno)}</td>
                                    <td className="px-4 py-3 font-semibold text-green-600">{formatarTempo(entregador.ciclo)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Tabela de Dados de Eficiência (Tempos em Minutos)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-2 text-left">Cliente</th>
                                <th className="px-4 py-2 text-left">Venda</th>
                                <th className="px-4 py-2 text-left">Entregador</th>
                                <th className="px-4 py-2 text-left">Separação</th>
                                <th className="px-4 py-2 text-left">Embalagem</th>
                                <th className="px-4 py-2 text-left">Aguar. Entregador</th>
                                <th className="px-4 py-2 text-left">Aguar. Rota</th>
                                <th className="px-4 py-2 text-left">Rota</th>
                                <th className="px-4 py-2 text-left">Retorno</th>
                                <th className="px-4 py-2 text-left">Ciclo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.slice(0, 50).map((entrega) => (
                                <tr key={entrega.id} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-2">{entrega.cliente.substring(0, 36)}</td>
                                    <td className="px-4 py-2">{entrega.venda}</td>
                                    <td className="px-4 py-2">{entrega.nomeEntregador.split(' ')[0]}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.separacao)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.embalagem)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.aguarEntregador)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.aguarRota)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.rota)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.retorno)}</td>
                                    <td className="px-4 py-2">{formatarMinutos(entrega.ciclo)}</td>
                                </tr>
                            ))}
                            {/* Linha de Totais/Médias */}
                            {filteredData.length > 0 && (
                                <tr className="border-t-2 border-gray-400 bg-blue-50 font-semibold">
                                    <td className="px-4 py-3 text-blue-700">MÉDIA GERAL</td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3"></td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.separacao > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.separacao, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.embalagem > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.embalagem, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.aguarEntregador > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.aguarEntregador, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.aguarRota > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.aguarRota, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.rota > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.rota, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.retorno > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.retorno, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-blue-700">
                                        {(() => {
                                            const valoresValidos = filteredData.filter(e => e.ciclo > 0);
                                            const media = valoresValidos.length > 0 
                                                ? valoresValidos.reduce((acc, e) => acc + e.ciclo, 0) / valoresValidos.length 
                                                : 0;
                                            return formatarMinutos(media);
                                        })()}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredData.length > 50 && (
                    <p className="text-sm text-gray-600 mt-2">
                        Mostrando 50 de {filteredData.length} registros
                    </p>
                )}
            </div>
        </div>
    );
}
