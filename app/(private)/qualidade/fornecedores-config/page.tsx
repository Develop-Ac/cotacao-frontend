'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MdAddCircleOutline, MdContentCopy, MdEdit, MdRefresh, MdSearch } from "react-icons/md";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { FormModal } from "@/components/qualidade/FormModal";
import {
  CopiarFornecedorConfigPayload,
  FornecedorConfig,
  FornecedorConfigPayload,
} from "@/lib/qualidade/types";
import { QualidadeApi } from "@/lib/qualidade/api";

type ProcessoTipo = "portal" | "formulario" | "email" | "whatsapp";
type FormMode = "create" | "edit" | "copy";

interface FormState {
  erpFornecedorId: string;
  processoTipo: ProcessoTipo;
  portalLink: string;
  instrucoes: string;
  formularioPath: string;
  nomeFormulario: string;
  formularioFile: File | null;
}

const PROCESSO_OPTIONS: Array<{ value: ProcessoTipo; label: string }> = [
  { value: "portal", label: "Portal" },
  { value: "formulario", label: "Formulario" },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
];

const emptyForm: FormState = {
  erpFornecedorId: "",
  processoTipo: "portal",
  portalLink: "",
  instrucoes: "",
  formularioPath: "",
  nomeFormulario: "",
  formularioFile: null,
};

const toFormState = (item: FornecedorConfig): FormState => ({
  erpFornecedorId: item.erpFornecedorId > 0 ? String(item.erpFornecedorId) : "",
  processoTipo: (item.processoTipo as ProcessoTipo) ?? "portal",
  portalLink: item.portalLink ?? "",
  instrucoes: item.instrucoes ?? "",
  formularioPath: item.formularioPath ?? "",
  nomeFormulario: item.nomeFormulario ?? "",
  formularioFile: null,
});

