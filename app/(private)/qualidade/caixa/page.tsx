'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { QualidadeApi } from "@/lib/qualidade/api";
import { InboxEmail } from "@/lib/qualidade/types";
import { formatDateTime, stripHtml } from "@/lib/qualidade/formatters";
import { MdRefresh, MdSync } from "react-icons/md";

export default function CaixaDeEntradaPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-6 space-y-6">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl bg-white dark:bg-boxdark border border-gray-200 dark:border-strokedark animate-pulse" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark p-12 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Nenhum e-mail por aqui</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Clique em “Sincronizar” para requisitar a leitura da caixa.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <button
              key={email.id}
              type="button"
              onClick={() => email.garantiaId && router.push(`/qualidade/${email.garantiaId}`)}
              className="w-full text-left rounded-3xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-5 shadow-sm hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{email.assunto || "(sem assunto)"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{email.remetente}</p>
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${email.garantiaId
                      ? "bg-lime-100 dark:bg-lime-900/20 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-800"
                      : "bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    }`}
                >
                  {email.garantiaId ? `Garantia #${email.garantiaId}` : "Não vinculado"}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-3">{stripHtml(email.corpoHtml) || "Sem conteúdo exibível."}</p>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-4">
                <span>{formatDateTime(email.dataRecebimento)}</span>
                {email.attachments.length > 0 && (
                  <span className="font-semibold text-primary">{email.attachments.length} anexo(s)</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
