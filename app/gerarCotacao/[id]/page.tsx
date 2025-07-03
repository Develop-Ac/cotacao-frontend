"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
    const [dados, setDados] = useState<{
      valor: string | number | readonly string[] | undefined; cod: string; descricao: string; marca: string; refFornecedor: string; unidade: string; quantidade: number; id: number; 
    }[]>([]);

    const [fornecedor, setFornecedor] = useState("")

    const listarOrcamentos = async () => {
      const db = await initDB();
      const all = await db.getAll('orcamentos');
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
  
    useEffect(() => {
      const fetchData = async () => {
        const orcamentos = await listarOrcamentos();
        const resultado = orcamentos.find(item => item.key === id);
        setDados(resultado?.dados ?? []);
        console.log(resultado)
      };
      fetchData();
    }, []);
    
    const criarCotacao = async () => {
      const db = await initDB();

      const cotacao = {
        orcamento: id,
        fornecedor: fornecedor,
        itens: dados,
        observacao: observacao,
      };

      await db.put('cotacao', { key: Math.floor((Date.now() * Math.random()) % 10000), dados: cotacao });
      await router.push('/')
    }

    const params = useParams();
    const id = params.id;

    const router = useRouter();

    const [observacao, setObservacao] = useState("");

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white h-screen">
      <h2 className="text-2xl font-bold mb-6 text-black">Nova Cotação</h2>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ORÇAMENTO DE COMPRA:</label>
            <input
              type="text"
              name="nome"
              value={id}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">FORNECEDOR:</label>
            <input
              type="text"
              name="nome"
              value={fornecedor}
              onChange={(e) => setFornecedor( e.target.value )}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
        </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="py-3 px-4 border-b text-black">COD</th>
              <th className="py-3 px-4 border-b text-black">Descrição</th>
              <th className="py-3 px-4 border-b text-black">Marca</th>
              <th className="py-3 px-4 border-b text-black">REF Fornecedor</th>
              <th className="py-3 px-4 border-b text-black">Unidade</th>
              <th className="py-3 px-4 border-b text-black">Qtd</th>
              <th className="py-3 px-4 border-b text-black">Valor Unitario</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b text-black">{item.cod}</td>
                <td className="py-3 px-4 border-b text-black">{item.descricao}</td>
                <td className="py-3 px-4 border-b text-black">{item.marca}</td>
                <td className="py-3 px-4 border-b text-black">{item.refFornecedor}</td>
                <td className="py-3 px-4 border-b text-black">{item.unidade}</td>
                <td className="py-3 px-4 border-b text-black">{item.quantidade}</td>
                <input
                    type="text"
                    value={item.valor}
                    onChange={(e) => { atualizarValorPorCodigo(String(item.cod), e.target.value) }}
                    className="text-black px-3 py-1 rounded"
                    />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="block text-sm font-medium text-gray-700 mt-2">Observação</label>
      <input
        type="text"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black mt-1"
        placeholder="Observação"
      />

        <button
          onClick={() => criarCotacao()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Salvar
        </button>
    </div>
  );
}
