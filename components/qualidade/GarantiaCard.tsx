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
    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      <Icon size={14} className="text-[var(--primary-600)]" />
      <span className="text-slate-500">
        {label}: <span className="font-semibold text-slate-700">{value}</span>
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
      className="keep-color w-full text-left rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition duration-200 transform active:scale-[0.99]"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="flex-1">
          <p className="text-lg font-bold text-slate-900">{garantia.nomeFornecedor}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Tag icon={MdReceiptLong} label="NI" value={garantia.notaInterna} />
            <Tag icon={MdShoppingCart} label="NF" value={garantia.nfsCompra ?? undefined} />
            <Tag icon={MdConfirmationNumber} label="Protocolo" value={garantia.protocoloFornecedor ?? undefined} />
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          {status && <StatusChip label={status.label} color={status.color} background={status.background} />}
          {garantia.temNovaInteracao && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <MdFiberNew size={14} />
              {relativeTimeFromNow(garantia.dataCriacao)}
            </span>
          )}
          <span className="text-xs text-slate-500">{formatDate(garantia.dataCriacao)}</span>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{garantia.produtos.replace(/; /g, " \u2022 ")}</p>
    </button>
  );
};