export default function FornecedoresConfigPage() {
  const [items, setItems] = useState<FornecedorConfig[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [copySourceId, setCopySourceId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await QualidadeApi.listarConfigsFornecedor();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar configuracoes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const text = `${item.erpFornecedorId} ${item.nomeFornecedor ?? ""} ${item.processoTipo} ${item.instrucoes ?? ""}`.toLowerCase();
      return text.includes(term);
    });
  }, [items, search]);

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setCopySourceId(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const openEdit = (item: FornecedorConfig) => {
    setMode("edit");
    setEditingId(item.id ?? null);
    setCopySourceId(null);
    setForm(toFormState(item));
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const openCopy = (item: FornecedorConfig) => {
    setMode("copy");
    setEditingId(null);
    setCopySourceId(item.id ?? null);
    setForm({
      ...toFormState(item),
      erpFornecedorId: "",
      formularioFile: null,
    });
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const validateForm = (): string | null => {
    const erpId = Number(form.erpFornecedorId);
    if (!Number.isInteger(erpId) || erpId <= 0) {
      return "Informe um ERP fornecedor id valido.";
    }

    if (form.processoTipo === "portal" && !form.portalLink.trim()) {
      return "portal_link e obrigatorio para processo tipo Portal.";
    }

    if (form.processoTipo === "formulario" && !form.formularioPath.trim() && !form.formularioFile) {
      return "Formulario e obrigatorio para processo tipo Formulario.";
    }

    if ((form.processoTipo === "email" || form.processoTipo === "whatsapp") && !form.instrucoes.trim()) {
      return "instrucoes e obrigatorio para processo tipo E-mail e WhatsApp.";
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: FornecedorConfigPayload = {
      erpFornecedorId: Number(form.erpFornecedorId),
      processoTipo: form.processoTipo,
      portalLink: form.portalLink.trim() || undefined,
      instrucoes: form.instrucoes.trim() || undefined,
      formularioPath: form.formularioPath.trim() || undefined,
      nomeFormulario: form.nomeFormulario.trim() || undefined,
    };

    setSaving(true);
    setError(null);

    try {
      if (mode === "create") {
        await QualidadeApi.criarConfigFornecedor(payload, form.formularioFile ?? undefined);
      } else if (mode === "edit") {
        if (!editingId) {
          throw new Error("Registro para edicao nao foi encontrado.");
        }
        await QualidadeApi.atualizarConfigFornecedor(editingId, payload, form.formularioFile ?? undefined);
      } else {
        if (!copySourceId) {
          throw new Error("Registro de origem para copia nao foi encontrado.");
        }
        const copyPayload: CopiarFornecedorConfigPayload = {
          novoErpFornecedorId: Number(form.erpFornecedorId),
        };
        await QualidadeApi.copiarConfigFornecedor(copySourceId, copyPayload);
      }

      setSuccess(mode === "copy" ? "Cadastro copiado com sucesso." : "Cadastro salvo com sucesso.");
      setModalOpen(false);
      await carregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cadastro.");
    } finally {
      setSaving(false);
    }
  };

  const modalTitle =
    mode === "create" ? "Novo cadastro de fornecedor" : mode === "edit" ? "Editar cadastro" : "Copiar cadastro";

  const isCopyMode = mode === "copy";

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
      <FormModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        width="lg"
        footer={(
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:text-gray-200 dark:hover:bg-meta-4"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando..." : mode === "copy" ? "Copiar" : "Salvar"}
            </button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ERP fornecedor id</span>
            <input
              type="number"
              min={1}
              value={form.erpFornecedorId}
              onChange={(event) => setForm((prev) => ({ ...prev, erpFornecedorId: event.target.value }))}
              placeholder="Ex.: 1234"
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Processo tipo</span>
            <select
              value={form.processoTipo}
              disabled={isCopyMode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  processoTipo: event.target.value as ProcessoTipo,
                }))
              }
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
            >
              {PROCESSO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {form.processoTipo === "portal" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Portal link</span>
            <input
              type="url"
              value={form.portalLink}
              disabled={isCopyMode}
              onChange={(event) => setForm((prev) => ({ ...prev, portalLink: event.target.value }))}
              placeholder="https://fornecedor.com/portal"
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </label>
        )}

        {form.processoTipo === "formulario" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome do formulario</span>
              <input
                type="text"
                value={form.nomeFormulario}
                disabled={isCopyMode}
                onChange={(event) => setForm((prev) => ({ ...prev, nomeFormulario: event.target.value }))}
                placeholder="Ex.: FORMULARIO_GARANTIA.xlsx"
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Arquivo formulario</span>
              <input
                type="file"
                disabled={isCopyMode}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm((prev) => ({
                    ...prev,
                    formularioFile: file,
                    formularioPath: file?.name ?? prev.formularioPath,
                    nomeFormulario: file?.name ?? prev.nomeFormulario,
                  }));
                }}
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">formulario_path</span>
              <input
                type="text"
                value={form.formularioPath}
                disabled={isCopyMode}
                onChange={(event) => setForm((prev) => ({ ...prev, formularioPath: event.target.value }))}
                placeholder="Nome do arquivo salvo"
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Instrucoes</span>
          <textarea
            rows={5}
            value={form.instrucoes}
            disabled={isCopyMode}
            onChange={(event) => setForm((prev) => ({ ...prev, instrucoes: event.target.value }))}
            placeholder="Descreva as instrucoes de garantia"
            className="rounded-lg border border-gray-300 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-form-strokedark dark:bg-form-input dark:text-white"
          />
        </label>
      </FormModal>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black dark:text-white">
            <Link href="/" className="hover:text-primary transition-colors">Intranet</Link> / Fornecedores Config
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Base de configuracao padrao da garantia por fornecedor</p>
        </div>
        <div className="flex gap-3">
          <ActionButton
            label="Novo cadastro"
            icon={<MdAddCircleOutline size={18} />}
            shape="rounded"
            onClick={openCreate}
          />
          <ActionButton
            label="Atualizar"
            icon={<MdRefresh size={18} />}
            variant="ghost"
            shape="rounded"
            onClick={carregar}
            loading={refreshing}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-boxdark rounded-xl border border-gray-100 dark:border-strokedark p-5 shadow-sm space-y-4">
        <label className="relative block">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por ERP ID, nome do fornecedor, tipo ou instrucoes"
            className="w-full rounded-lg border border-gray-300 dark:border-form-strokedark bg-white dark:bg-form-input py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-lg bg-gray-100 dark:bg-meta-4 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark p-12 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Nenhum fornecedor configurado</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cadastre um novo fornecedor para iniciar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-strokedark">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-meta-4 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">ID</th>
                  <th className="px-3 py-2 text-left font-semibold">ERP fornecedor</th>
                  <th className="px-3 py-2 text-left font-semibold">Nome fornecedor</th>
                  <th className="px-3 py-2 text-left font-semibold">Processo</th>
                  <th className="px-3 py-2 text-left font-semibold">Portal/Formulario</th>
                  <th className="px-3 py-2 text-left font-semibold">Instrucoes</th>
                  <th className="px-3 py-2 text-left font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id ?? `${item.erpFornecedorId}-${item.processoTipo}`} className="border-t border-gray-100 dark:border-strokedark">
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{item.id ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{item.erpFornecedorId}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{item.nomeFornecedor ?? "Nao encontrado"}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200 uppercase">{item.processoTipo}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {item.processoTipo === "portal" ? item.portalLink ?? "-" : item.nomeFormulario ?? item.formularioPath ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200 max-w-[360px] truncate" title={item.instrucoes ?? undefined}>
                      {item.instrucoes ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-strokedark dark:text-gray-200 dark:hover:bg-meta-4"
                        >
                          <MdEdit size={15} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openCopy(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        >
                          <MdContentCopy size={15} />
                          Copiar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
