'use client';

import { TimelineEmailItem, TimelineItem } from "@/lib/qualidade/types";
import { formatDateTime, stripHtml } from "@/lib/qualidade/formatters";
import { MdMailOutline, MdAutoFixHigh } from "react-icons/md";

interface Props {
  item: TimelineItem;
  canReply?: boolean;
  onReply?: (email: TimelineEmailItem) => void;
}

export const TimelineItemCard = ({ item, canReply = false, onReply }: Props) => {
  const isEmail = item.kind === "email";
  const emailItem = isEmail ? (item as TimelineEmailItem) : null;
  const Icon = isEmail ? MdMailOutline : MdAutoFixHigh;
  const description = isEmail ? stripHtml(emailItem?.corpoHtml ?? "") : stripHtml((item as any).descricao);

  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 last:border-none">
      <div className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50 text-[var(--primary-600)]">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{item.titulo}</p>
        {isEmail && emailItem && (
          <div className="mt-1 space-y-1 text-xs text-slate-500">
            <p className="font-semibold text-slate-600" title={emailItem.remetente}>
              De: <span className="font-normal text-slate-500">{emailItem.remetente}</span>
            </p>
            <p className="font-semibold text-slate-600">
              Para: <span className="font-normal text-slate-500">{emailItem.destinatarios || "Não informado"}</span>
            </p>
            {emailItem.copias && (
              <p className="font-semibold text-slate-600">
                Cc: <span className="font-normal text-slate-500">{emailItem.copias}</span>
              </p>
            )}
          </div>
        )}
        {description && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{description}</p>}
        <p className="text-xs text-slate-400 mt-1">{formatDateTime(item.dataOcorrencia)}</p>
        {isEmail && emailItem && canReply && onReply && (
          <button
            type="button"
            className="keep-color mt-2 text-xs font-semibold text-[var(--primary-600)] hover:underline"
            onClick={() => onReply(emailItem)}
          >
            Responder
          </button>
        )}
      </div>
    </div>
  );
};
