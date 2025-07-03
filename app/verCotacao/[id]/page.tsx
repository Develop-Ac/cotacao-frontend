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
    const db = await initDB();
    const all = await db.getAll('cotacao');
    return all.map(entry => ({ key: entry.key, dados: entry.dados }));
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

  const [valores, setValores] = useState<{ key: any; dados: any }[]>([])

  function marcarMenorValorPorIndice(dados: string | any[]) {
    if (!Array.isArray(dados) || dados.length === 0) return [];

    // Faz uma cópia profunda para evitar mutações no original
    const novaLista = JSON.parse(JSON.stringify(dados));

    const totalItens = novaLista[0].dados.itens.length;

    for (let i = 0; i < totalItens; i++) {
      let menor = Infinity;

      // Encontrar o menor valor do índice i
      novaLista.forEach((obj: { dados: { itens: any[]; }; }) => {
      const item = obj.dados.itens[i];
      const valorNumerico = parseFloat(item.valor.replace('.', '').replace(',', '.'));
      if (valorNumerico < menor) {
          menor = valorNumerico;
      }
      });

      // Marcar menorValor = true/false para cada item
      novaLista.forEach((obj: { dados: { itens: any[]; }; }) => {
      const item = obj.dados.itens[i];
      const valorNumerico = parseFloat(item.valor.replace('.', '').replace(',', '.'));
      item.menorValor = valorNumerico === menor;
      });
    }

    return novaLista;
  }

  useEffect(() => {
    const fetchData = async () => {
      const orcamentos = await listarcotacoes();
      let resultado = orcamentos.filter(item => item.dados.orcamento === id);
      setValores(resultado);
      
      setValores(marcarMenorValorPorIndice(resultado));  
    };
    fetchData();
  }, []);

  const params = useParams();
  const id = params.id;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white h-screen">
      <h2 className="text-2xl font-bold mb-6 text-black">Visualizar Cotações</h2>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ORÇAMENTO DE COMPRA:</label>
            <input
              type="text"
              name="nome"
              value={id}
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
                <div className="overflow-x-auto bg-white shadow rounded">
                    <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                            <th className="py-3 px-4 border-b text-black">Descrição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {valores?.[0]?.dados?.itens?.map((item: { descricao: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, idx: Key | null | undefined) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b text-black">{item.descricao}</td>

                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {valores.map((item, index) => (
                <div key={index} className="min-w-[500px] bg-white p-4 shadow rounded border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">FORNECEDOR:</label>
                <input
                    type="text"
                    name="nome"
                    value={item.dados.fornecedor}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                />

                <div className="flex justify-between items-center my-4">
                    <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
                </div>

                <div className="overflow-x-auto bg-white shadow rounded">
                    <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-100 text-left">
                        <tr>
                        {/* <th className="py-3 px-4 border-b text-black">Descrição</th> */}
                        <th className="py-3 px-4 border-b text-black">Valor Unitário</th>
                        <th className="py-3 px-4 border-b text-black">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {item.dados.itens.map((item: {
                            menorValor: any; descricao: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; valor: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; quantidade: any; 
                            }, idx: Key | null | undefined) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            {/* <td className="py-3 px-4 border-b text-black">{item.descricao}</td> */}
                            <td className="py-3 px-4 border-b text-black">{Number((item.valor ?? '0').toString().replace(',', '.')).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                })}</td>
                            <td className={`py-3 px-4 border-b ${
                                item.menorValor ? 'text-green-600' : 'text-red-600'
                            }`}>{item.menorValor}
                            {(() => {
                                const quantidade = Number(item.quantidade ?? 0);
                                const valor =
                                typeof item.valor === 'string'
                                    ? Number(item.valor.replace(',', '.'))
                                    : typeof item.valor === 'number' || typeof item.valor === 'bigint'
                                    ? Number(item.valor)
                                    : 0;

                                const total = valor * quantidade;
                                return total.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                });
                            })()}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>

                    <p className="text-black text-right my-3">
                    Valor Total:{' '}
                    {item.dados.itens
                        .reduce((acc: number, item: { quantidade: any; valor: string; }) => {
                        const quantidade = Number(item.quantidade ?? 0);
                        const valor =
                            typeof item.valor === 'string'
                            ? Number(item.valor.replace(',', '.'))
                            : typeof item.valor === 'number' || typeof item.valor === 'bigint'
                            ? Number(item.valor)
                            : 0;
                        return acc + valor * quantidade;
                        }, 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 mt-2">Observação</label>
                <input
                    type="text"
                    value={item.dados.observacao}
                    className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mt-1"
                    placeholder="Observação"
                />
                </div>
            ))}
                </div>
              </div>
            </div>
          </div>

  );
}
