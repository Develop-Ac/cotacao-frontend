"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAddCircleOutline, MdBlock, MdDeleteOutline, MdEdit, MdRefresh, MdSave } from "react-icons/md";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { mailAccountsClient } from "@/lib/email-service/clients";
import type { CreateMailAccountPayload, MailAccount } from "@/lib/email-service/types";

type FormState = {
  accountName: string;
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  authSecretRef: string;
  syncEnabled: boolean;
  sendEnabled: boolean;
};

const QUALIDADE_BOX = "QUALIDADE";

const emptyForm: FormState = {
  accountName: "",
  emailAddress: "",
  imapHost: "",
  imapPort: "993",
  imapSecure: true,
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: true,
  authSecretRef: "",
  syncEnabled: true,
  sendEnabled: true,
};

const toPayload = (form: FormState): CreateMailAccountPayload => ({
  tenantKey: QUALIDADE_BOX,
  contextType: "GARANTIA",
  accountName: form.accountName.trim(),
  emailAddress: form.emailAddress.trim(),
  imapHost: form.imapHost.trim(),
  imapPort: Number(form.imapPort),
  imapSecure: form.imapSecure,
  smtpHost: form.smtpHost.trim(),
  smtpPort: Number(form.smtpPort),
  smtpSecure: form.smtpSecure,
  authSecretRef: form.authSecretRef.trim(),
  syncEnabled: form.syncEnabled,
  sendEnabled: form.sendEnabled,
});

export default function SistemaEmailPage() {
  const router = useRouter();
  const [items, setItems] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const carregar = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await mailAccountsClient.list();
      setItems(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contas de e-mail.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const qualidadeAccounts = useMemo(
    () => items.filter((account) => account.tenantKey.toUpperCase() === QUALIDADE_BOX),
    [items],
  );

  const activeQualidadeAccount = useMemo(
    () => qualidadeAccounts.find((account) => account.statusCode === "ACTIVE"),
    [qualidadeAccounts],
  );

  const canCreateNewActive = !activeQualidadeAccount || editingId === activeQualidadeAccount.id;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (account: MailAccount) => {
    setEditingId(account.id);
    setForm({
      accountName: account.accountName,
      emailAddress: account.emailAddress,
      imapHost: account.imap.host,
      imapPort: String(account.imap.port),
      imapSecure: account.imap.secure,
      smtpHost: account.smtp.host,
      smtpPort: String(account.smtp.port),
      smtpSecure: account.smtp.secure,
      authSecretRef: account.authSecretRef,
      syncEnabled: account.syncEnabled,
      sendEnabled: account.sendEnabled,
    });
  };

  const submit = async () => {
    const payload = toPayload(form);
    if (!payload.accountName || !payload.emailAddress || !payload.imapHost || !payload.smtpHost || !payload.authSecretRef) {
      setError("Preencha todos os campos obrigatorios da conta.");
      return;
    }

    if (!canCreateNewActive && !editingId) {
      setError("Ja existe uma conta ativa para a caixa QUALIDADE. Inative a conta atual antes de cadastrar outra.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await mailAccountsClient.update(editingId, payload);
        setSuccess("Conta atualizada com sucesso.");
      } else {
        await mailAccountsClient.create(payload);
        setSuccess("Conta cadastrada com sucesso.");
      }
      resetForm();
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  };

  const inativar = async (accountId: number) => {
    setError(null);
    setSuccess(null);
    try {
      await mailAccountsClient.inactivate(accountId);
      setSuccess("Conta inativada com sucesso.");
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao inativar conta.");
    }
  };

  const excluir = async (account: MailAccount) => {
    if (account.hasReceivedMessages) {
      setError("Conta com mensagens recebidas nao pode ser excluida. Utilize a inativacao.");
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await mailAccountsClient.remove(account.id);
      setSuccess("Conta excluida com sucesso.");
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir conta.");
    }
  };

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
      <PageHeader
        title="Sistema > E-mails"
        subtitle="Cadastro e administracao da conta de e-mail da caixa QUALIDADE. Esta tela nao opera inbox."
        onBack={() => router.push("/sistema")}
      >
        <ActionButton
          label="Atualizar"
          icon={<MdRefresh size={18} />}
          variant="ghost"
          loading={refreshing}
          onClick={() => void carregar()}
        />
      </PageHeader>

      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Cadastro da Conta</h2>
          <span className="text-xs rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-blue-700 font-semibold">
            Caixa fixa: QUALIDADE
          </span>
        </div>

        {activeQualidadeAccount && editingId !== activeQualidadeAccount.id && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Ja existe uma conta ativa para QUALIDADE ({activeQualidadeAccount.emailAddress}).
            Para cadastrar novo e-mail, inative a conta atual.
          </div>
        )}

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Nome da conta</span>
            <input
              value={form.accountName}
              onChange={(event) => setForm((prev) => ({ ...prev, accountName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">E-mail</span>
            <input
              type="email"
              value={form.emailAddress}
              onChange={(event) => setForm((prev) => ({ ...prev, emailAddress: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">IMAP host</span>
            <input
              value={form.imapHost}
              onChange={(event) => setForm((prev) => ({ ...prev, imapHost: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">IMAP porta</span>
            <input
              value={form.imapPort}
              onChange={(event) => setForm((prev) => ({ ...prev, imapPort: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">SMTP host</span>
            <input
              value={form.smtpHost}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpHost: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">SMTP porta</span>
            <input
              value={form.smtpPort}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpPort: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Auth secret ref (usuario:senha)</span>
            <input
              value={form.authSecretRef}
              onChange={(event) => setForm((prev) => ({ ...prev, authSecretRef: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.imapSecure}
              onChange={(event) => setForm((prev) => ({ ...prev, imapSecure: event.target.checked }))}
            />
            IMAP seguro
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.smtpSecure}
              onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))}
            />
            SMTP seguro
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.syncEnabled}
              onChange={(event) => setForm((prev) => ({ ...prev, syncEnabled: event.target.checked }))}
            />
            Sync habilitado
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.sendEnabled}
              onChange={(event) => setForm((prev) => ({ ...prev, sendEnabled: event.target.checked }))}
            />
            Envio habilitado
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton
            label={editingId ? "Salvar edicao" : "Cadastrar conta"}
            icon={editingId ? <MdSave size={18} /> : <MdAddCircleOutline size={18} />}
            loading={saving}
            onClick={() => void submit()}
          />
          {editingId && (
            <ActionButton
              label="Cancelar edicao"
              variant="ghost"
              onClick={resetForm}
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-black mb-4">Contas da Caixa QUALIDADE</h3>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : qualidadeAccounts.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conta cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Conta</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Caixa</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Ja recebeu mensagem</th>
                  <th className="py-2 pr-4">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {qualidadeAccounts.map((account) => {
                  const canDelete = !account.hasReceivedMessages;
                  const statusChipClass =
                    account.statusCode === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-700 border-gray-200";

                  return (
                    <tr key={account.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{account.accountName}</td>
                      <td className="py-3 pr-4">{account.emailAddress}</td>
                      <td className="py-3 pr-4">{account.tenantKey}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusChipClass}`}>
                          {account.statusCode === "ACTIVE" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{account.hasReceivedMessages ? "Sim" : "Nao"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(account)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <MdEdit size={14} /> Editar
                          </button>

                          {account.statusCode === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => void inativar(account.id)}
                              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                            >
                              <MdBlock size={14} /> Inativar
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={!canDelete}
                            title={canDelete ? "Excluir conta" : "Conta com mensagem recebida nao pode ser excluida"}
                            onClick={() => void excluir(account)}
                            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <MdDeleteOutline size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
