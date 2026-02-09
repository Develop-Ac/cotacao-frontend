'use client';

import React, { useState, useEffect } from 'react';
import { serviceUrl } from "@/lib/services";

const COMPRAS_API = serviceUrl("compras");
const comprasUrl = (path: string) => `${COMPRAS_API}/compras${path}`;

interface PedidoItem {
  id: string;
  pedido_id: string;
  item_id_origem: string;
  pro_codigo: number;
  pro_descricao: string;
  mar_descricao: string;
  referencia: string;
  unidade: string;
  emissao: string;
  valor_unitario: string;
  custo_fabrica: string;
  preco_custo: string | null;
  for_codigo: number;
  quantidade: string;
  created_at: string;
  MEDIA_MENSAL_12M?: number;
  MEDIA_MENSAL_3M?: number;
  carlos?: boolean;
  renato?: boolean;
}

interface PedidoData {
  id: string;
  pedido_cotacao: number;
  for_codigo: number;
  created_at: string;
  updated_at: string;
  itens: PedidoItem[];
}

export default function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const [pedidoData, setPedidoData] = useState<PedidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkboxStates, setCheckboxStates] = useState<{[key: string]: {Carlos: boolean, Renato: boolean}}>({});

  const updateCheckbox = async (itemId: string, field: 'Carlos' | 'Renato', value: boolean) => {
    // Atualizar estado local primeiro
    setCheckboxStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));

    try {
      // Fazer chamada PUT para a API
      const response = await fetch(`${comprasUrl(`/pedido/autorizacao/${resolvedParams.id}`)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "id": itemId,
          "coluna": field.toLowerCase(), // carlos ou renato em minúsculo
          "check": value
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log(`Checkbox ${field} do item ${itemId} atualizado para ${value}`);
    } catch (error) {
      console.error('Erro ao atualizar checkbox:', error);
      
      // Reverter o estado local em caso de erro
      setCheckboxStates(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: !value // Reverter para o valor anterior
        }
      }));
      
      // Mostrar erro para o usuário (opcional)
      alert('Erro ao salvar alteração. Tente novamente.');
    }
  };

  const     getCheckboxValue = (itemId: string, field: 'Carlos' | 'Renato', defaultValue: boolean) => {
    return checkboxStates[itemId]?.[field] ?? defaultValue;
  };

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${comprasUrl(`/pedido/gerencial/${resolvedParams.id}`)}`);
        
        if (!response.ok) {
          throw new Error(`Erro: ${response.status} ${response.statusText}`);
        }
        
        const data: PedidoData = await response.json();
        setPedidoData(data);
        
        // Inicializar estado dos checkboxes
        const initialCheckboxStates: {[key: string]: {Carlos: boolean, Renato: boolean}} = {};
        data.itens.forEach(item => {
          initialCheckboxStates[item.id] = {
            Carlos: item.carlos || false,
            Renato: item.renato || false
          };
        });
        setCheckboxStates(initialCheckboxStates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchPedido();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Erro:</strong> {error}
        </div>
      </div>
    );
  }

  if (!pedidoData) {
    return (
      <div className="p-8">
        <div className="text-lg">Nenhum dado encontrado.</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Cabeçalho com pedido_cotacao */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Pedido de Cotação: {pedidoData.pedido_cotacao}
        </h1>
        <p className="text-gray-600">Fornecedor: {pedidoData.for_codigo}</p>
      </div>

      {/* Tabela de itens */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Itens do Pedido ({pedidoData.itens.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição do Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Unitário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Média 12M
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Média 3M
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  <input
                    type="checkbox"
                    checked={pedidoData.itens.length > 0 && pedidoData.itens.every(item => getCheckboxValue(item.id, 'Carlos', item.carlos || false))}
                    onChange={e => {
                      const checked = e.target.checked;
                      pedidoData.itens.forEach(item => {
                        if (getCheckboxValue(item.id, 'Carlos', item.carlos || false) !== checked) {
                          updateCheckbox(item.id, 'Carlos', checked);
                        }
                      });
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="text-xs mt-1">Carlos</div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  <input
                    type="checkbox"
                    checked={pedidoData.itens.length > 0 && pedidoData.itens.every(item => getCheckboxValue(item.id, 'Renato', item.renato || false))}
                    onChange={e => {
                      const checked = e.target.checked;
                      pedidoData.itens.forEach(item => {
                        if (getCheckboxValue(item.id, 'Renato', item.renato || false) !== checked) {
                          updateCheckbox(item.id, 'Renato', checked);
                        }
                      });
                    }}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="text-xs mt-1">Renato</div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidoData.itens.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.pro_codigo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.pro_descricao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.mar_descricao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantidade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {parseFloat(item.valor_unitario).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.MEDIA_MENSAL_12M ? item.MEDIA_MENSAL_12M.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.MEDIA_MENSAL_3M ? item.MEDIA_MENSAL_3M.toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input 
                      type="checkbox" 
                      checked={getCheckboxValue(item.id, 'Carlos', item.carlos || false)}
                      onChange={(e) => updateCheckbox(item.id, 'Carlos', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <input 
                      type="checkbox" 
                      checked={getCheckboxValue(item.id, 'Renato', item.renato || false)}
                      onChange={(e) => updateCheckbox(item.id, 'Renato', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
