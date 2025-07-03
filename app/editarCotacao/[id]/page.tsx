"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
    const [dados, setDados] = useState<{ cod: string; descricao: string; marca: string; refFornecedor: string; unidade: string; quantidade: number; id: number; }[]>([]);

    const listarOrcamentos = async () => {
      const db = await initDB();
      const all = await db.getAll('orcamentos');
      return all.map(entry => ({ key: entry.key, dados: entry.dados }));
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

    const excluirOrcamento = (cod: string) => {
        setDados((prev) => prev.filter((item) => item.cod !== cod));
    };

    const params = useParams();
    const id = params.id;

    const router = useRouter();

    const criarOrcamento = async () => {
        const db = await initDB();

        if (id) {
          await db.delete('orcamentos', id);
        } else {
          console.error("ID is undefined, cannot delete from 'orcamentos'");
        }
        
        await db.put('orcamentos', { key: id , dados });
       await router.push('/')
    }

    const [form, setForm] = useState({
      cod: "",
      descricao: "",
      marca: "",
      refFornecedor: "",
      unidade: "",
      quantidade: 0,
    });

    const [showModal, setShowModal] = useState(false);

    const handleChange = (e: { target: { name: any; value: any; }; }) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCreate = () => {
      const novoItem = {
        id: Date.now(),
        ...form,
      };
      setDados((prev) => [...prev, novoItem]);
      setForm({
        cod: "",
        descricao: "",
        marca: "",
        refFornecedor: "",
        unidade: "",
        quantidade: 0,
      });
      setShowModal(false);
    };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white h-screen">
      <h2 className="text-2xl font-bold mb-6 text-black">Editar Cotação</h2>

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
          </div>
        </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo
        </button>
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
              <th className="py-3 px-4 border-b text-black">Ação</th>
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
                <td className="py-3 px-4 border-b text-black">
                <button
                    onClick={() => excluirOrcamento(item.cod)}
                    className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                    Excluir
                </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-lg">
            <h2 className="text-lg font-bold mb-4 text-black">Adicionar Produto</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">COD</label>
                <input
                  type="text"
                  name="cod"
                  value={form.cod}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Marca</label>
                <input
                  type="text"
                  name="marca"
                  value={form.marca}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">REF Fornecedor</label>
                <input
                  type="text"
                  name="refFornecedor"
                  value={form.refFornecedor}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Unidade</label>
                <input
                  type="text"
                  name="unidade"
                  value={form.unidade}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quantidade</label>
                <input
                  type="number"
                  name="quantidade"
                  value={form.quantidade}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-black"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
        <button
          onClick={() => criarOrcamento()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Salvar
        </button>
    </div>
  );
}
