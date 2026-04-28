'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  MdAdd,
  MdArrowBack,
  MdAttachFile,
  MdDelete,
  MdForwardToInbox,
  MdLink,
  MdOpenInNew,
  MdOutlineReply,
  MdOutlineReplyAll,
  MdRefresh,
  MdSend,
} from 'react-icons/md';
import { ActionButton } from '@/components/qualidade/ActionButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
  mailAccountsClient,
  mailLinksClient,
  mailMessagesClient,
  mailOutboundClient,
  mailSyncClient,
  mailThreadsClient,
} from '@/lib/email-service/clients';
import type {
  MailAccount,
  MailAttachment,
  MailMessage,
  MailParticipant,
  MailThread,
} from '@/lib/email-service/types';
import { QualidadeApi } from '@/lib/qualidade/api';
import type { Garantia } from '@/lib/qualidade/types';

type InboxFilter = 'all' | 'linked' | 'unlinked';
type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';
type UiMessage = MailMessage & { __isUnlinked?: boolean };
type DraftListItem = {
  id: 'draft';
  receivedAt: string;
  subject: string;
  fromAddress: string;
  bodyText: string;
};
type SidebarItem = UiMessage | DraftListItem;

const QUALIDADE_BOX = 'QUALIDADE';

const stripHtml = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseEmails = (value: string): Array<{ email: string }> =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((email) => ({ email }));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatParticipant = (participant: MailParticipant): string =>
  participant.name?.trim() ? `${participant.name.trim()} <${participant.email}>` : participant.email;

const joinParticipants = (participants?: MailParticipant[] | null): string =>
  (participants ?? []).map((participant) => formatParticipant(participant)).join(', ');

const normalizeContentId = (value?: string | null): string =>
  String(value ?? '')
    .trim()
    .replace(/^cid:/i, '')
    .replace(/^<|>$/g, '')
    .toLowerCase();

const sanitizeEmailHtml = (value?: string | null): string => {
  if (!value) return '';
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '');
};

