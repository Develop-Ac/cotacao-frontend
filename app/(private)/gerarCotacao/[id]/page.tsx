"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
    const [dados, setDados] = useState<{
      valor_unitario: string | number | readonly string[] | undefined; cod: string; descricao: string; marca: string; ref_fornecedor: string; unidade: string; quantidade: number; id: number; 
    }[]>([]);

    const [fornecedor, setFornecedor] = useState("")

    const listarOrcamentos = async () => {
      const response = await fetch('http://localhost:8000/cotacoes/' + params.id, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Resposta da API:', data);
      return data;
     
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
        item.cod === cod ? { ...item, valor_unitario: valorFormatado } : item
      );
      setDados(novosDados);
      console.log(novosDados)
    };
  
    useEffect(() => {
      const fetchData = async () => {
        const orcamentos = await listarOrcamentos();
        setDados(orcamentos?.itens ?? []);
        console.log(orcamentos)
      };
      fetchData();
    }, []);
    
    const criarCotacao = async () => {
      const data = {
        id: id,
        fornecedor: fornecedor,
        dados: dados,
        observacao: observacao,
      };

      console.log('Enviando dados:', data);

      fetch('http://localhost:8000/orcamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Erro: ${response.status}`);
          }
          return response.json();
        })
        .then(json => {
          console.log('Resposta da API:', json);
        })
        .catch(error => {
          console.error('Erro ao enviar POST:', error.message);
        });

      await router.push('/')
    }

    const params = useParams();
    const id = params.id;

    const router = useRouter();

    const [observacao, setObservacao] = useState("");

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-black">Nova Cotação</h2>
        <div className="mx-auto p-6 bg-white h-screen">

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
      <div className="overflow-x-auto rounded-2xl shadow-md bg-white border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 text-gray-900 uppercase text-xs font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left">COD</th>
              <th className="px-6 py-4 text-left">Descrição</th>
              <th className="px-6 py-4 text-left">Marca</th>
              <th className="px-6 py-4 text-left">REF Fornecedor</th>
              <th className="px-6 py-4 text-left">Unidade</th>
              <th className="px-6 py-4 text-left">Qtd</th>
              <th className="px-6 py-4 text-left">Valor Unitário</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}
              >
                <td className="px-6 py-4 whitespace-nowrap">{item.cod}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.descricao}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.marca}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.ref_fornecedor}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.unidade}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.quantidade}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="text"
                    value={item.valor_unitario  }
                    onChange={(e) => atualizarValorPorCodigo(String(item.cod), e.target.value)}
                    className="w-28 px-3 py-1 text-sm text-gray-800 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="R$"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>

        <div className="flex gap-2">
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="flex-1 border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="Observação"
          />

          <button
            onClick={() => criarCotacao()}
            className="p-4 rounded-lg text-white font-semibold 
         bg-gradient-to-r from-blue-500 to-purple-600 
         hover:from-blue-600 hover:to-purple-700 
         focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
          >
            Salvar
          </button>
        </div>
      </div>

    </div>
    </>

  );
}
