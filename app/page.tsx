"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'; // ou 'next/router' se for pages/
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Home() {
  const [search, setSearch] = useState('');
  const [itens, setItens] = useState<{ key: any; dados: any }[]>([]);
  const router = useRouter();

  const listarOrcamentos = async () => {
    const db = await initDB();
    const all = await db.getAll('orcamentos');
    return all.map(entry => ({ key: entry.key, dados: entry.dados }));
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
    item.key.toLowerCase().includes(search.toLowerCase()) ||
    (item.dados?.cliente?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const excluirOrcamento = async (key: string) => {
    const db = await initDB();
    await db.delete('orcamentos', key);
    window.location.reload();
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-6 rounded shadow mt-10">
      {/* Barra de Pesquisa e Botão */}
      <div className="flex items-center justify-between mb-4">
        <input
          type="text"
          placeholder="Pesquisar por orçamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        <button
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => router.push('/criarCotacao')}
        >
          Novo
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 text-sm uppercase">
              <th className="py-3 px-6 border-b">Orcamento</th>
              <th className="py-3 px-6 border-b">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItens.length > 0 ? (
              filteredItens.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50">
                  <td className="py-3 px-6 border-b text-black">{item.key}</td>
                  <td className="py-3 px-6 border-b text-black">
                    <div className="flex gap-4">
                        <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => router.push(`/editarCotacao/${item.key}`)}
                            >
                            Editar
                        </button>

                        <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => excluirOrcamento(item.key)}
                            >
                            Excluir
                        </button>

                        <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => router.push(`/gerarCotacao/${item.key}`)}
                            >
                            Gerar Cotação
                        </button>

                        <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => router.push(`/verCotacao/${item.key}`)}
                            >
                            Visualizar Cotação
                        </button>
                    </div>
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500 text-black">
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