const renderMessageHtml = (message?: MailMessage | null, attachmentUrls?: Record<string, string>, darkMode?: boolean): string => {
  const rawHtml = sanitizeEmailHtml(message?.bodyHtml);
  if (!rawHtml) return '';

  const cidMap = new Map<string, string>();
  for (const attachment of message?.attachments ?? []) {
    const contentId = normalizeContentId(attachment.contentId);
    const resolvedUrl = attachment.storageKey ? attachmentUrls?.[attachment.storageKey] : undefined;
    if (contentId && resolvedUrl) {
      cidMap.set(contentId, resolvedUrl);
    }
  }

  const resolved = rawHtml.replace(/src\s*=\s*(?:(["'])cid:([^"']+)\1|cid:([^\s>]+))/gi, (match, quote, quotedContentId, bareContentId) => {
    const contentId = quotedContentId ?? bareContentId;
    const resolvedUrl = cidMap.get(normalizeContentId(contentId));
    if (!resolvedUrl) return match;
    const finalQuote = quote || '"';
    return `src=${finalQuote}${resolvedUrl}${finalQuote}`;
  });

  const darkStyles = darkMode ? `<style>
html, body, table, tbody, tr, td, th, div, p, span, li, blockquote, pre, font {
  background-color: #24303F !important;
  color: #e2e8f0 !important;
}
a, a * { color: #93c5fd !important; }
img { filter: brightness(0.9); }
</style>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${darkStyles}</head><body>${resolved}</body></html>`;
};

const toSubject = (mode: ComposeMode, original?: string | null): string => {
  const base = original?.trim() ?? '';
  if (!base) return '';
  if (mode === 'reply' || mode === 'replyAll') {
    return /^re:/i.test(base) ? base : `Re: ${base}`;
  }
  if (mode === 'forward') {
    return /^enc:/i.test(base) ? base : `Enc: ${base}`;
  }
  return base;
};

const modeLabel = (mode: ComposeMode): string => {
  if (mode === 'reply') return 'Responder';
  if (mode === 'replyAll') return 'Responder todos';
  if (mode === 'forward') return 'Encaminhar';
  return 'Novo e-mail';
};

const SLIDE_ANIM_DURATION = 280; // ms

function SlideNotification({ message, className }: { message: string | null; className: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (message) {
      setLeaving(false);
      setContent(message);
    } else if (content) {
      setLeaving(true);
      const t = setTimeout(() => {
        setContent(null);
        setLeaving(false);
      }, SLIDE_ANIM_DURATION);
      return () => clearTimeout(t);
    }
  }, [message]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!content) return null;

  return (
    <div
      className={className}
      style={{
        animation: leaving
          ? `caixa-slide-up ${SLIDE_ANIM_DURATION}ms ease forwards`
          : `caixa-slide-down ${SLIDE_ANIM_DURATION}ms ease forwards`,
        overflow: 'hidden',
      }}
    >
      {content}
    </div>
  );
}

const statusTone = (tone: 'neutral' | 'success' | 'warning' | 'info'): string => {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
  if (tone === 'info') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  return 'border-gray-200 bg-gray-50 text-gray-600 dark:border-strokedark dark:bg-meta-4 dark:text-gray-400';
};

const formatFileSize = (value?: number | null): string => {
  if (!value || value <= 0) return 'Tamanho nao informado';

  const units = ['B', 'KB', 'MB', 'GB'];
  let current = value;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  const decimals = current >= 10 || unitIndex === 0 ? 0 : 1;
  return `${current.toFixed(decimals)} ${units[unitIndex]}`;
};

const isPreviewableAttachment = (attachment: MailAttachment): boolean => {
  const mimeType = (attachment.mimeType ?? '').toLowerCase();
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');
};

const buildQuotedText = (mode: ComposeMode, source?: MailMessage | null, replyText?: string): string => {
  const currentText = replyText?.trim() ?? '';
  if (!source) return currentText;

  const header =
    mode === 'forward'
      ? `---------- Mensagem encaminhada ----------\nDe: ${source.fromAddress ?? ''}\nPara: ${joinParticipants(
          source.to,
        )}\nAssunto: ${source.subject ?? ''}`
      : '----- Mensagem original -----';

  const originalText = (source.bodyText || stripHtml(source.bodyHtml) || '').trim();
  return [currentText, header, originalText].filter(Boolean).join('\n\n');
};

const buildQuotedHtml = (
  mode: ComposeMode,
  source?: MailMessage | null,
  replyText?: string,
  attachmentUrls?: Record<string, string>,
): string | undefined => {
  const currentHtml = (replyText ?? '').trim() ? escapeHtml(replyText ?? '').replace(/\n/g, '<br />') : '';
  if (!source) return currentHtml || undefined;

  const originalHtml =
    renderMessageHtml(source, attachmentUrls) || escapeHtml(source.bodyText ?? '').replace(/\n/g, '<br />');
  const header =
    mode === 'forward'
      ? `<div style="margin-bottom:12px;color:#475569;font-size:12px;line-height:1.5;"><div><strong>De:</strong> ${escapeHtml(
          source.fromAddress ?? '',
        )}</div><div><strong>Para:</strong> ${escapeHtml(joinParticipants(source.to))}</div><div><strong>Assunto:</strong> ${escapeHtml(
          source.subject ?? '',
        )}</div></div>`
      : '';

  const quoted = `<div style="margin-top:16px;padding-left:12px;border-left:3px solid #d1d5db;">${header}${originalHtml}</div>`;
  return `${currentHtml}${currentHtml ? '<br /><br />' : ''}${quoted}`;
};

function EmailStatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'info';
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(
        tone,
      )}`}
    >
      {label}
    </span>
  );
}

function ThreadListItem({
  message,
  selected,
  onSelect,
}: {
  message: SidebarItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const isDraft = message.id === 'draft';
  const preview = stripHtml(message.bodyText || ('bodyHtml' in message ? message.bodyHtml : undefined)).slice(0, 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-gray-100 dark:border-strokedark px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-meta-4/60 ${
        selected ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(message.receivedAt).toLocaleString('pt-BR')}</span>
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{isDraft ? 'RASCUNHO' : `#${message.id}`}</span>
      </div>
      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{message.subject || '(Sem assunto)'}</p>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{message.fromAddress || 'Remetente nao informado'}</p>
      <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{preview || 'Sem conteudo textual.'}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {isDraft ? (
          <EmailStatusBadge label="Rascunho" tone="warning" />
        ) : (
          <>
            <EmailStatusBadge
              label={message.__isUnlinked ? 'Nao vinculado' : 'Vinculado'}
              tone={message.__isUnlinked ? 'warning' : 'success'}
            />
            {message.hasAttachments && <EmailStatusBadge label="Com anexo" tone="info" />}
            {message.direction === 'OUTBOUND' && <EmailStatusBadge label="Enviado" tone="neutral" />}
          </>
        )}
      </div>
    </button>
  );
}

