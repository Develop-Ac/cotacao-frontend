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
    <div className="flex gap-3 py-3 border-b border-gray-100 dark:border-strokedark last:border-none">
      <div className="h-11 w-11 rounded-xl border border-gray-200 dark:border-strokedark flex items-center justify-center bg-gray-50 dark:bg-meta-4 text-primary dark:text-white">
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.titulo}</p>
        {isEmail && emailItem && (
          <div className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p className="font-semibold text-gray-600 dark:text-gray-300" title={emailItem.remetente}>
              De: <span className="font-normal text-gray-500 dark:text-gray-400">{emailItem.remetente}</span>
            </p>
            <p className="font-semibold text-gray-600 dark:text-gray-300">
              Para: <span className="font-normal text-gray-500 dark:text-gray-400">{emailItem.destinatarios || "Não informado"}</span>
            </p>
            {emailItem.copias && (
              <p className="font-semibold text-gray-600 dark:text-gray-300">
                Cc: <span className="font-normal text-gray-500 dark:text-gray-400">{emailItem.copias}</span>
              </p>
            )}
          </div>
        )}
        {description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">{description}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(item.dataOcorrencia)}</p>
        {isEmail && emailItem && canReply && onReply && (
          <button
            type="button"
            className="keep-color mt-2 text-xs font-semibold text-primary hover:underline dark:text-primary"
            onClick={() => onReply(emailItem)}
          >
            Responder
          </button>
        )}
      </div>
    </div>
  );
};
