"use client";

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
  const [dados, setDados] = useState<{
    valor: string | number | readonly string[] | undefined; cod: string; descricao: string; marca: string; refFornecedor: string; unidade: string; quantidade: number; id: number; 
  }[]>([]);

  const [fornecedor, setFornecedor] = useState("")

  const listarcotacoes = async () => {
    try {
      const response = await fetch(`http://localhost:8000/orcamento/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar orçamento: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dados do orçamento:', data);
      return data;
    } catch (error) {
      console.error('Erro');
      return null;
    }
  };

  const formatarValor = (valor: string) => {
    // Remove tudo que não for dígito
    const apenasNumeros = valor.replace(/\D/g, "");
  
    // Formata para "99,99"
    const comVirgula = (Number(apenasNumeros) / 100).toFixed(2).replace('.', ',');
  
    return comVirgula;
  };

  const atualizarValorPorCodigo = (cod: string, novoValor: any) => {
    const valorFormatado = formatarValor(novoValor);
    const novosDados = dados.map(item =>
      item.cod === cod ? { ...item, valor: valorFormatado } : item
    );
    setDados(novosDados);
    console.log(novosDados)
  };

  type Item = {
    selecionado?: boolean | undefined;
    id?: number;
    orcamento_id: number;
    cotacao_id?: number;
    descricao?: string;
    fornecedor?: string;
    observacao?: string;
    quantidade?: number;
    valor_unitario?: string | number | bigint;
    created_at?: string;
    updated_at?: string;
    menor_valor?: boolean;
    
  };

  function escolherItens() {
    const selecionados = Object.values(valores)
      .flatMap((lista) => lista)
      .filter((item) => item.selecionado === true);

    selecionados.forEach(async (item) => {
      try {
        const response = await fetch(`http://localhost:8000/orcamento/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // 'X-CSRF-TOKEN': csrfToken, // inclua se necessário
          },
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          console.error(`Erro ao atualizar item ID ${item.id}:`, response.statusText);
        } else {
          console.log(`Item ID ${item.id} atualizado com sucesso`);
        }
      } catch (error) {
        console.error(`Erro de conexão ao atualizar item ID ${item.id}:`, error);
      }
    });

  }


  const [valores, setValores] = useState<Record<number, Item[]>>({});  

  const [orcamento, setOrcamento] = useState('');

  function marcarMenorValor(data: Record<number, any[]>): Record<number, any[]> {
    const grupos = Object.values(data); // todos os arrays de itens
    const resultado: Record<number, any[]> = {};

    // Pega todos os índices possíveis (posição 0, 1, 2...)
    const totalItensPorGrupo = grupos[0].length;

    // Para cada posição i (produto 0, 1, 2...)
    for (let i = 0; i < totalItensPorGrupo; i++) {
      // Coleta os itens i de todos os grupos
      const itensNaPosicaoI = Object.entries(data).map(([orcamentoId, itens]) => ({
        orcamentoId,
        item: itens[i],
      }));

      // Acha o menor valor_unitario nessa posição i
      const menorValor = Math.min(
        ...itensNaPosicaoI.map(({ item }) => Number(item.valor_unitario))
      );

      // Marca os itens com base no menor valor
      itensNaPosicaoI.forEach(({ orcamentoId, item }) => {
        item.menor_valor = Number(item.valor_unitario) === menorValor;
      });
    }

    return data;
  }


  useEffect(() => {
    const fetchData = async () => {
      const orcamentos = await listarcotacoes();

      setOrcamento(orcamentos.orcamento_compra)

      console.log(orcamentos)

      const agrupado = new Map<number, Item[]>();

      orcamentos.orcamentos.forEach((item: { orcamento_id: any; id?: number; cotacao_id?: number; descricao?: string; fornecedor?: string; observacao?: string; quantidade?: number; valor_unitario?: number; created_at?: string; updated_at?: string; selecionado?: boolean }) => {
        const grupo = agrupado.get(item.orcamento_id) ?? [];
        grupo.push(item);
        agrupado.set(item.orcamento_id, grupo);
      });

      const resultadoComoObjeto: Record<number, Item[]> = Object.fromEntries(agrupado);
      
      setValores(resultadoComoObjeto);

      console.log(marcarMenorValor(resultadoComoObjeto))
      
      // setValores(marcarMenorValorPorIndice(resultado));  
    };
    fetchData();
  }, []);

  const params = useParams();
  const id = params.id;

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-black">Visualizar Cotações</h2>
        <div className="mx-auto p-6 bg-white h-screen">

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ORÇAMENTO DE COMPRA:</label>
            <input
              type="text"
              name="nome"
              value={orcamento}
              readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
            <div className="flex overflow-x-auto gap-4">
            <div>

                <div style={{ height: "80px", width: "200px" }}></div>


                <div className="flex justify-between items-center my-4">
                    <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
                </div>
                <div className="overflow-x-auto rounded-2xl shadow-md bg-white border border-gray-200">
                  <table className="min-w-full text-sm text-gray-700">
                    <thead className="bg-gray-100 text-gray-900 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4 text-left">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(valores)[0]?.map((item,idx) => (
                        <tr
                          key={idx}
                          className={typeof idx === 'number'
                            ? idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-gray-50 hover:bg-gray-100'
                            : ''}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">{item.descricao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

            </div>

            {Object.entries(valores).map(([orcamentoId, itens]) => (
              <div key={orcamentoId} className="min-w-[500px] bg-white p-4 shadow rounded border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">FORNECEDOR:</label>
                <input
                  type="text"
                  name="nome"
                  value={itens[0]?.fornecedor ?? ''}
                  className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />

                <div className="flex justify-between items-center my-4">
                  <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
                </div>

                <div className="overflow-x-auto rounded-2xl shadow-md bg-white border border-gray-200">
                  <table className="min-w-full text-sm text-gray-700">
                    <thead className="bg-gray-100 text-gray-900 uppercase text-xs font-semibold">
                      <tr>
                        {/* <th className="px-6 py-4 text-left">Descrição</th> */}
                        <th className="px-6 py-4 text-left">Valor Unitário</th>
                        <th className="px-6 py-4 text-left">Valor Total</th>
                        {/* <th className="px-6 py-4 text-left">Selecionar</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, idx: number) => {
                        const quantidade = Number(item.quantidade ?? 0);
                        const valor =
                          typeof item.valor_unitario === 'string'
                            ? Number(item.valor_unitario.replace(',', '.'))
                            : typeof item.valor_unitario === 'number' || typeof item.valor_unitario === 'bigint'
                            ? Number(item.valor_unitario)
                            : 0;
                        const total = valor * quantidade;

                        return (
                          <tr
                            key={idx}
                            className={
                              typeof idx === 'number'
                                ? idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-gray-50 hover:bg-gray-100'
                                : ''
                            }
                          >
                            {/* <td className="px-6 py-4">{item.descricao}</td> */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap font-medium 
                                ${
                                item.menor_valor ? 'text-green-600' : 'text-red-600'}`
                                }
                            >
                              {total.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                            {/* <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={item.selecionado}
                                onChange={() => {
                                  const novosDados = itens.map((i) =>
                                    i.id === item.id ? { ...i, selecionado: !i.selecionado } : i
                                  );
                                  setValores((prev) => ({
                                    ...prev,
                                    [orcamentoId]: novosDados,
                                  }));}} 
                                className="form-checkbox h-3 w-3 text-blue-600"
                              />
                            </td> */}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>


                </div>                 
                                  
                <p className="text-sm text-black text-right font-semibold px-6 py-4">
                    Valor Total:{' '}
                    {itens.reduce((acc: number, item) => {
                        const quantidade = Number(item.quantidade ?? 0);
                        const valor =
                          typeof item.valor_unitario === 'string'
                            ? Number(item.valor_unitario.replace(',', '.'))
                            : typeof item.valor_unitario === 'number' || typeof item.valor_unitario === 'bigint'
                            ? Number(item.valor_unitario)
                            : 0;
                        return acc + valor * quantidade;
                      }, 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p> 
                                
                <label className="block text-sm font-medium text-gray-700 mt-2">Observação</label>
                <input
                    type="text"
                    value={itens[0]?.observacao ?? ''}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mt-1"
                    placeholder="Observação"
                />
                </div>
            ))}

                </div>
              </div>
            </div>

          </div>
    </>


  );
}
