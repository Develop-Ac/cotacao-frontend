"use client";

import { useEffect, useState } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db'; // ou o caminho correto

export default function Formulario() {
    const [dados, setDados] = useState<{ cod: string; descricao: string; marca: string; ref_fornecedor: string; unidade: string; quantidade: number; id: number; }[]>([]);
    const [orcamento, setOrcamento] = useState("");
    const listarOrcamentos = async () => {
    try {
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
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
      return null;
    }
    };
  
    useEffect(() => {
      const fetchData = async () => {
        const orcamentos = await listarOrcamentos();
        const resultado = orcamentos.itens
        setDados(resultado ?? []);
        setOrcamento(orcamentos.orcamento_compra);
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
      try {
        // 1. Primeiro, obter o cookie CSRF do Laravel
        // await fetch('http://localhost:8000/sanctum/csrf-cookie', {
        //   credentials: 'include',
        // });

        // 2. Enviar o PUT com os dados
        const response = await fetch(`http://localhost:8000/cotacoes/${id}`, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include', // necessário para enviar os cookies (XSRF-TOKEN)
          body: JSON.stringify({ key: orcamento, dados: dados }),
        });

        if (!response.ok) {
          throw new Error(`Erro ao atualizar: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Cotação atualizada com sucesso:', data);
        await router.push('/')
      } catch (error) {
        console.error('Erro ao atualizar cotação:', error);
        await router.push('/')
      }
       
    }

    const [form, setForm] = useState({
      cod: "",
      descricao: "",
      marca: "",
      ref_fornecedor: "",
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
        ref_fornecedor: "",
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
              value={orcamento}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
        </div>

      <div className="flex justify-between items-center mb-4 mt-3">
        <h1 className="text-xl font-semibold text-black">Lista de Produtos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo
        </button>
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
              <th className="px-6 py-4 text-left">Ação</th>
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
                  <button
                    onClick={() => excluirOrcamento(item.cod)}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 rounded-full shadow transition"
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
                  value={form.ref_fornecedor}
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
      <div className="flex justify-end mt-4">
        <button
          onClick={() => criarOrcamento()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
