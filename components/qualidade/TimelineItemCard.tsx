'use client';

import { TimelineEmailItem, TimelineItem } from "@/lib/qualidade/types";
import { formatDateTime, stripHtml } from "@/lib/qualidade/formatters";
import { MdMailOutline, MdAutoFixHigh } from "react-icons/md";

interface Props {
  item: TimelineItem;
  canReply?: boolean;
  onReply?: (email: TimelineEmailItem) => void;
  onOpenEmail?: (email: TimelineEmailItem) => void;
}

const summarizeEmail = (html: string, maxChars = 120) => {
  const clean = stripHtml(html).replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).trim()}...`;
};

export const TimelineItemCard = ({ item, canReply = false, onReply, onOpenEmail }: Props) => {
  const isEmail = item.kind === "email";
  const emailItem = isEmail ? (item as TimelineEmailItem) : null;
  const Icon = isEmail ? MdMailOutline : MdAutoFixHigh;
  const description = isEmail
    ? summarizeEmail(emailItem?.corpoHtml ?? "")
    : stripHtml((item as any).descricao);

  const openEmail = () => {
    if (isEmail && emailItem && onOpenEmail) {
      onOpenEmail(emailItem);
    }
  };

  return (
    <div
      className={`flex gap-3 py-3 border-b border-gray-100 dark:border-strokedark last:border-none ${isEmail ? "cursor-pointer hover:bg-gray-50/60 dark:hover:bg-meta-4/40 rounded-lg px-2 -mx-2" : ""
        }`}
      onClick={openEmail}
      role={isEmail ? "button" : undefined}
      tabIndex={isEmail ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isEmail) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openEmail();
        }
      }}
    >
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
          </div>
        )}
        {description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{description}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatDateTime(item.dataOcorrencia)}</p>
        {isEmail && emailItem && canReply && onReply && (
          <button
            type="button"
            className="keep-color mt-2 text-xs font-semibold text-primary hover:underline dark:text-primary"
            onClick={(event) => {
              event.stopPropagation();
              onReply(emailItem);
            }}
          >
            Responder
          </button>
        )}
      </div>
    </div>
  );
};
