"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
  const [dados, setDados] = useState([
      { id: 1, cod: "PRD001", descricao: "Produto 1", marca: "Marca A", refFornecedor: "Fornecedor 1", unidade: "Unidade A", quantidade: 10 },
      { id: 2, cod: "PRD002", descricao: "Produto 2", marca: "Marca B", refFornecedor: "Fornecedor 2", unidade: "Unidade B", quantidade: 20 },
      { id: 3, cod: "PRD003", descricao: "Produto 3", marca: "Marca C", refFornecedor: "Fornecedor 3", unidade: "Unidade C", quantidade: 30 },
      { id: 4, cod: "PRD004", descricao: "Produto 4", marca: "Marca D", refFornecedor: "Fornecedor 4", unidade: "Unidade D", quantidade: 40 },
      { id: 5, cod: "PRD005", descricao: "Produto 5", marca: "Marca E", refFornecedor: "Fornecedor 5", unidade: "Unidade E", quantidade: 50 },
      { id: 6, cod: "PRD006", descricao: "Produto 6", marca: "Marca F", refFornecedor: "Fornecedor 6", unidade: "Unidade F", quantidade: 60 },
      { id: 7, cod: "PRD007", descricao: "Produto 7", marca: "Marca G", refFornecedor: "Fornecedor 7", unidade: "Unidade G", quantidade: 70 },
      { id: 8, cod: "PRD008", descricao: "Produto 8", marca: "Marca H", refFornecedor: "Fornecedor 8", unidade: "Unidade H", quantidade: 80 },
      { id: 9, cod: "PRD009", descricao: "Produto 9", marca: "Marca I", refFornecedor: "Fornecedor 9", unidade: "Unidade I", quantidade: 90 },
      { id: 10, cod: "PRD010", descricao: "Produto 10", marca: "Marca J", refFornecedor: "Fornecedor 10", unidade: "Unidade J", quantidade: 100 },
      { id: 11, cod: "PRD011", descricao: "Produto 11", marca: "Marca A", refFornecedor: "Fornecedor 11", unidade: "Unidade A", quantidade: 15 },
      { id: 12, cod: "PRD012", descricao: "Produto 12", marca: "Marca B", refFornecedor: "Fornecedor 12", unidade: "Unidade B", quantidade: 25 },
      { id: 13, cod: "PRD013", descricao: "Produto 13", marca: "Marca C", refFornecedor: "Fornecedor 13", unidade: "Unidade C", quantidade: 35 },
      { id: 14, cod: "PRD014", descricao: "Produto 14", marca: "Marca D", refFornecedor: "Fornecedor 14", unidade: "Unidade D", quantidade: 45 },
      { id: 15, cod: "PRD015", descricao: "Produto 15", marca: "Marca E", refFornecedor: "Fornecedor 15", unidade: "Unidade E", quantidade: 55 },
      { id: 16, cod: "PRD016", descricao: "Produto 16", marca: "Marca F", refFornecedor: "Fornecedor 16", unidade: "Unidade F", quantidade: 65 },
      { id: 17, cod: "PRD017", descricao: "Produto 17", marca: "Marca G", refFornecedor: "Fornecedor 17", unidade: "Unidade G", quantidade: 75 },
      { id: 18, cod: "PRD018", descricao: "Produto 18", marca: "Marca H", refFornecedor: "Fornecedor 18", unidade: "Unidade H", quantidade: 85 },
      { id: 19, cod: "PRD019", descricao: "Produto 19", marca: "Marca I", refFornecedor: "Fornecedor 19", unidade: "Unidade I", quantidade: 95 },
      { id: 20, cod: "PRD020", descricao: "Produto 20", marca: "Marca J", refFornecedor: "Fornecedor 20", unidade: "Unidade J", quantidade: 105 },
  ]);

  const excluirOrcamento = (cod: string) => {
      setDados((prev) => prev.filter((item) => item.cod !== cod));
  };

  const router = useRouter();

  const criarOrcamento = async () => {
      const db = await initDB();
      
      await db.put('orcamentos', { key: orcamento.nome , dados });
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

  const [orcamento, setOrcamento] = useState({ nome: "" });

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white h-screen">
      <h2 className="text-2xl font-bold mb-6 text-black">Nova Cotação</h2>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ORÇAMENTO DE COMPRA:</label>
            <input
              type="text"
              name="nome"
              value={orcamento.nome}
              onChange={(e) => setOrcamento({ ...orcamento, nome: e.target.value })}
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
