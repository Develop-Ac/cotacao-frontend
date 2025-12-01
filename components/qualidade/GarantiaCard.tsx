'use client';

import { Garantia } from "@/lib/qualidade/types";
import { getStatusDefinition } from "@/lib/qualidade/status";
import { formatDate, relativeTimeFromNow } from "@/lib/qualidade/formatters";
import { StatusChip } from "./StatusChip";
import { IconType } from "react-icons";
import { MdFiberNew, MdReceiptLong, MdShoppingCart, MdConfirmationNumber } from "react-icons/md";

interface Props {
  garantia: Garantia;
  onClick?: (garantia: Garantia) => void;
}

const Tag = ({ icon: Icon, label, value }: { icon: IconType; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-meta-4 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark">
      <Icon size={14} className="text-primary" />
      <span className="text-gray-600 dark:text-gray-400">
        {label}: <span className="font-semibold text-gray-800 dark:text-gray-200">{value}</span>
      </span>
    </span>
  );
};

export const GarantiaCard = ({ garantia, onClick }: Props) => {
  const status = getStatusDefinition(garantia.status);

  return (
    <button
      type="button"
      onClick={() => onClick?.(garantia)}
      className="group w-full text-left bg-white dark:bg-boxdark rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col border border-gray-100 dark:border-strokedark"
    >
      <div className="bg-gray-50 dark:bg-meta-4 p-4 border-b border-gray-100 dark:border-strokedark flex flex-col w-full">
        <div className="flex justify-between items-center w-full mb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
            Fornecedor
          </div>
          {status && <StatusChip label={status.label} color={status.color} background={status.background} />}
        </div>
        <div className="text-lg font-bold text-gray-800 dark:text-white truncate w-full" title={garantia.nomeFornecedor}>
          {garantia.nomeFornecedor}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 w-full">
        <div className="flex flex-wrap gap-2">
          <Tag icon={MdReceiptLong} label="NI" value={garantia.notaInterna} />
          <Tag icon={MdShoppingCart} label="NF" value={garantia.nfsCompra ?? undefined} />
          <Tag icon={MdConfirmationNumber} label="Protocolo" value={garantia.protocoloFornecedor ?? undefined} />
        </div>

        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
            <MdFiberNew size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">Criado em</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{formatDate(garantia.dataCriacao)}</span>
          </div>
          {garantia.temNovaInteracao && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Nova Interação
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