function InlineComposer({
  mode,
  to,
  cc,
  subject,
  body,
  quotedHtml,
  sending,
  onChangeTo,
  onChangeCc,
  onChangeSubject,
  onChangeBody,
  onSend,
  onCancel,
}: {
  mode: ComposeMode;
  to: string;
  cc: string;
  subject: string;
  body: string;
  quotedHtml?: string;
  sending: boolean;
  onChangeTo: (value: string) => void;
  onChangeCc: (value: string) => void;
  onChangeSubject: (value: string) => void;
  onChangeBody: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">{modeLabel(mode)}</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton label="Enviar" icon={<MdSend size={18} />} loading={sending} onClick={onSend} />
          <ActionButton label="Cancelar" variant="ghost" onClick={onCancel} />
        </div>
      </div>
      <div className="space-y-2">
        <input
          value={to}
          onChange={(event) => onChangeTo(event.target.value)}
          placeholder="Para"
          className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <input
          value={cc}
          onChange={(event) => onChangeCc(event.target.value)}
          placeholder="CC"
          className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <input
          value={subject}
          onChange={(event) => onChangeSubject(event.target.value)}
          placeholder="Assunto"
          className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <textarea
          value={body}
          onChange={(event) => onChangeBody(event.target.value)}
          rows={8}
          placeholder="Escreva sua mensagem"
          className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>
      {quotedHtml && (
        <div className="mt-4 rounded-lg border border-blue-100 dark:border-strokedark bg-white dark:bg-boxdark p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mensagem original</p>
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: quotedHtml }} />
        </div>
      )}
    </div>
  );
}

function LoadingSidebar() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="animate-pulse rounded-lg border border-gray-100 dark:border-strokedark p-3">
          <div className="h-3 w-28 rounded bg-gray-200 dark:bg-meta-4" />
          <div className="mt-2 h-3 w-5/6 rounded bg-gray-200 dark:bg-meta-4" />
          <div className="mt-2 h-3 w-2/3 rounded bg-gray-200 dark:bg-meta-4" />
        </div>
      ))}
    </div>
  );
}

function LoadingReader() {
  return (
    <div className="space-y-3 p-4">
      <div className="animate-pulse space-y-2 rounded-lg border border-gray-100 dark:border-strokedark p-4">
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-meta-4" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-meta-4" />
        <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-meta-4" />
      </div>
      <div className="animate-pulse rounded-lg border border-gray-100 dark:border-strokedark p-4">
        <div className="h-3 w-full rounded bg-gray-200 dark:bg-meta-4" />
        <div className="mt-2 h-3 w-11/12 rounded bg-gray-200 dark:bg-meta-4" />
        <div className="mt-2 h-3 w-10/12 rounded bg-gray-200 dark:bg-meta-4" />
      </div>
    </div>
  );
}

