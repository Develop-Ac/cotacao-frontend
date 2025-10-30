"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'; // ou 'next/router' se for pages/
import { initDB } from '@/lib/db'; // ou o caminho correto
import axios from 'axios';

export default function Home() {
  const [search, setSearch] = useState('');
  const [itens, setItens] = useState<{ id: any; orcamento_compra: any }[]>([]);
  const router = useRouter();

  // 🎯 NOVO CÓDIGO AQUI: Redireciona imediatamente ao carregar
  useEffect(() => {
    // Redireciona para a página de Check List
    router.replace('/oficina/checkList'); 
    // Usamos 'replace' para que a página atual não fique no histórico do navegador.
  }, [router]); // O array de dependências vazio garante que só roda na montagem

  const listarOrcamentos = async () => {
    // const db = await initDB();
    // const all = await db.getAll('orcamentos');
  

    try {
      const response = await fetch('http://localhost:8000/cotacoes', {
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
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const orcamentos = await listarOrcamentos();
      setItens(orcamentos);
    };
    fetchData();
  }, []);

  // Filtro pelos campos "key" ou "dados.cliente"
  const filteredItens = itens.filter(item =>
    (item.orcamento_compra.toLowerCase() || "").includes(search.toLowerCase())
  );

  function getCookie(name: string): string | undefined {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const part = parts.pop();
      if (part) {
        return part.split(';').shift();
      }
    }
    return undefined;
  }

  const excluirOrcamento = async (id: string) => {
    // const db = await initDB();
    // await db.delete('orcamentos', key);

    // await fetch('http://localhost:8000/sanctum/csrf-cookie', {
    //   credentials: 'include',
    // });

    const csrfToken = getCookie('XSRF-TOKEN');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }

    await fetch('${(process.env as any).URL_API || process.env.NEXT_PUBLIC_URL_API}/cotacoes/' + id, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });

    window.location.reload();
  };

  return (
    <div className=" mx-auto bg-white p-6 rounded shadow mt-10">
      {/* Barra de Pesquisa e Botão */}
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Pesquisar por orçamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        {/* <button
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => router.push('/criarCotacao')}
        >
          Novo
        </button> */}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-2xl shadow-md bg-white border border-gray-200">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100 text-gray-900 uppercase text-xs font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left">Orçamento</th>
              <th className="px-6 py-4 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItens.length > 0 ? (
              filteredItens.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-black">{item.orcamento_compra}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {/* <button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-full shadow transition"
                        onClick={() => router.push(`/editarCotacao/${item.id}`)}
                      >
                        Editar
                      </button>

                      <button
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded-full shadow transition"
                        onClick={() => excluirOrcamento(item.id)}
                      >
                        Excluir
                      </button> */}

                      <button
                        className="p-2 rounded-lg text-white font-semibold 
         bg-gradient-to-r from-blue-500 to-purple-600 
         hover:from-blue-600 hover:to-purple-700 
         focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                        onClick={() => router.push(`/gerarCotacao/${item.id}`)}
                      >
                        Gerar Cotação
                      </button>

                      <button
                        className="p-2 rounded-lg text-white font-semibold 
         bg-gradient-to-r from-blue-500 to-purple-600 
         hover:from-blue-600 hover:to-purple-700 
         focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                        onClick={() => router.push(`/verCotacao/${item.id}`)}
                      >
                        Visualizar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-center px-6 py-6 text-gray-500">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

