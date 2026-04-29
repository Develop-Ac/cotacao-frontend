'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdAdd, MdForwardToInbox, MdLink, MdOutlineReply, MdOutlineReplyAll, MdRefresh, MdSync, MdSend } from 'react-icons/md';
import { ActionButton } from '@/components/qualidade/ActionButton';
import { PageHeader } from '@/components/qualidade/PageHeader';
import { mailAccountsClient, mailLinksClient, mailMessagesClient, mailOutboundClient, mailSyncClient } from '@/lib/email-service/clients';
import type { MailAccount, MailMessage } from '@/lib/email-service/types';
import { QualidadeApi } from '@/lib/qualidade/api';
import type { Garantia } from '@/lib/qualidade/types';

type InboxFilter = 'all' | 'linked' | 'unlinked';
type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

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

export default function CaixaDeEntradaPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [garantiaSearch, setGarantiaSearch] = useState('');
  const [selectedGarantiaId, setSelectedGarantiaId] = useState<string>('');
  const [linking, setLinking] = useState(false);

  const activeQualidadeAccount = useMemo(
    () =>
      accounts.find(
        (account) => account.tenantKey.toUpperCase() === QUALIDADE_BOX && account.statusCode === 'ACTIVE',
      ) ?? null,
    [accounts],
  );

  const carregarGarantias = useCallback(async () => {
    if (garantias.length > 0) return;
    const list = await QualidadeApi.listarGarantias();
    setGarantias(list);
  }, [garantias.length]);

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
      setMessages(merged as MailMessage[]);
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

      const isUnlinked = (item as MailMessage & { __isUnlinked?: boolean }).__isUnlinked;
      if (filter === 'unlinked' && !isUnlinked) return false;
      if (filter === 'linked' && isUnlinked) return false;

      if (!term) return true;

      const content = `${item.subject ?? ''} ${item.fromAddress ?? ''} ${stripHtml(item.bodyText || item.bodyHtml)}`.toLowerCase();
      return content.includes(term);
    });
  }, [messages, filter, search, activeQualidadeAccount]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      setSelectedMessageId(null);
      return;
    }
    setSelectedMessageId((current) => (filteredMessages.some((item) => item.id === current) ? current : filteredMessages[0].id));
  }, [filteredMessages]);

  const selectedMessage = useMemo(
    () => filteredMessages.find((item) => item.id === selectedMessageId) ?? null,
    [filteredMessages, selectedMessageId],
  );

  const filteredGarantias = useMemo(() => {
    const term = garantiaSearch.trim().toLowerCase();
    if (!term) return garantias;
    return garantias.filter((item) => {
      const text = `${item.id} ${item.notaInterna ?? ''} ${item.nomeFornecedor ?? ''}`.toLowerCase();
      return text.includes(term);
    });
  }, [garantias, garantiaSearch]);

  const openComposer = (mode: ComposeMode) => {
    if (!activeQualidadeAccount) {
      setError('Nao existe conta ativa para a caixa QUALIDADE. Configure em Sistema > E-mails.');
      return;
    }

    const current = selectedMessage;
    setComposeMode(mode);

    if (!current || mode === 'new') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      setComposeOpen(true);
      return;
    }

    const to = current.fromAddress?.trim() ?? '';
    const subject = toSubject(mode, current.subject);

    setComposeTo(to);
    setComposeCc('');
    setComposeSubject(subject);
    setComposeBody(
      mode === 'forward'
        ? `\n\n---------- Mensagem encaminhada ----------\nDe: ${current.fromAddress ?? ''}\nAssunto: ${current.subject ?? ''}\n\n${stripHtml(
            current.bodyText || current.bodyHtml,
          )}`
        : `\n\n----- Mensagem original -----\n${stripHtml(current.bodyText || current.bodyHtml)}`,
    );
    setComposeOpen(true);
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

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await mailOutboundClient.send({
        accountId: activeQualidadeAccount.id,
        threadId: selectedMessage?.threadId ?? undefined,
        parentMessageId: composeMode === 'new' ? undefined : selectedMessage?.id,
        recipients,
        cc: parseEmails(composeCc),
        subject: composeSubject.trim(),
        bodyText: composeBody,
      });

      setSuccess('E-mail enfileirado para envio com sucesso.');
      setComposeOpen(false);
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

  const vincularGarantia = async () => {
    if (!selectedMessage || !selectedGarantiaId) {
      setError('Selecione uma garantia para vinculo manual.');
      return;
    }

    setLinking(true);
    setError(null);
    try {
      await mailLinksClient.createManual({
        targetType: 'MESSAGE',
        targetId: selectedMessage.id,
        entityType: 'GARANTIA',
        entityId: selectedGarantiaId,
      });
      setSuccess('Vinculo manual registrado com sucesso.');
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular garantia.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col p-4 lg:p-6 gap-4">
      <PageHeader
        title="Qualidade > Caixa"
        subtitle="Operacao da inbox integrada ao email-service."
        onBack={() => router.back()}
      >
        <ActionButton label="Atualizar" variant="ghost" icon={<MdRefresh size={18} />} loading={refreshing} onClick={() => void carregar()} />
        <ActionButton label="Sincronizar" variant="ghost" icon={<MdSync size={18} />} loading={syncing} onClick={() => void sincronizar()} />
      </PageHeader>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <ActionButton label="Novo e-mail" icon={<MdAdd size={18} />} onClick={() => openComposer('new')} />
          <ActionButton label="Responder" variant="ghost" icon={<MdOutlineReply size={18} />} onClick={() => openComposer('reply')} disabled={!selectedMessage} />
          <ActionButton label="Responder todos" variant="ghost" icon={<MdOutlineReplyAll size={18} />} onClick={() => openComposer('replyAll')} disabled={!selectedMessage} />
          <ActionButton label="Reencaminhar" variant="ghost" icon={<MdForwardToInbox size={18} />} onClick={() => openComposer('forward')} disabled={!selectedMessage} />

          <div className="ml-auto flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar assunto/remetente"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as InboxFilter)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="linked">Vinculados</option>
              <option value="unlinked">Nao vinculados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr_420px] gap-4 min-h-[62vh]">
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b text-sm font-semibold">Mensagens</div>
          <div className="overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">Carregando...</p>
            ) : filteredMessages.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Nenhuma mensagem encontrada.</p>
            ) : (
              filteredMessages.map((item) => {
                const selected = item.id === selectedMessageId;
                const preview = stripHtml(item.bodyText || item.bodyHtml).slice(0, 90);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMessageId(item.id)}
                    className={`w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{new Date(item.receivedAt).toLocaleString('pt-BR')}</span>
                      <span className="text-[11px] font-semibold text-gray-500">#{item.id}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{item.subject || '(Sem assunto)'}</p>
                    <p className="text-xs text-gray-500 truncate">{item.fromAddress || 'Remetente nao informado'}</p>
                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">{preview || 'Sem conteudo textual.'}</p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b text-sm font-semibold">Leitura da thread/mensagem</div>
          {!selectedMessage ? (
            <p className="p-4 text-sm text-gray-500">Selecione uma mensagem para leitura.</p>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedMessage.subject || '(Sem assunto)'}</h2>
                <p className="text-sm text-gray-500 mt-1">De: {selectedMessage.fromAddress || 'Nao informado'}</p>
                <p className="text-xs text-gray-500">Recebido em: {new Date(selectedMessage.receivedAt).toLocaleString('pt-BR')}</p>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700 bg-gray-50">
                <p className="font-semibold mb-2">Vinculo manual com garantia</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={garantiaSearch}
                    onChange={(event) => setGarantiaSearch(event.target.value)}
                    placeholder="Buscar garantia por id, NI ou fornecedor"
                    className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    onFocus={() => void carregarGarantias()}
                  />
                  <select
                    value={selectedGarantiaId}
                    onChange={(event) => setSelectedGarantiaId(event.target.value)}
                    className="min-w-[260px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    onFocus={() => void carregarGarantias()}
                  >
                    <option value="">Selecione uma garantia</option>
                    {filteredGarantias.slice(0, 200).map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.id} - NI {item.notaInterna || '-'} - {item.nomeFornecedor || 'Fornecedor'}
                      </option>
                    ))}
                  </select>
                  <ActionButton
                    label="Vincular"
                    variant="ghost"
                    icon={<MdLink size={16} />}
                    loading={linking}
                    onClick={() => void vincularGarantia()}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                {selectedMessage.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{selectedMessage.bodyText || 'Sem conteudo.'}</p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b text-sm font-semibold">Composer</div>
          {!composeOpen ? (
            <div className="p-4 text-sm text-gray-500 space-y-2">
              <p>Abra o composer por uma das acoes rapidas:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Novo e-mail</li>
                <li>Responder</li>
                <li>Responder a todos</li>
                <li>Reencaminhar</li>
              </ul>
            </div>
          ) : (
            <div className="p-4 space-y-3 overflow-y-auto">
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Modo: {composeMode === 'new' ? 'Novo e-mail' : composeMode === 'reply' ? 'Responder' : composeMode === 'replyAll' ? 'Responder a todos' : 'Reencaminhar'}
              </span>

              <label className="block text-sm space-y-1">
                <span className="font-medium">Para</span>
                <input value={composeTo} onChange={(event) => setComposeTo(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="block text-sm space-y-1">
                <span className="font-medium">CC</span>
                <input value={composeCc} onChange={(event) => setComposeCc(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="block text-sm space-y-1">
                <span className="font-medium">Assunto</span>
                <input value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>

              <label className="block text-sm space-y-1">
                <span className="font-medium">Mensagem</span>
                <textarea
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  rows={14}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <ActionButton label="Enviar" icon={<MdSend size={18} />} loading={sending} onClick={() => void enviar()} />
                <ActionButton label="Fechar" variant="ghost" onClick={() => setComposeOpen(false)} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
