'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { QualidadeApi } from "@/lib/qualidade/api";
import { Garantia, InboxEmail } from "@/lib/qualidade/types";
import { formatDate, formatDateTime, stripHtml } from "@/lib/qualidade/formatters";
import { getStatusDefinition } from "@/lib/qualidade/status";
import {
  MdArrowBack,
  MdAttachFile,
  MdClose,
  MdDeleteOutline,
  MdDescription,
  MdDownload,
  MdImage,
  MdLink,
  MdOpenInNew,
  MdPictureAsPdf,
  MdRefresh,
  MdSync,
} from "react-icons/md";

type InboxFilter = "all" | "linked" | "unlinked";

const buildEmailPreview = (html?: string | null): string => {
  if (!html) return "";

  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/(?:v:\\*|o:\\*|w:\\*)\s*\{[^}]*\}/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
};

const formatFileSize = (sizeBytes?: number) => {
  if (!sizeBytes || sizeBytes <= 0) return "Tamanho não informado";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const getAttachmentDescriptor = (attachment: InboxEmail["attachments"][number]) => {
  const filename = (attachment.filename || "anexo").toLowerCase();
  const mime = (attachment.mimeType || "").toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(filename)) {
    return { icon: MdImage, label: "Imagem" };
  }

  if (mime.includes("pdf") || filename.endsWith(".pdf")) {
    return { icon: MdPictureAsPdf, label: "PDF" };
  }

  return { icon: MdDescription, label: "Arquivo" };
};

const sanitizeEmailHtml = (html?: string | null): string => {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+=\'[^\']*\'/gi, "");
};

const normalizeInlineToken = (value?: string | null): string => {
  if (!value) return "";
  return value.trim().replace(/^<|>$/g, "").toLowerCase();
};

const extractCidCandidates = (cidSource: string): string[] => {
  const normalized = normalizeInlineToken(cidSource);
  if (!normalized) return [];

  const candidates = new Set<string>();
  candidates.add(normalized);

  const beforeAt = normalized.split("@")[0];
  if (beforeAt) candidates.add(beforeAt);

  const withoutBrackets = normalized.replace(/[<>]/g, "");
  if (withoutBrackets) candidates.add(withoutBrackets);

  return Array.from(candidates);
};

