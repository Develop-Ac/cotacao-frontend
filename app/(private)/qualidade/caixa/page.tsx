'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { QualidadeApi } from "@/lib/qualidade/api";
import { InboxEmail } from "@/lib/qualidade/types";
import { formatDateTime, stripHtml } from "@/lib/qualidade/formatters";
import { MdArrowBack, MdOpenInNew, MdRefresh, MdSync } from "react-icons/md";

type InboxFilter = "all" | "linked" | "unlinked";

export default function CaixaDeEntradaPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [mobileReading, setMobileReading] = useState(false);

  const carregar = useCallback(async () => {
    setUpdating(true);
    try {
      const list = await QualidadeApi.listarEmails();
      setEmails(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar e-mails.");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filteredEmails = useMemo(() => {
    const filtered = emails.filter((email) => {
      if (filter === "linked") return Boolean(email.garantiaId);
      if (filter === "unlinked") return !email.garantiaId;
      return true;
    });

    return filtered.sort((a, b) => {
      const aTime = new Date(a.dataRecebimento).getTime();
      const bTime = new Date(b.dataRecebimento).getTime();
      return sort === "desc" ? bTime - aTime : aTime - bTime;
    });
  }, [emails, filter, sort]);

  useEffect(() => {
    if (filteredEmails.length === 0) {
      setSelectedEmailId(null);
      setMobileReading(false);
      return;
    }

    setSelectedEmailId((current) => {
      const isStillAvailable = filteredEmails.some((email) => email.id === current);
      return isStillAvailable ? current : filteredEmails[0].id;
    });
  }, [filteredEmails]);

  const selectedEmail = useMemo(
    () => filteredEmails.find((email) => email.id === selectedEmailId) ?? null,
    [filteredEmails, selectedEmailId],
  );

  const selectedEmailHtml = useMemo(() => {
    if (!selectedEmail?.corpoHtml) return "";
    return selectedEmail.corpoHtml
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+=\"[^\"]*\"/gi, "")
      .replace(/\son\w+=\'[^\']*\'/gi, "");
  }, [selectedEmail]);

  const sincronizar = async () => {
    setSyncing(true);
    setError(null);
    try {
      await QualidadeApi.sincronizarEmails();
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar e-mails.");
    } finally {
      setSyncing(false);
    }
  };

  const abrirEmail = (emailId: number) => {
    setSelectedEmailId(emailId);
    setMobileReading(true);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <PageHeader title="Inbox de Garantias" subtitle="Integração direta com qualidade@ac" onBack={() => router.back()}>
        <ActionButton
          label="Sincronizar"
          variant="ghost"
          icon={<MdSync size={18} />}
          onClick={sincronizar}
          loading={syncing}
        />
        <ActionButton
          label="Atualizar"
          variant="ghost"
          icon={<MdRefresh size={18} />}
          onClick={carregar}
          loading={updating}
        />
      </PageHeader>

      <div className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-strokedark flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-strokedark overflow-hidden w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFilter("linked")}
              className={`px-3 py-2 text-sm font-medium transition border-l border-gray-200 dark:border-strokedark ${
                filter === "linked"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              Com garantia
            </button>
            <button
              type="button"
              onClick={() => setFilter("unlinked")}
              className={`px-3 py-2 text-sm font-medium transition border-l border-gray-200 dark:border-strokedark ${
                filter === "unlinked"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              Nao vinculados
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Ordenar:</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "desc" | "asc")}
              className="rounded-md border border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark-2 px-2 py-1 text-sm"
            >
              <option value="desc">Mais recentes</option>
              <option value="asc">Mais antigos</option>
            </select>
          </label>
        </div>

        {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 rounded-xl border border-gray-200 dark:border-strokedark bg-gray-100 dark:bg-boxdark-2 animate-pulse"
              />
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Nenhum e-mail encontrado</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ajuste o filtro ou clique em sincronizar para atualizar a caixa.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] min-h-[540px]">
            <aside className={`border-r border-gray-200 dark:border-strokedark ${mobileReading ? "hidden lg:block" : "block"}`}>
              <ul className="divide-y divide-gray-200 dark:divide-strokedark">
                {filteredEmails.map((email) => {
                  const active = email.id === selectedEmailId;
                  return (
                    <li key={email.id}>
                      <button
                        type="button"
                        onClick={() => abrirEmail(email.id)}
                        className={`w-full text-left px-4 py-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                          active
                            ? "bg-sky-50 dark:bg-sky-500/10 border-l-4 border-sky-600"
                            : "hover:bg-gray-50 dark:hover:bg-white/5 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{email.remetente}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{email.assunto || "(sem assunto)"}</p>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(email.dataRecebimento)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{stripHtml(email.corpoHtml) || "Sem conteudo exibivel."}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border font-semibold ${
                              email.garantiaId
                                ? "bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800"
                                : "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {email.garantiaId ? `Garantia #${email.garantiaId}` : "Nao vinculado"}
                          </span>
                          {email.attachments.length > 0 && (
                            <span className="font-medium text-primary">{email.attachments.length} anexo(s)</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section
              className={`relative ${mobileReading ? "block" : "hidden lg:block"} transition-all duration-300 ease-out ${
                selectedEmail ? "opacity-100 translate-x-0" : "opacity-60"
              }`}
            >
              {!selectedEmail ? (
                <div className="h-full flex items-center justify-center text-center p-8">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Selecione um e-mail</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Ao selecionar, o conteudo sera exibido aqui como painel de leitura.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col transition-opacity duration-300">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-strokedark flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setMobileReading(false)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 lg:hidden"
                      >
                        <MdArrowBack size={15} /> Voltar para a lista
                      </button>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{selectedEmail.assunto || "(sem assunto)"}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-300 break-all">
                        De: <span className="font-medium">{selectedEmail.remetente}</span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Recebido em {formatDateTime(selectedEmail.dataRecebimento)}</p>
                    </div>
                    {selectedEmail.garantiaId && (
                      <button
                        type="button"
                        onClick={() => router.push(`/qualidade/${selectedEmail.garantiaId}`)}
                        className="inline-flex items-center gap-2 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition"
                      >
                        Ver garantia #{selectedEmail.garantiaId}
                        <MdOpenInNew size={14} />
                      </button>
                    )}
                  </div>

                  {(selectedEmail.toList.length > 0 || selectedEmail.ccList.length > 0) && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-strokedark text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {selectedEmail.toList.length > 0 && (
                        <p>
                          Para: <span className="font-medium break-all">{selectedEmail.toList.join(", ")}</span>
                        </p>
                      )}
                      {selectedEmail.ccList.length > 0 && (
                        <p>
                          Cc: <span className="font-medium break-all">{selectedEmail.ccList.join(", ")}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <article className="px-4 py-5 overflow-auto">
                    {selectedEmailHtml ? (
                      <iframe
                        title={`email-${selectedEmail.id}`}
                        sandbox=""
                        className="w-full min-h-[460px] rounded-lg border border-gray-200 dark:border-strokedark bg-white"
                        srcDoc={`
                          <html>
                            <head>
                              <meta charset="utf-8" />
                              <style>
                                body {
                                  margin: 0;
                                  padding: 16px;
                                  font-family: Segoe UI, Arial, sans-serif;
                                  color: #1f2937;
                                  line-height: 1.5;
                                  word-break: break-word;
                                }
                                img { max-width: 100%; height: auto; }
                                table { max-width: 100%; }
                              </style>
                            </head>
                            <body>${selectedEmailHtml}</body>
                          </html>
                        `}
                      />
                    ) : (
                      <p className="text-sm leading-6 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {stripHtml(selectedEmail.corpoHtml) || "Sem conteudo exibivel."}
                      </p>
                    )}
                  </article>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