export default function CaixaDeEntradaPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);
  const [selectedMessageId, setSelectedMessageId] = useState<number | 'draft' | null>(null);
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<MailMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attachmentUrlCache, setAttachmentUrlCache] = useState<Record<string, string>>({});
  const attachmentUrlCacheRef = useRef<Record<string, string>>({});
  useEffect(() => {
    attachmentUrlCacheRef.current = attachmentUrlCache;
  }, [attachmentUrlCache]);
  const [attachmentActionKey, setAttachmentActionKey] = useState<string | null>(null);

  const [inlineComposeMode, setInlineComposeMode] = useState<ComposeMode | null>(null);
  const [draftMode, setDraftMode] = useState<ComposeMode>('new');
  const [composeSourceMessage, setComposeSourceMessage] = useState<UiMessage | null>(null);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  const [mobileView, setMobileView] = useState<'list' | 'reader'>('list');

  const [threadDetail, setThreadDetail] = useState<MailThread | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [linkSearch, setLinkSearch] = useState('');
  const [linking, setLinking] = useState(false);
  const [deleteEmailConfirmOpen, setDeleteEmailConfirmOpen] = useState(false);

  const activeQualidadeAccount = useMemo(
    () =>
      accounts.find(
        (account) =>
          account.tenantKey.toUpperCase() === QUALIDADE_BOX && account.statusCode === 'ACTIVE',
      ) ?? null,
    [accounts],
  );

  const carregar = useCallback(async () => {
    setRefreshing(true);
    try {
      const [accountList, listAll, listUnlinked] = await Promise.all([
        mailAccountsClient.list(),
        mailMessagesClient.list({ page: 1, pageSize: 200 }),
        mailMessagesClient.listUnlinked({ page: 1, pageSize: 200 }),
      ]);

      const unlinkedIds = new Set(listUnlinked.map((item) => item.id));
      const merged = listAll
        .map((item) => ({ ...item, __isUnlinked: unlinkedIds.has(item.id) }))
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

      setAccounts(accountList);
      setMessages(merged);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar caixa de entrada.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();

    return messages.filter((item) => {
      if (activeQualidadeAccount && item.accountId !== activeQualidadeAccount.id) {
        return false;
      }

      const isUnlinked = item.__isUnlinked;
      if (filter === 'unlinked' && !isUnlinked) return false;
      if (filter === 'linked' && isUnlinked) return false;

      if (!term) return true;

      const content = `${item.subject ?? ''} ${item.fromAddress ?? ''} ${stripHtml(
        item.bodyText || item.bodyHtml,
      )}`.toLowerCase();
      return content.includes(term);
    });
  }, [messages, filter, search, activeQualidadeAccount]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setSelectedMessageId(null);
      return;
    }

    setSelectedMessageId((current) =>
      filteredMessages.some((item) => item.id === current) ? current : filteredMessages[0].id,
    );
  }, [filteredMessages]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((item) => item.id === selectedMessageId) ?? null,
    [filteredMessages, selectedMessageId],
  );

  useEffect(() => {
    if (!selectedMessage || selectedMessageId === 'draft') {
      setSelectedMessageDetail(null);
      setDetailLoading(false);
      return;
    }

    let active = true;
    setSelectedMessageDetail(null);
    setDetailLoading(true);

    void mailMessagesClient
      .get(selectedMessage.id)
      .then((payload) => {
        if (!active) return;
        setSelectedMessageDetail(payload);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes do e-mail.');
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedMessage, selectedMessageId]);

  const resolveAttachmentUrl = useCallback(
    async (attachment: MailAttachment): Promise<string> => {
      const storageKey = attachment.storageKey?.trim();
      if (!storageKey) {
        throw new Error('Anexo sem caminho disponivel.');
      }

      const cached = attachmentUrlCacheRef.current[storageKey];
      if (cached) {
        return cached;
      }

      const url = /^https?:\/\//i.test(storageKey)
        ? storageKey
        : await QualidadeApi.gerarLinkArquivo(storageKey);
      setAttachmentUrlCache((prev) => (prev[storageKey] ? prev : { ...prev, [storageKey]: url }));
      return url;
    },
    [],
  );

  useEffect(() => {
    const message = selectedMessageDetail;
    if (!message?.attachments?.length) return;

    const currentCache = attachmentUrlCacheRef.current;
    const pending = message.attachments.filter((attachment) => {
      if (!attachment.storageKey || currentCache[attachment.storageKey]) return false;
      if (attachment.isInline) return true;
      if (!attachment.contentId) return false;
      return (message.bodyHtml ?? '').toLowerCase().includes('cid:');
    });

    if (pending.length === 0) return;

    let cancelled = false;

    void Promise.all(
      pending.map(async (attachment) => {
        try {
          const url = await resolveAttachmentUrl(attachment);
          return { storageKey: attachment.storageKey, url };
        } catch (err) {
          console.error('[CID] Falha ao resolver URL do anexo:', attachment.storageKey, err);
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const resolved = entries.filter(Boolean) as Array<{ storageKey: string; url: string }>;
      if (resolved.length === 0) return;
      setAttachmentUrlCache((prev) => {
        const next = { ...prev };
        for (const entry of resolved) {
          next[entry.storageKey] = entry.url;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedMessageDetail, resolveAttachmentUrl]);

  const previewAttachment = useCallback(
    async (attachment: MailAttachment) => {
      setAttachmentActionKey(`preview:${attachment.id}`);
      try {
        const url = await resolveAttachmentUrl(attachment);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao abrir anexo.');
      } finally {
        setAttachmentActionKey(null);
      }
    },
    [resolveAttachmentUrl],
  );

  const downloadAttachment = useCallback(
    async (attachment: MailAttachment) => {
      setAttachmentActionKey(`download:${attachment.id}`);
      try {
        const url = await resolveAttachmentUrl(attachment);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.download = attachment.fileName || 'anexo';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao baixar anexo.');
      } finally {
        setAttachmentActionKey(null);
      }
    },
    [resolveAttachmentUrl],
  );

  const draftPreview = useMemo<DraftListItem | null>(() => {
    if (!inlineComposeMode) return null;

    const toPreview = composeTo.trim() || composeCc.trim() || 'Sem destinatario';
    return {
      id: 'draft',
      receivedAt: new Date().toISOString(),
      subject: composeSubject.trim() || '(Sem assunto)',
      fromAddress: `Para: ${toPreview}`,
      bodyText: composeBody || 'Rascunho em edicao...',
    };
  }, [inlineComposeMode, composeTo, composeCc, composeSubject, composeBody]);

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    if (!draftPreview) return filteredMessages;
    return [draftPreview, ...filteredMessages];
  }, [draftPreview, filteredMessages]);

  const selectedSidebarItem = useMemo<SidebarItem | null>(() => {
    if (selectedMessageId === 'draft') return draftPreview;
    return filteredMessages.find((item) => item.id === selectedMessageId) ?? null;
  }, [selectedMessageId, draftPreview, filteredMessages]);

  const selectedReaderMessage = useMemo<UiMessage | null>(() => {
    if (!selectedMessage) return null;
    return { ...selectedMessage, ...(selectedMessageDetail ?? {}) };
  }, [selectedMessage, selectedMessageDetail]);

  const selectedReaderHtml = useMemo(
    () => renderMessageHtml(selectedReaderMessage, attachmentUrlCache, isDark),
    [selectedReaderMessage, attachmentUrlCache, isDark],
  );

  const selectedReaderHasAttachments = useMemo(
    () => Boolean(selectedReaderMessage?.hasAttachments) || (selectedReaderMessage?.attachments?.length ?? 0) > 0,
    [selectedReaderMessage],
  );

  const openComposer = (mode: ComposeMode) => {
    if (!activeQualidadeAccount) {
      setError('Nao existe conta ativa para envio/sincronizacao desta caixa.');
      return;
    }

    setMobileView('reader');
    const current = selectedReaderMessage;
    setDraftMode(mode);

    if (!current || mode === 'new') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      setComposeSourceMessage(null);
      setInlineComposeMode(mode);
      setSelectedMessageId('draft');
      return;
    }

    const accountEmail = activeQualidadeAccount.emailAddress.trim().toLowerCase();
    const senderEmail = current.fromAddress?.trim() ?? '';
    const toCandidates = current.to?.map((participant) => participant.email.trim()) ?? [];
    const ccCandidates = current.cc?.map((participant) => participant.email.trim()) ?? [];

    const to =
      mode === 'replyAll'
        ? Array.from(
            new Set(
              [senderEmail, ...toCandidates].filter(
                (email) => email && email.toLowerCase() !== accountEmail,
              ),
            ),
          ).join(', ')
        : senderEmail;

    const cc =
      mode === 'replyAll'
        ? Array.from(
            new Set(ccCandidates.filter((email) => email && email.toLowerCase() !== accountEmail)),
          ).join(', ')
        : '';

    setComposeTo(to);
    setComposeCc(cc);
    setComposeSubject(toSubject(mode, current.subject));
    setComposeBody('');
    setComposeSourceMessage(current);
    setInlineComposeMode(mode);
    setSelectedMessageId('draft');
  };

  const closeComposer = () => {
    setInlineComposeMode(null);
    setComposeSourceMessage(null);
    setSelectedMessageId((current) => (current === 'draft' ? filteredMessages[0]?.id ?? null : current));
  };

  const enviar = async () => {
    if (!activeQualidadeAccount) {
      setError('Nao existe conta ativa para envio.');
      return;
    }

    const recipients = parseEmails(composeTo);
    if (recipients.length === 0) {
      setError('Informe ao menos um destinatario.');
      return;
    }

    setSendConfirmOpen(true);
  };

  const confirmarEnvio = async () => {
    if (!activeQualidadeAccount) {
      setError('Nao existe conta ativa para envio.');
      setSendConfirmOpen(false);
      return;
    }

    const recipients = parseEmails(composeTo);
    if (recipients.length === 0) {
      setError('Informe ao menos um destinatario.');
      setSendConfirmOpen(false);
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);
    setSendConfirmOpen(false);

    try {
      await mailOutboundClient.send({
        accountId: activeQualidadeAccount.id,
        threadId: composeSourceMessage?.threadId ?? undefined,
        parentMessageId: draftMode === 'new' ? undefined : composeSourceMessage?.id,
        recipients,
        cc: parseEmails(composeCc),
        subject: composeSubject.trim(),
        bodyText: buildQuotedText(draftMode, composeSourceMessage, composeBody),
        bodyHtml: buildQuotedHtml(draftMode, composeSourceMessage, composeBody, attachmentUrlCache),
      });

      setSuccess('E-mail enfileirado para envio com sucesso.');
      closeComposer();
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.');
    } finally {
      setSending(false);
    }
  };

  const sincronizar = async () => {
    if (!activeQualidadeAccount) {
      setError('Nao existe conta ativa para sincronizar.');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      await mailSyncClient.requestSync(activeQualidadeAccount.id, { forceFullResync: false });
      setSuccess('Sincronizacao solicitada. Atualize em alguns segundos.');
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar sincronizacao.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const msg = selectedReaderMessage;
    if (!msg || msg.__isUnlinked || !msg.threadId) {
      setThreadDetail(null);
      return;
    }

    let active = true;
    void mailThreadsClient
      .get(msg.threadId)
      .then((thread) => {
        if (active) setThreadDetail(thread);
      })
      .catch(() => {
        if (active) setThreadDetail(null);
      });

    return () => {
      active = false;
    };
  }, [selectedReaderMessage]);

  const abrirVincularModal = async () => {
    setLinkSearch('');
    setLinkModalOpen(true);
    try {
      const list = await QualidadeApi.listarGarantias();
      setGarantias(list);
    } catch {
      setError('Erro ao carregar garantias.');
    }
  };

  const handleVincularEmail = async (garantiaId: number) => {
    if (!selectedReaderMessage) return;
    setLinking(true);
    setError(null);
    try {
      await mailLinksClient.createManual({
        targetType: 'MESSAGE',
        targetId: selectedReaderMessage.id,
        entityType: 'GARANTIA',
        entityId: String(garantiaId),
      });
      setSuccess('E-mail vinculado à garantia com sucesso.');
      setLinkModalOpen(false);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular e-mail.');
    } finally {
      setLinking(false);
    }
  };

  const handleExcluirEmail = async () => {
    if (!selectedReaderMessage) return;
    setError(null);
    try {
      await mailMessagesClient.delete(selectedReaderMessage.id);
      setSuccess('E-mail excluído com sucesso.');
      setDeleteEmailConfirmOpen(false);
      setSelectedMessageId(null);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir e-mail.');
      setDeleteEmailConfirmOpen(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-slate-100 dark:bg-boxdark-2 p-4 lg:p-6">
      <ConfirmationModal
        isOpen={sendConfirmOpen}
        title="Confirmar envio"
        message="Deseja enviar este e-mail agora?"
        onConfirm={confirmarEnvio}
        onCancel={() => setSendConfirmOpen(false)}
        confirmText="Enviar"
        cancelText="Cancelar"
        isLoading={sending}
      />

      <ConfirmationModal
        isOpen={deleteEmailConfirmOpen}
        title="Excluir e-mail"
        message="Deseja excluir este e-mail? Esta ação não pode ser desfeita."
        onConfirm={() => void handleExcluirEmail()}
        onCancel={() => setDeleteEmailConfirmOpen(false)}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-boxdark shadow-xl border border-gray-100 dark:border-strokedark">
            <div className="border-b border-gray-100 dark:border-strokedark px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Vincular à Garantia</h3>
            </div>
            <div className="p-5">
              <input
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Buscar pelo número da nota interna"
                className="mb-3 w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {garantias.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Carregando garantias...</p>
                ) : (
                  garantias
                    .filter((g) => {
                      const term = linkSearch.toLowerCase().trim();
                      if (!term) return true;
                      return g.notaInterna.toLowerCase().includes(term);
                    })
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => void handleVincularEmail(g.id)}
                        disabled={linking}
                        className="w-full rounded-lg border border-gray-200 dark:border-strokedark px-3 py-2 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="font-semibold text-gray-900 dark:text-white">{g.notaInterna}</span>{' '}
                        <span className="text-gray-500 dark:text-gray-400 text-xs">— {g.nomeFornecedor}</span>
                      </button>
                    ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-strokedark px-5 py-3">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="rounded-lg border border-gray-300 dark:border-strokedark px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-meta-4"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes caixa-slide-down {
          from { max-height: 0; opacity: 0; transform: translateY(-6px); padding-top: 0; padding-bottom: 0; }
          to   { max-height: 80px; opacity: 1; transform: translateY(0); }
        }
        @keyframes caixa-slide-up {
          from { max-height: 80px; opacity: 1; transform: translateY(0); }
          to   { max-height: 0; opacity: 0; transform: translateY(-6px); padding-top: 0; padding-bottom: 0; }
        }
      `}</style>

      <SlideNotification
        message={error}
        className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400"
      />
      <SlideNotification
        message={success}
        className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-700 dark:text-emerald-400"
      />

      <div className="rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2">
        <div className="flex flex-nowrap items-center gap-2">
          <ActionButton iconOnly label="Novo e-mail" icon={<MdAdd size={18} />} onClick={() => openComposer('new')} />
          <ActionButton
            iconOnly
            label="Responder"
            variant="ghost"
            icon={<MdOutlineReply size={18} />}
            onClick={() => openComposer('reply')}
            disabled={!selectedMessage}
          />
          <ActionButton
            iconOnly
            label="Responder todos"
            variant="ghost"
            icon={<MdOutlineReplyAll size={18} />}
            onClick={() => openComposer('replyAll')}
            disabled={!selectedMessage}
          />
          <ActionButton
            iconOnly
            label="Encaminhar"
            variant="ghost"
            icon={<MdForwardToInbox size={18} />}
            onClick={() => openComposer('forward')}
            disabled={!selectedMessage}
          />

          <div className="ml-auto flex flex-nowrap items-center gap-2">
            <ActionButton
              iconOnly
              label="Atualizar"
              variant="ghost"
              icon={<MdRefresh size={18} />}
              loading={refreshing}
              onClick={() => void carregar()}
            />
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,_clamp(320px,_30vw,_420px))_minmax(0,_1fr)]">
        <section className={`min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark ${mobileView === 'reader' ? 'hidden xl:flex' : 'flex'}`}>
          <div className="border-b border-gray-100 dark:border-strokedark p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar assunto ou remetente"
                className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as InboxFilter)}
              className="w-full rounded-lg border border-gray-300 dark:border-strokedark bg-white dark:bg-form-input px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="linked">Vinculados</option>
              <option value="unlinked">Nao vinculados</option>
            </select>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <LoadingSidebar />
            ) : sidebarItems.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Nenhum e-mail encontrado com este filtro.</p>
            ) : (
              sidebarItems.map((item) => (
                <ThreadListItem
                  key={item.id}
                  message={item}
                  selected={item.id === selectedMessageId}
                  onSelect={() => { setSelectedMessageId(item.id); setMobileView('reader'); }}
                />
              ))
            )}
          </div>
        </section>

        <section className={`min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark ${mobileView === 'list' ? 'hidden xl:flex' : 'flex'}`}>
          <div className="border-b border-gray-100 dark:border-strokedark px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => { setMobileView('list'); setSelectedMessageId(null); }}
                className="xl:hidden inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-strokedark text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                aria-label="Voltar para lista"
              >
                <MdArrowBack size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">Leitura da thread/e-mail</span>
            </div>
            {!selectedReaderMessage?.__isUnlinked && threadDetail?.linkedEntityId && (() => {
              const linkedGarantia = garantias.find((g) => String(g.id) === threadDetail.linkedEntityId);
              return (
                <button
                  type="button"
                  onClick={() => router.push(`/qualidade/${threadDetail.linkedEntityId}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  <MdOpenInNew size={13} />
                  {linkedGarantia?.notaInterna ? `NF ${linkedGarantia.notaInterna}` : 'Ir para garantia'}
                </button>
              );
            })()}
          </div>
          {loading ? (
            <LoadingReader />
          ) : !selectedSidebarItem && !inlineComposeMode ? (
            <div className="p-5 text-sm text-gray-500 dark:text-gray-400">
              Selecione um e-mail na lista lateral para iniciar a leitura.
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {selectedReaderMessage && selectedMessageId !== 'draft' && (
                <>
                  <div>
                    <div className="flex items-start gap-3">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {selectedReaderMessage.subject || '(Sem assunto)'}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-all">
                      De: {selectedReaderMessage.fromAddress || 'Nao informado'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                      Para: {joinParticipants(selectedReaderMessage.to) || 'Nao informado'}
                    </p>
                    {(selectedReaderMessage.cc?.length ?? 0) > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 break-all">CC: {joinParticipants(selectedReaderMessage.cc)}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recebido em: {new Date(selectedReaderMessage.receivedAt).toLocaleString('pt-BR')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <EmailStatusBadge
                        label={selectedReaderMessage.__isUnlinked ? 'Nao vinculado' : 'Vinculado'}
                        tone={selectedReaderMessage.__isUnlinked ? 'warning' : 'success'}
                      />
                      {selectedReaderHasAttachments && <EmailStatusBadge label="Com anexo" tone="info" />}
                      {selectedReaderMessage.direction === 'OUTBOUND' && (
                        <EmailStatusBadge label="Enviado" tone="neutral" />
                      )}
                    </div>
                    {selectedReaderMessage.__isUnlinked && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void abrirVincularModal()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 transition hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        >
                          <MdLink size={14} />
                          Vincular à garantia
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteEmailConfirmOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/40"
                        >
                          <MdDelete size={14} />
                          Excluir e-mail
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedReaderHasAttachments && (
                    <div className="rounded-lg border border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-meta-4 p-3 text-xs text-gray-600 dark:text-gray-300">
                      <div className="mb-2 flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-200">
                        <MdAttachFile size={14} /> Anexos
                      </div>
                      {detailLoading ? (
                        <p>Carregando anexos...</p>
                      ) : (selectedReaderMessage.attachments?.length ?? 0) === 0 ? (
                        <p>Nenhum anexo detalhado encontrado para este e-mail.</p>
                      ) : (
                        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', maxWidth: '100%' }}>
                          {(selectedReaderMessage.attachments ?? []).map((attachment) => {
                            const previewKey = `preview:${attachment.id}`;
                            const downloadKey = `download:${attachment.id}`;
                            const mime = (attachment.mimeType ?? '').toLowerCase();
                            const isImage = mime.startsWith('image/');
                            const isPdf = mime === 'application/pdf';
                            const icon = isImage ? '🖼️' : isPdf ? '📄' : mime.includes('word') || mime.includes('document') ? '📝' : mime.includes('sheet') || mime.includes('excel') ? '📊' : mime.includes('zip') || mime.includes('compressed') ? '🗜️' : '📎';
                            return (
                              <div
                                key={attachment.id}
                                className="flex flex-col justify-between rounded-lg border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-2 gap-2 min-w-0"
                              >
                                <div className="min-w-0">
                                  <div className="text-base leading-none mb-1">{icon}</div>
                                  <p className="truncate text-xs font-semibold text-gray-900 dark:text-white leading-tight" title={attachment.fileName}>{attachment.fileName}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatFileSize(attachment.sizeBytes)}</p>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  {isPreviewableAttachment(attachment) && (
                                    <button
                                      type="button"
                                      onClick={() => void previewAttachment(attachment)}
                                      disabled={attachmentActionKey === previewKey}
                                      className="rounded border border-gray-300 dark:border-strokedark px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-meta-4 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {attachmentActionKey === previewKey ? '...' : 'Ver'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void downloadAttachment(attachment)}
                                    disabled={attachmentActionKey === downloadKey}
                                    className="rounded border border-gray-300 dark:border-strokedark px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-meta-4 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {attachmentActionKey === downloadKey ? '...' : 'Baixar'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 dark:border-strokedark p-4">
                    {detailLoading && !selectedMessageDetail ? (
                      <p className="text-sm text-gray-500">Carregando conteudo completo...</p>
                    ) : selectedReaderHtml ? (
                      <iframe
                        srcDoc={selectedReaderHtml}
                        sandbox="allow-same-origin"
                        className="w-full border-0"
                        style={{ height: '600px' }}
                        title="Conteudo do e-mail"
                        onLoad={(e) => {
                          const iframe = e.currentTarget;
                          const doc = iframe.contentDocument;
                          if (doc?.body) {
                            const h = doc.body.scrollHeight;
                            if (h > 0) iframe.style.height = `${h + 32}px`;
                          }
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {selectedReaderMessage.bodyText || 'Sem conteudo.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {inlineComposeMode && (
                <InlineComposer
                  mode={inlineComposeMode}
                  to={composeTo}
                  cc={composeCc}
                  subject={composeSubject}
                  body={composeBody}
                  quotedHtml={renderMessageHtml(composeSourceMessage, attachmentUrlCache)}
                  sending={sending}
                  onChangeTo={setComposeTo}
                  onChangeCc={setComposeCc}
                  onChangeSubject={setComposeSubject}
                  onChangeBody={setComposeBody}
                  onSend={() => void enviar()}
                  onCancel={closeComposer}
                />
              )}

              {!inlineComposeMode && selectedMessageId === 'draft' && (
                <div className="rounded-lg border border-gray-200 dark:border-strokedark p-4 text-sm text-gray-500 dark:text-gray-400">
                  Selecione &quot;Novo e-mail&quot; ou &quot;Responder&quot; para continuar este rascunho.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