const pickAttachmentStorageKey = (attachment: Record<string, unknown>): string => {
  const candidates = [
    attachment.objectKey,
    attachment.object_key,
    attachment.storageKey,
    attachment.storage_key,
    attachment.fileKey,
    attachment.file_key,
    attachment.minioKey,
    attachment.minio_key,
    attachment.s3Key,
    attachment.s3_key,
    attachment.key,
    attachment.path,
    attachment.path_ficheiro,
    attachment.filePath,
    attachment.file_path,
    attachment.caminho,
    attachment.url,
    attachment.location,
    attachment.uri,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
};

const buildAttachmentDataUrl = (attachment: InboxEmail["attachments"][number]): string => {
  const rawBase64 = attachment.contentBase64?.trim();
  if (!rawBase64) return "";

  const alreadyDataUrl = /^data:[^;]+;base64,/i.test(rawBase64);
  if (alreadyDataUrl) return rawBase64;

  const mime = attachment.mimeType?.trim() || "application/octet-stream";
  return `data:${mime};base64,${rawBase64}`;
};

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
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loadingGarantias, setLoadingGarantias] = useState(false);
  const [linkingEmailId, setLinkingEmailId] = useState<number | null>(null);
  const [selectedGarantiaId, setSelectedGarantiaId] = useState<string>("");
  const [garantiaSearchTerm, setGarantiaSearchTerm] = useState("");
  const [submittingLink, setSubmittingLink] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<number | null>(null);
  const [selectedEmailHtml, setSelectedEmailHtml] = useState("");

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

  const filteredGarantias = useMemo(() => {
    const term = garantiaSearchTerm.trim().toLowerCase();
    if (!term) return garantias;

    return garantias.filter((garantia) => {
      const garantiaId = garantia.id.toString().toLowerCase();
      const notaInterna = (garantia.notaInterna ?? "").toLowerCase();
      const fornecedor = (garantia.nomeFornecedor ?? "").toLowerCase();
      const fornecedorId = String(garantia.erpFornecedorId ?? "").toLowerCase();

      return (
        garantiaId.includes(term) ||
        notaInterna.includes(term) ||
        fornecedor.includes(term) ||
        fornecedorId.includes(term)
      );
    });
  }, [garantiaSearchTerm, garantias]);

  const resolveAttachmentUrl = useCallback(async (attachment: InboxEmail["attachments"][number]) => {
    const storageKey = pickAttachmentStorageKey(attachment as unknown as Record<string, unknown>);
    if (storageKey) {
      return QualidadeApi.gerarLinkArquivo(storageKey);
    }

    if (attachment.url?.trim()) {
      const trimmedUrl = attachment.url.trim();
      if (/^https?:\/\//i.test(trimmedUrl)) {
        return trimmedUrl;
      }
    }

    const dataUrl = buildAttachmentDataUrl(attachment);
    if (dataUrl) {
      return dataUrl;
    }

    if (process.env.NODE_ENV !== "production") {
      // Log temporario para identificar formatos inesperados vindos do n8n.
      // eslint-disable-next-line no-console
      console.debug("[caixa] anexo sem chave/caminho/base64", attachment);
    }

    throw new Error("Anexo sem caminho para download.");
  }, []);

  const abrirAnexo = useCallback(
    async (attachment: InboxEmail["attachments"][number]) => {
      const url = await resolveAttachmentUrl(attachment);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [resolveAttachmentUrl],
  );

  const baixarAnexo = useCallback(
    async (attachment: InboxEmail["attachments"][number]) => {
      const url = await resolveAttachmentUrl(attachment);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Nao foi possivel baixar o anexo.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = attachment.filename || "anexo";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    },
    [resolveAttachmentUrl],
  );

  useEffect(() => {
    let cancelled = false;

    const prepareEmailHtml = async () => {
      if (!selectedEmail?.corpoHtml) {
        if (!cancelled) setSelectedEmailHtml("");
        return;
      }

      const baseHtml = sanitizeEmailHtml(selectedEmail.corpoHtml);
      const cidMatches = Array.from(baseHtml.matchAll(/src\s*=\s*(["'])cid:([^"']+)\1/gi));
      if (!cidMatches.length) {
        if (!cancelled) setSelectedEmailHtml(baseHtml);
        return;
      }

      const attachmentUrlByToken = new Map<string, string>();
      const attachments = selectedEmail.attachments || [];

      for (const attachment of attachments) {
        const tokens = new Set<string>();
        const contentId = normalizeInlineToken(attachment.contentId);
        const filename = normalizeInlineToken(attachment.filename);
        if (contentId) {
          tokens.add(contentId);
          const beforeAt = contentId.split("@")[0];
          if (beforeAt) tokens.add(beforeAt);
        }
        if (filename) tokens.add(filename);

        if (!tokens.size) continue;

        let url: string;
        try {
          url = await resolveAttachmentUrl(attachment);
        } catch {
          continue;
        }

        for (const token of tokens) {
          if (!attachmentUrlByToken.has(token)) {
            attachmentUrlByToken.set(token, url);
          }
        }
      }

      const rewritten = baseHtml.replace(/src\s*=\s*(["'])cid:([^"']+)\1/gi, (full, quote: string, cidValue: string) => {
        const candidates = extractCidCandidates(cidValue);
        for (const candidate of candidates) {
          const mappedUrl = attachmentUrlByToken.get(candidate);
          if (mappedUrl) {
            return `src=${quote}${mappedUrl}${quote}`;
          }
        }
        return full;
      });

      if (!cancelled) setSelectedEmailHtml(rewritten);
    };

    void prepareEmailHtml();

    return () => {
      cancelled = true;
    };
  }, [resolveAttachmentUrl, selectedEmail]);

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

  const carregarGarantias = useCallback(async () => {
    if (garantias.length > 0 || loadingGarantias) return;
    setLoadingGarantias(true);
    try {
      const list = await QualidadeApi.listarGarantias();
      const sorted = [...list].sort((a, b) => {
        const aTime = new Date(a.dataCriacao).getTime();
        const bTime = new Date(b.dataCriacao).getTime();
        return bTime - aTime;
      });
      setGarantias(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar garantias para vinculo.");
    } finally {
      setLoadingGarantias(false);
    }
  }, [garantias.length, loadingGarantias]);

  const abrirVinculo = async (emailId: number) => {
    setLinkingEmailId(emailId);
    setSelectedGarantiaId("");
    setGarantiaSearchTerm("");
    await carregarGarantias();
  };

  const confirmarVinculo = async () => {
    if (!linkingEmailId || !selectedGarantiaId) {
      setError("Selecione uma garantia para vincular.");
      return;
    }

    setSubmittingLink(true);
    setError(null);
    try {
      await QualidadeApi.vincularEmail(linkingEmailId, Number(selectedGarantiaId));
      setLinkingEmailId(null);
      setSelectedGarantiaId("");
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao vincular e-mail.");
    } finally {
      setSubmittingLink(false);
    }
  };

  const excluirSemVinculo = async (emailId: number) => {
    const confirmed = window.confirm("Excluir este e-mail sem vinculo? Esta acao nao pode ser desfeita.");
    if (!confirmed) return;

    setDeletingEmailId(emailId);
    setError(null);
    try {
      await QualidadeApi.excluirEmailSemVinculo(emailId);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir e-mail.");
    } finally {
      setDeletingEmailId(null);
    }
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
          <div className="grid lg:grid-cols-[380px_minmax(0,1fr)] min-h-[540px] lg:h-[calc(100vh-220px)] lg:overflow-hidden">
            <aside
              className={`border-r border-gray-200 dark:border-strokedark lg:h-full lg:min-h-0 ${mobileReading ? "hidden lg:block" : "block"}`}
            >
              <ul className="divide-y divide-gray-200 dark:divide-strokedark lg:h-full lg:min-h-0 lg:overflow-y-auto">
                {filteredEmails.map((email) => {
                  const active = email.id === selectedEmailId;
                  const preview = buildEmailPreview(email.corpoHtml);
                  const garantiaLabel = email.notaInterna?.trim() ? email.notaInterna : String(email.garantiaId ?? "");
                  return (
                    <li
                      key={email.id}
                      className={`border-l-4 transition-colors duration-200 ${
                        active ? "bg-sky-50 dark:bg-sky-500/10 border-sky-600" : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => abrirEmail(email.id)}
                        className="w-full text-left px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{email.remetente}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-200 truncate">{email.assunto || "(sem assunto)"}</p>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(email.dataRecebimento)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{preview || "Sem conteudo exibivel."}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full border font-semibold ${
                              email.garantiaId
                                ? "bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800"
                                : "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {email.garantiaId ? `Garantia #${garantiaLabel}` : "Nao vinculado"}
                          </span>
                          {email.attachments.length > 0 && (
                            <span className="font-medium text-primary">{email.attachments.length} anexo(s)</span>
                          )}
                        </div>
                      </button>

                      {!email.garantiaId && (
                        <div className="px-4 pb-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => abrirVinculo(email.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200 transition"
                          >
                            <MdLink size={14} /> Vincular garantia
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirSemVinculo(email.id)}
                            disabled={deletingEmailId === email.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition disabled:opacity-60"
                          >
                            <MdDeleteOutline size={14} />
                            {deletingEmailId === email.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section
              className={`relative ${mobileReading ? "block" : "hidden lg:block"} transition-all duration-300 ease-out ${
                selectedEmail ? "opacity-100 translate-x-0" : "opacity-60"
              } lg:h-full lg:min-h-0`}
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
                        Ver garantia #{selectedEmail.notaInterna?.trim() || selectedEmail.garantiaId}
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

                  {selectedEmail.attachments.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-strokedark">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        <MdAttachFile size={16} />
                        Anexos ({selectedEmail.attachments.length})
                      </div>
                      <div className="space-y-2">
                        {selectedEmail.attachments.map((attachment, index) => {
                          const descriptor = getAttachmentDescriptor(attachment);
                          const Icon = descriptor.icon;
                          return (
                            <div
                              key={`${attachment.filename}-${index}`}
                              className="rounded-lg border border-gray-200 dark:border-strokedark px-3 py-2 bg-gray-50/70 dark:bg-boxdark-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-2">
                                  <Icon size={18} className="text-sky-600 dark:text-sky-300 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={attachment.filename}>
                                      {attachment.filename}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {descriptor.label} • {formatFileSize(attachment.sizeBytes)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => abrirAnexo(attachment).catch((err) => setError(err instanceof Error ? err.message : "Erro ao abrir anexo."))}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-boxdark"
                                  >
                                    Abrir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => baixarAnexo(attachment).catch((err) => setError(err instanceof Error ? err.message : "Erro ao baixar anexo."))}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                                  >
                                    <MdDownload size={14} /> Baixar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <article className="px-4 py-5 flex-1 min-h-0 overflow-auto">
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

      {linkingEmailId && (
        <div className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-6xl rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark shadow-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-strokedark flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Vincular e-mail a garantia</h3>
              <button
                type="button"
                onClick={() => setLinkingEmailId(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <MdClose size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">Selecione a garantia para vincular este e-mail.</p>
              <input
                type="text"
                value={garantiaSearchTerm}
                onChange={(event) => setGarantiaSearchTerm(event.target.value)}
                placeholder="Buscar por numero, nota, fornecedor ou fornecedor ID"
                className="w-full rounded-md border border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark-2 px-3 py-2 text-sm"
                disabled={loadingGarantias || submittingLink}
              />
              <div className="max-h-[52vh] overflow-auto pr-1 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 px-1 pb-1">
                  {filteredGarantias.map((garantia) => {
                    const isSelected = selectedGarantiaId === garantia.id.toString();
                    const status = getStatusDefinition(garantia.status);
                    const statusLabel = status?.label ?? "Status desconhecido";
                    const statusColor = status?.color ?? "#6B7280";
                    const statusBackground = status?.background ?? "rgba(107,114,128,0.15)";

                    return (
                      <button
                        key={garantia.id}
                        type="button"
                        onClick={() => setSelectedGarantiaId(garantia.id.toString())}
                        className={`text-left rounded-lg border p-3 transition ${
                          isSelected
                            ? "border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900 shadow-[0_10px_24px_-8px_rgba(2,132,199,0.65)]"
                            : "border-gray-200 dark:border-strokedark hover:border-sky-400"
                        }`}
                        disabled={submittingLink}
                      >
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fornecedor</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{garantia.nomeFornecedor || "--"}</p>

                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Garantia</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          Garantia #{garantia.notaInterna || garantia.id}
                        </p>

                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Abertura</p>
                        <p className="text-sm text-gray-800 dark:text-gray-100">{formatDate(garantia.dataCriacao)}</p>

                        <div className="mt-3">
                          <span
                            className="inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide whitespace-normal break-words leading-4"
                            style={{ borderColor: statusColor, color: statusColor, backgroundColor: statusBackground }}
                            title={statusLabel}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {loadingGarantias && <p className="text-xs text-gray-500">Carregando garantias...</p>}
              {!loadingGarantias && filteredGarantias.length === 0 && (
                <p className="text-xs text-gray-500">Nenhuma garantia encontrada para o filtro informado.</p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-strokedark flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkingEmailId(null)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-strokedark text-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarVinculo}
                disabled={!selectedGarantiaId || submittingLink}
                className="px-3 py-1.5 text-sm rounded-md bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-60"
              >
                {submittingLink ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
