import React from "react";

import { useState, useEffect } from "react";
import { serviceUrl } from "@/lib/services";

const baseUrl = serviceUrl("compras");

interface CotacaoModalProps {
  open: boolean;
  onClose: () => void;
  items: Array<{ pro_codigo: string; pro_descricao: string; simulacao?: string | null; referencia?: string | null }>;
  coverageDays?: number | "";
}

interface QuantidadeState {
  [pro_codigo: string]: string;
}

const CotacaoModal: React.FC<CotacaoModalProps> = ({ open, onClose, items, coverageDays }) => {
  const [quantidades, setQuantidades] = useState<QuantidadeState>({});
  const [proximoIndice, setProximoIndice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (open) {
      fetch(`${baseUrl}/pedidos-cotacao/proximo-indice`)
        .then(res => res.json())
        .then(data => setProximoIndice(data.proximoIndice))
        .catch(() => setProximoIndice(null));
    }
  }, [open]);

  const handleInputChange = (pro_codigo: string, value: string) => {
    setQuantidades(prev => ({ ...prev, [pro_codigo]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const itensCotacao = items.map(it => {
        // Extrai o maior valor da simulação para QTD_SUGERIDA
        let qtdSugerida = 0;
        if (it.simulacao) {
          const match = it.simulacao.match(/(\d+)\s*-\s*(\d+)/);
          if (match) {
            qtdSugerida = Number(match[2]);
          }
        }
        return {
          PEDIDO_COTACAO: proximoIndice,
          EMISSAO: null,
          PRO_CODIGO: it.pro_codigo,
          PRO_DESCRICAO: it.pro_descricao,
          MAR_DESCRICAO: null,
          REFERENCIA: it.referencia || null,
          UNIDADE: null,
          QUANTIDADE: Number(quantidades[it.pro_codigo] || 0),
          QTD_SUGERIDA: qtdSugerida,
          DT_ULTIMA_COMPRA: null,
        };
      });

      const payload = {
        empresa: 3,
        pedido_cotacao: proximoIndice,
        itens: itensCotacao,
      };

      const res = await fetch("http://localhost:8000/compras/pedidos-cotacao", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao enviar cotação");
      setSuccessMsg("Cotação enviada com sucesso!");
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao enviar cotação");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-boxdark rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-strokedark">
        <div className="p-6 border-b border-gray-100 dark:border-strokedark flex justify-between items-center bg-gray-50 dark:bg-meta-4/50">
          <h3 className="text-lg font-bold text-black dark:text-white">Itens Selecionados para Cotação</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {proximoIndice !== null && (
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              <b>Pedido Cotação:</b> <span className="font-mono text-primary">I-{proximoIndice}</span>
            </div>
          )}
          {items.length === 0 ? (
            <div className="text-gray-500 text-center">Nenhum item selecionado.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-strokedark">
              {items.map((item) => (
                <li key={item.pro_codigo} className="py-2 flex flex-col gap-1">
                  <span className="font-mono font-bold text-primary">{item.pro_codigo}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.pro_descricao}</span>
                  <span className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Simulação ({coverageDays}d): <b>{item.simulacao ?? "-"}</b>
                  </span>
                  <input
                    type="number"
                    min="0"
                    className="mt-2 px-2 py-1 border rounded text-sm w-32"
                    placeholder="Quantidade"
                    value={quantidades[item.pro_codigo] || ""}
                    onChange={e => handleInputChange(item.pro_codigo, e.target.value)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-strokedark bg-gray-50 dark:bg-meta-4/50 flex flex-col gap-2">
          {errorMsg && <div className="text-red-600 text-sm mb-2">{errorMsg}</div>}
          {successMsg && <div className="text-green-600 text-sm mb-2">{successMsg}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors text-black dark:text-white">Fechar</button>
            <button
              onClick={handleSubmit}
              disabled={loading || proximoIndice === null || items.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
            >
              {loading ? "Enviando..." : "Enviar Cotação"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CotacaoModal;
