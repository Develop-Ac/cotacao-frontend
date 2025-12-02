'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { QualidadeApi } from "@/lib/qualidade/api";
import type { FornecedorConfig, UploadAttachment, VendaDetalhes } from "@/lib/qualidade/types";
import {
  MdCheckCircle,
  MdCleaningServices,
  MdDelete,
  MdFileDownload,
  MdSearch,
  MdSwapHoriz,
} from "react-icons/md";

const initialForm = {
  nomeFornecedor: "",
  notaInterna: "",
  produtos: "",
  descricao: "",
  emailFornecedor: "",
  copiasEmail: "",
  tipoGarantia: "Avaria",
  protocoloFornecedor: "",
  nfsCompra: "",
};

type ProdutoTipo = "Avaria" | "Anomalia";

interface ProdutoFormEntry {
  id: string;
  codigo?: string;
  descricao?: string;
  quantidade?: number;
  selected: boolean;
  tipo: ProdutoTipo;
  nfCompra: string;
  refFabricante: string;
}

const PRODUTO_TIPOS: ProdutoTipo[] = ["Avaria", "Anomalia"];
const TIPO_GARANTIA_OPTIONS = ["Avaria", "Anomalia", "Avaria/Anomalia"];
// API aceita no maximo 10 anexos por requisicao, entao enviamos em lotes.
const MAX_ATTACHMENTS_PER_REQUEST = 10;
const CLOSED_GARANTIA_STATUS = new Set<number>([14, 15, 16]);

const isGarantiaStatusAberta = (status?: number | null): boolean => {
  if (typeof status !== "number") return true;
  return !CLOSED_GARANTIA_STATUS.has(status);
};

const chunkAttachments = (items: UploadAttachment[], chunkSize: number): UploadAttachment[][] => {
  if (items.length === 0) return [];
  if (chunkSize <= 0) return [items];
  const chunks: UploadAttachment[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const isExpiringStorageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    const params = parsed.searchParams;
    return (
      params.has("X-Amz-Signature") ||
      params.has("X-Amz-Credential") ||
      params.has("X-Amz-Security-Token")
    );
  } catch {
    return false;
  }
};

const extractStorageKeyFromUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (!pathname) return null;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) {
      return segments[0] ?? null;
    }
    const host = parsed.hostname.toLowerCase();
    const bucketInHost = host.startsWith(`${segments[0].toLowerCase()}.`);
    return bucketInHost ? segments.join("/") : segments.slice(1).join("/");
  } catch {
    return null;
  }
};

type InitialGarantiaData = Partial<{
  nomeFornecedor: string;
  notaInterna: string;
  emailFornecedor: string;
  copiasEmail: string;
  produtos: string;
  descricao: string;
  tipoGarantia: string;
  protocoloFornecedor: string;
  nfsCompra: string;
}>;

interface NovaGarantiaFormProps {
  variant?: "page" | "modal";
  onSuccess?: () => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
  garantiaId?: number;
  initialData?: InitialGarantiaData;
  initialErpFornecedorId?: number | null;
}

const formatProdutosFromVenda = (produtos: VendaDetalhes["produtos"]): string => {
  if (!Array.isArray(produtos) || produtos.length === 0) return "";
  return produtos
    .map((item) => {
      const codigo = item.codigo?.toString().trim();
      const descricao = item.descricao?.trim();
      const base = [codigo, descricao].filter(Boolean).join(" - ") || descricao || codigo || "Produto";
      const quantidade =
        typeof item.quantidade === "number" && Number.isFinite(item.quantidade)
          ? ` (Qtd: ${item.quantidade})`
          : "";
      return `${base}${quantidade}`;
    })
    .join("\n");
};

const sanitizeEmails = (emails?: string[]): string[] =>
  Array.isArray(emails)
    ? emails.map((email) => email?.trim()).filter((email): email is string => Boolean(email))
    : [];

const extractEmailInfo = (emails?: string[]) => {
  const normalized = sanitizeEmails(emails);
  const principal = normalized[0];
  const copias = normalized.slice(1);
  return {
    principal,
    copias: copias.length > 0 ? copias.join(", ") : undefined,
  };
};

const preferValue = (current: string, incoming?: string) => {
  const trimmed = incoming?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : current;
};

const describeProdutoPayload = (produto: ProdutoFormEntry) => {
  const base = [produto.codigo, produto.descricao].filter(Boolean).join(" - ") || produto.descricao || produto.codigo || "Produto";
  const tipo = produto.tipo ? ` (${produto.tipo})` : "";
  const quantidade =
    typeof produto.quantidade === "number" && Number.isFinite(produto.quantidade)
      ? ` (Qtd: ${produto.quantidade})`
      : "";
  const nf = produto.nfCompra.trim() ? ` (NF Compra: ${produto.nfCompra.trim()})` : "";
  const ref = produto.refFabricante.trim() ? ` (Ref: ${produto.refFabricante.trim()})` : "";
  return `${base}${tipo}${quantidade}${nf}${ref}`;
};



export const NovaGarantiaForm = ({
  variant = "page",
  onSuccess,
  onCancel,
  mode = "create",
  garantiaId,
  initialData,
  initialErpFornecedorId = null,
}: NovaGarantiaFormProps) => {
  const isEditMode = mode === "edit";
  const [form, setForm] = useState(initialForm);
  const [produtosForm, setProdutosForm] = useState<ProdutoFormEntry[]>([]);
  const [erpFornecedorId, setErpFornecedorId] = useState<number | null>(null);
  const [vendaProdutos, setVendaProdutos] = useState<VendaDetalhes["produtos"]>([]);
  const [fornecedorConfig, setFornecedorConfig] = useState<FornecedorConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [formularioFile, setFormularioFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [formularioDownloadUrl, setFormularioDownloadUrl] = useState<string | null>(null);
  const [formularioDownloadKey, setFormularioDownloadKey] = useState<string | null>(null);
  const [formularioDownloadError, setFormularioDownloadError] = useState<string | null>(null);
  const [formularioDownloadLoading, setFormularioDownloadLoading] = useState(false);
  const [lookupValue, setLookupValue] = useState("");
  const [step, setStep] = useState<"lookup" | "form">(mode === "edit" ? "form" : "lookup");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [skipEmail, setSkipEmail] = useState(true);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState<string>("");

  const normalizedInitialData = useMemo(() => {
    const base = initialData ?? {};
    return {
      ...initialForm,
      ...base,
      nomeFornecedor: base.nomeFornecedor ?? initialForm.nomeFornecedor,
      notaInterna: base.notaInterna ?? initialForm.notaInterna,
      emailFornecedor: base.emailFornecedor ?? initialForm.emailFornecedor,
      copiasEmail: base.copiasEmail ?? initialForm.copiasEmail,
      produtos: base.produtos ?? initialForm.produtos,
      descricao: base.descricao ?? initialForm.descricao,
      tipoGarantia: base.tipoGarantia ?? initialForm.tipoGarantia,
      protocoloFornecedor: base.protocoloFornecedor ?? initialForm.protocoloFornecedor,
      nfsCompra: base.nfsCompra ?? initialForm.nfsCompra,
    };
  }, [initialData]);

  const usingDetailedProdutos = produtosForm.length > 0;
  const produtosSelecionados = useMemo(
    () => produtosForm.filter((produto) => produto.selected),
    [produtosForm],
  );
  const availableProdutosParaAdicionar = useMemo(() => {
    const existingCodes = new Set(
      produtosForm
        .map((produto) => produto.codigo?.toString().trim().toLowerCase())
        .filter((codigo): codigo is string => Boolean(codigo)),
    );
    return vendaProdutos.filter((produto) => {
      const codigo = produto.codigo?.toString().trim().toLowerCase();
      if (!codigo) return false;
      return !existingCodes.has(codigo);
    });
  }, [produtosForm, vendaProdutos]);
  const tipoGarantiaCalculado = useMemo(() => {
    if (produtosSelecionados.length === 0) return null;
    const hasAvaria = produtosSelecionados.some((produto) => produto.tipo === "Avaria");
    const hasAnomalia = produtosSelecionados.some((produto) => produto.tipo === "Anomalia");
    if (hasAvaria && hasAnomalia) return "Avaria/Anomalia";
    return hasAvaria ? "Avaria" : "Anomalia";
  }, [produtosSelecionados]);
  const processoTipo = fornecedorConfig?.processoTipo?.toLowerCase();
  const isPortalProcesso = processoTipo === "portal";
  const isFormularioProcesso = processoTipo === "formulario";
  const portalLink = fornecedorConfig?.portalLink ?? undefined;
  const fornecedorInstrucoes = fornecedorConfig?.instrucoes?.trim();
  const lockLookupFields = !isEditMode && Boolean(erpFornecedorId);

  const containerClass =
    variant === "page"
      ? "bg-white dark:bg-boxdark rounded-3xl border border-gray-200 dark:border-strokedark shadow-sm py-6 pr-6 pl-8 space-y-5"
      : "space-y-5";

  const resetFields = () => {
    setForm(initialForm);
    setLookupValue("");
    setLookupError(null);
    setLookupMessage(null);
    setProdutosForm([]);
    setVendaProdutos([]);
    setSkipEmail(true);
    setFormularioFile(null);
    setMediaFiles([]);
    setFornecedorConfig(null);
    setErpFornecedorId(null);
    setConfigError(null);
    setConfigLoading(false);
    setFormularioDownloadUrl(null);
    setFormularioDownloadKey(null);
    setFormularioDownloadError(null);
    setFormularioDownloadLoading(false);
    setProdutoParaAdicionar("");
    setStep("lookup");
  };

  const carregarConfiguracaoFornecedor = async (erpId: number) => {
    setConfigLoading(true);
    setConfigError(null);
    setFormularioDownloadUrl(null);
    setFormularioDownloadKey(null);
    setFormularioDownloadError(null);
    setFormularioDownloadLoading(false);
    try {
      const config = await QualidadeApi.obterConfigFornecedor(erpId);
      setFornecedorConfig(config);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível carregar as instruções do fornecedor.";
      if (/nenhuma/i.test(message) || /não encontrada/i.test(message)) {
        setFornecedorConfig(null);
        setFormularioDownloadUrl(null);
        setFormularioDownloadKey(null);
        setFormularioDownloadError(null);
        setConfigError(null);
      } else {
        setFornecedorConfig(null);
        setFormularioDownloadUrl(null);
        setFormularioDownloadKey(null);
        setFormularioDownloadError(null);
        setConfigError(message);
      }
    } finally {
      setConfigLoading(false);
      setFormularioDownloadLoading(false);
    }
  };

  const buildProdutoEntry = (produto: VendaDetalhes["produtos"][number], index: number): ProdutoFormEntry => ({
    id: `${produto.codigo ?? index}-${index}`,
    codigo: produto.codigo?.toString(),
    descricao: produto.descricao,
    quantidade: produto.quantidade,
    selected: true,
    tipo: "Avaria",
    nfCompra: "",
    refFabricante: "",
  });

  const setProdutosFromVenda = useCallback((produtos: VendaDetalhes["produtos"]) => {
    setVendaProdutos(produtos);
    setProdutosForm(produtos.map((produto, index) => buildProdutoEntry(produto, index)));
  }, []);

  useEffect(() => {
    setFormularioDownloadError(null);
    setFormularioDownloadLoading(false);
    const rawUrl = fornecedorConfig?.formularioUrl?.trim();
    const rawPath = fornecedorConfig?.formularioPath?.trim();
    const urlLooksExpiring = rawUrl ? isExpiringStorageUrl(rawUrl) : false;

    let resolvedKey = rawPath ?? null;
    if (!resolvedKey && rawUrl && urlLooksExpiring) {
      resolvedKey = extractStorageKeyFromUrl(rawUrl);
    }

    if (rawUrl && !urlLooksExpiring) {
      setFormularioDownloadUrl(rawUrl);
      setFormularioDownloadKey(null);
      return;
    }

    if (!resolvedKey) {
      setFormularioDownloadUrl(null);
      setFormularioDownloadKey(null);
      return;
    }

    if (/^https?:\/\//i.test(resolvedKey)) {
      setFormularioDownloadUrl(resolvedKey);
      setFormularioDownloadKey(null);
      return;
    }

    setFormularioDownloadUrl(null);
    setFormularioDownloadKey(resolvedKey);
  }, [fornecedorConfig?.formularioPath, fornecedorConfig?.formularioUrl]);

  useEffect(() => {
    if (!isEditMode) return;
    setForm(normalizedInitialData);
    setLookupValue(normalizedInitialData.notaInterna ?? "");
    setLookupMessage(null);
    setLookupError(null);
    setStep("form");
    setProdutosForm([]);
    setSkipEmail(true);
    setFormularioFile(null);
    setMediaFiles([]);
    setFornecedorConfig(null);
    setErpFornecedorId(initialErpFornecedorId);
    setConfigError(null);
    setConfigLoading(false);
    setFormularioDownloadUrl(null);
    setFormularioDownloadKey(null);
    setFormularioDownloadError(null);
    setFormularioDownloadLoading(false);
    setProdutoParaAdicionar("");
    setVendaProdutos([]);
  }, [initialErpFornecedorId, isEditMode, normalizedInitialData]);

  useEffect(() => {
    if (!isEditMode) return;
    const ni = normalizedInitialData.notaInterna?.trim();
    if (!ni) return;
    let cancelled = false;
    setLookupLoading(true);
    (async () => {
      try {
        const venda = await QualidadeApi.consultarVenda(ni);
        if (cancelled) return;
        setProdutosFromVenda(venda.produtos);
        setVendaProdutos(venda.produtos);
        if (venda.fornecedorConfig) {
          setFornecedorConfig(venda.fornecedorConfig);
        }
        if (!initialErpFornecedorId && venda.cliente.codigo) {
          setErpFornecedorId(venda.cliente.codigo);
        }
      } catch (err) {
        if (!cancelled) {
          setLookupError(err instanceof Error ? err.message : "Falha ao carregar produtos da venda.");
        }
      } finally {
        if (!cancelled) {
          setLookupLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // use efetivamente apenas os valores de dependência estáveis
  }, [initialErpFornecedorId, isEditMode, normalizedInitialData.notaInterna, setProdutosFromVenda]);

  const handleFormularioDownload = useCallback(async () => {
    if (formularioDownloadLoading) return;
    const key = formularioDownloadKey?.trim();
    if (!key) return;
    setFormularioDownloadLoading(true);
    setFormularioDownloadError(null);
    try {
      const url = await QualidadeApi.gerarLinkArquivo(key);
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setFormularioDownloadError(
        err instanceof Error ? err.message : "Nao foi possivel gerar o link do formulario.",
      );
    } finally {
      setFormularioDownloadLoading(false);
    }
  }, [formularioDownloadKey, formularioDownloadLoading]);





  const adicionarProdutoPorCodigo = (codigo: string) => {
    const target = vendaProdutos.find(
      (produto) => produto.codigo?.toString().trim().toLowerCase() === codigo.trim().toLowerCase(),
    );
    if (!target) return;
    setProdutosForm((prev) => [...prev, buildProdutoEntry(target, prev.length)]);
    setProdutoParaAdicionar("");
  };

  const updateProduto = (id: string, patch: Partial<ProdutoFormEntry>) => {
    setProdutosForm((prev) =>
      prev.map((produto) => (produto.id === id ? { ...produto, ...patch } : produto)),
    );
  };

  const handleFormularioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormularioFile(null);
      return;
    }
    setFormularioFile(file);
    event.target.value = "";
  };


  const removeFormularioFile = () => setFormularioFile(null);

  const handleMediaFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setMediaFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  };


  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const findGarantiaIdByNi = useCallback(async (notaInternaBusca: string) => {
    const normalized = notaInternaBusca.trim().toLowerCase();
    if (!normalized) return null;
    const attempts = 3;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const garantias = await QualidadeApi.listarGarantias();
        const match = garantias
          .filter((garantia) => garantia.notaInterna?.trim().toLowerCase() === normalized)
          .sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime())[0];
        if (match) {
          return match.id;
        }
      } catch {
        // ignore fetch errors and retry
      }
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    return null;
  }, []);

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ni = lookupValue.trim();
    if (!ni) {
      setLookupError("Informe o número da venda (NI).");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookupMessage(null);
    try {
      const normalizedNi = ni.toLowerCase();
      const garantias = await QualidadeApi.listarGarantias();
      const hasGarantiaAberta = garantias.some((garantia) => {
        const garantiaNi = garantia.notaInterna?.trim().toLowerCase();
        return garantiaNi === normalizedNi && isGarantiaStatusAberta(garantia.status);
      });
      if (hasGarantiaAberta) {
        const confirmed = typeof window === "undefined"
          ? true
          : window.confirm("Já existe uma garantia aberta para essa NI. Deseja continuar mesmo assim?");
        if (!confirmed) {
          setLookupError("Já existe uma garantia aberta para essa NI. Confirme para prosseguir.");
          return;
        }
        setLookupError(null);
      }
      const venda = await QualidadeApi.consultarVenda(ni);
      const produtosDescricao = formatProdutosFromVenda(venda.produtos);
      const emails = extractEmailInfo(venda.cliente.emails);
      setFormularioFile(null);
      setMediaFiles([]);
      setFornecedorConfig(null);
      setConfigError(null);
      setErpFornecedorId(venda.cliente.codigo);
      if (venda.cliente.codigo) {
        void carregarConfiguracaoFornecedor(venda.cliente.codigo);
      }
      setForm((prev) => ({
        ...prev,
        notaInterna: ni,
        nomeFornecedor: preferValue(prev.nomeFornecedor, venda.cliente.nome),
        emailFornecedor: preferValue(prev.emailFornecedor, emails.principal),
        copiasEmail: preferValue(prev.copiasEmail, emails.copias),
        produtos: preferValue(prev.produtos, produtosDescricao),
      }));
      setProdutosFromVenda(venda.produtos);
      setVendaProdutos(venda.produtos);
      if (venda.fornecedorConfig) {
        setFornecedorConfig(venda.fornecedorConfig);
      } else if (venda.cliente.codigo) {
        void carregarConfiguracaoFornecedor(venda.cliente.codigo);
      }
      if (!venda.fornecedorConfig && !venda.cliente.codigo) {
        setFornecedorConfig(null);
        setFormularioDownloadUrl(null);
        setFormularioDownloadError(null);
      }
      setLookupValue(ni);
      setLookupMessage(`Dados carregados para ${venda.cliente.nome}`);
      setFeedback(null);
      setStep("form");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Falha ao consultar a venda.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleManualContinue = () => {
    setForm((prev) => ({ ...prev, notaInterna: lookupValue.trim() }));
    setLookupError(null);
    setLookupMessage(null);
    setProdutosForm([]);
    setVendaProdutos([]);
    setErpFornecedorId(null);
    setFornecedorConfig(null);
    setConfigError(null);
    setFormularioFile(null);
    setMediaFiles([]);
    setFormularioDownloadUrl(null);
    setFormularioDownloadError(null);
    setStep("form");
  };

  const handleChangeNi = () => {
    if (isEditMode) return;
    setLookupValue(form.notaInterna);
    setLookupMessage(null);
    setFornecedorConfig(null);
    setErpFornecedorId(null);
    setConfigError(null);
    setFormularioFile(null);
    setMediaFiles([]);
    setFormularioDownloadUrl(null);
    setFormularioDownloadError(null);
    setProdutosForm([]);
    setVendaProdutos([]);
    setStep("lookup");
  };

  const handleClear = () => {
    if (isEditMode) {
      setForm(normalizedInitialData);
      setLookupValue(normalizedInitialData.notaInterna ?? "");
      setSkipEmail(true);
      if (vendaProdutos.length > 0) {
        setProdutosFromVenda(vendaProdutos);
      }
      setMediaFiles([]);
      setFormularioFile(null);
      setFeedback(null);
      return;
    }
    resetFields();
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nomeFornecedor = form.nomeFornecedor.trim();
    const notaInterna = form.notaInterna.trim();
    const manualProdutos = form.produtos.trim();
    const usandoProdutosDetalhados = produtosForm.length > 0;
    if (!nomeFornecedor || !notaInterna) {
      setFeedback({ type: "error", message: "Informe fornecedor e NI." });
      return;
    }
    if (!isEditMode && !erpFornecedorId) {
      setFeedback({
        type: "error",
        message: "Busque a venda no sistema para carregar o fornecedor.",
      });
      return;
    }
    if (!usandoProdutosDetalhados && !manualProdutos) {
      setFeedback({ type: "error", message: "Descreva os produtos envolvidos." });
      return;
    }
    const selecionados = produtosSelecionados;
    if (usandoProdutosDetalhados && selecionados.length === 0) {
      setFeedback({ type: "error", message: "Selecione pelo menos um produto para a garantia." });
      return;
    }
    if (isPortalProcesso && !form.protocoloFornecedor.trim()) {
      setFeedback({ type: "error", message: "Informe o número do protocolo do fornecedor." });
      return;
    }
    if (isFormularioProcesso && !formularioFile) {
      setFeedback({ type: "error", message: "Anexe o formulário preenchido antes de enviar." });
      return;
    }
    const emailFornecedor = form.emailFornecedor.trim();
    if (!skipEmail && !emailFornecedor) {
      setFeedback({
        type: "error",
        message: "Informe o e-mail principal do fornecedor ou marque para não enviar e-mail.",
      });
      return;
    }

    const produtosPayload = usandoProdutosDetalhados
      ? selecionados.map(describeProdutoPayload).join("; ")
      : manualProdutos;
    const tipoGarantiaPayload = usandoProdutosDetalhados
      ? tipoGarantiaCalculado ?? "Avaria"
      : (form.tipoGarantia || "Avaria");
    const nfsCompraPayload = usandoProdutosDetalhados
      ? Array.from(
        new Set(
          selecionados
            .map((produto) => produto.nfCompra.trim())
            .filter((nf) => nf.length > 0),
        ),
      ).join(", ")
      : form.nfsCompra.trim();
    const copiasEmail = form.copiasEmail.trim();
    const attachments: UploadAttachment[] = [];
    if (formularioFile) {
      attachments.push({ file: formularioFile });
    }
    mediaFiles.forEach((file) => attachments.push({ file }));
    const attachmentChunks = chunkAttachments(attachments, MAX_ATTACHMENTS_PER_REQUEST);
    const initialAttachments = attachmentChunks.shift();
    const extraAttachmentChunks = attachmentChunks;
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        erpFornecedorId: erpFornecedorId ?? undefined,
        nomeFornecedor,
        notaInterna,
        notaFiscal: notaInterna,
        produtos: produtosPayload,
        descricao: form.descricao.trim(),
        emailFornecedor: skipEmail ? undefined : emailFornecedor,
        copiasEmail: skipEmail ? undefined : copiasEmail || undefined,
        tipoGarantia: tipoGarantiaPayload,
        protocoloFornecedor: isPortalProcesso ? form.protocoloFornecedor.trim() : undefined,
        nfsCompra: nfsCompraPayload,
        outrosMeios: isPortalProcesso ? true : undefined,
        anexos: initialAttachments && initialAttachments.length > 0 ? initialAttachments : undefined,
      };
      if (isEditMode) {
        if (!garantiaId) throw new Error("Nenhuma garantia informada para edição.");
        await QualidadeApi.atualizarGarantia(garantiaId, payload);
      } else {
        await QualidadeApi.criarGarantia(payload);
      }
      const garantiaIdResolved =
        isEditMode && garantiaId
          ? garantiaId
          : extraAttachmentChunks.length > 0
            ? await findGarantiaIdByNi(notaInterna)
            : null;
      if (!isEditMode && extraAttachmentChunks.length > 0 && !garantiaIdResolved) {
        throw new Error("Garantia criada, mas nao foi possivel anexar todos os arquivos.");
      }
      if (garantiaIdResolved && extraAttachmentChunks.length > 0) {
        for (const chunk of extraAttachmentChunks) {
          if (chunk.length === 0) continue;
          await QualidadeApi.enviarAtualizacao(garantiaIdResolved, {
            descricao: "Anexos adicionais enviados automaticamente.",
            enviarEmail: false,
            anexos: chunk,
          });
        }
      }
      setFeedback({ type: "success", message: isEditMode ? "Garantia atualizada com sucesso!" : "Garantia criada com sucesso!" });
      onSuccess?.();
      if (isEditMode) {
        setSubmitting(false);
        return;
      }
      resetFields();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao enviar solicitação.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "lookup") {
    return (
      <form onSubmit={handleLookup} className={containerClass}>
        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
          >
            {feedback.message}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">Informe o número da venda (NI)</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Buscaremos os dados automaticamente no sistema.</p>
          </div>
          <label className="flex flex-col gap-2 ml-2 md:ml-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Número da venda (NI)</span>
            <input
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              placeholder="Ex.: NI12345"
              className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              label="Buscar venda"
              icon={<MdSearch size={18} />}
              type="submit"
              loading={lookupLoading}
              className="rounded-xl px-5 py-2.5"
            />
            <button
              type="button"
              onClick={handleManualContinue}
              className="keep-color text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Preencher manualmente
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="keep-color text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={containerClass}>
      {lookupMessage && (
        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-400">
          {lookupMessage}
        </div>
      )}
      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success"
            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400"
            : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            }`}
        >
          {feedback.message}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Venda selecionada:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{form.notaInterna || lookupValue}</span>
          </p>
          {!isEditMode && (
            <button
              type="button"
              onClick={handleChangeNi}
              className="keep-color inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 mt-1"
            >
              <MdSwapHoriz size={16} />
              Alterar NI
            </button>
          )}
        </div>
        <ActionButton
          label="Limpar"
          variant="ghost"
          icon={<MdCleaningServices size={18} />}
          onClick={handleClear}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Fornecedor *"
          value={form.nomeFornecedor}
          readOnly={lockLookupFields}
          disabled={lockLookupFields}
          onChange={(event) => setForm((prev) => ({ ...prev, nomeFornecedor: event.target.value }))}
        />
        <Field
          label="Nota Interna (NI) *"
          value={form.notaInterna}
          readOnly={lockLookupFields}
          disabled={lockLookupFields}
          onChange={(event) => setForm((prev) => ({ ...prev, notaInterna: event.target.value }))}
        />
        <Field
          label={`E-mail principal${skipEmail ? "" : " *"}`}
          type="email"
          value={form.emailFornecedor}
          disabled={skipEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, emailFornecedor: event.target.value }))}
        />
        <Field
          label="Cópias (separe por vírgula)"
          value={form.copiasEmail}
          disabled={skipEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, copiasEmail: event.target.value }))}
        />
        <label className="flex items-center gap-2 text-sm ml-[3px] opacity-70 cursor-not-allowed">
          <input type="hidden" name="skipEmail" value="true" />
          <input
            type="checkbox"
            checked
            readOnly
            className="h-4 w-4 rounded border-gray-300 dark:border-strokedark accent-primary"
          />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Não enviar e-mails ao fornecedor</span>
        </label>
        <>
          <Field
            label="NF Compra"
            value={form.nfsCompra}
            onChange={(event) => setForm((prev) => ({ ...prev, nfsCompra: event.target.value }))}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo de Garantia</span>
            <select
              value={form.tipoGarantia}
              onChange={(event) => setForm((prev) => ({ ...prev, tipoGarantia: event.target.value }))}
              className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPO_GARANTIA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </>
        {isPortalProcesso && (
          <Field
            label="Protocolo do Fornecedor"
            value={form.protocoloFornecedor}
            onChange={(event) => setForm((prev) => ({ ...prev, protocoloFornecedor: event.target.value }))}
          />
        )}
      </div>
      {!usingDetailedProdutos && (
        <Field
          label="Produtos envolvidos *"
          textarea
          rows={3}
          placeholder="Separe linhas ou use ponto e vírgula"
          value={form.produtos}
          onChange={(event) => setForm((prev) => ({ ...prev, produtos: event.target.value }))}
        />
      )}
      <Field
        label="Descrição detalhada"
        textarea
        rows={4}
        value={form.descricao}
        onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
      />
      {(configLoading || fornecedorConfig || configError) && (
        <section className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Instruções do fornecedor</p>
          {configLoading && <p className="text-xs text-gray-500 dark:text-gray-400">Carregando instruções especiais...</p>}
          {!configLoading && fornecedorConfig && (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {fornecedorInstrucoes && <p className="whitespace-pre-line">{fornecedorInstrucoes}</p>}
              {isPortalProcesso && (
                <>
                  <p>Este fornecedor utiliza um portal próprio para abertura de garantias.</p>
                  {portalLink && (
                    <a
                      href={portalLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                    >
                      <MdFileDownload size={16} />
                      Acessar portal do fornecedor
                    </a>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Informe o número do protocolo emitido pelo portal antes de salvar a garantia.
                  </p>
                </>
              )}
              {isFormularioProcesso && (
                <>
                  <p>Este fornecedor exige o preenchimento e envio de um formulário específico.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Utilize o card &quot;Formulário preenchido&quot; abaixo para baixar, preencher e anexar o documento
                    obrigatório.
                  </p>
                </>
              )}
              {!isPortalProcesso && !isFormularioProcesso && !fornecedorInstrucoes && (
                <p>Este fornecedor segue o fluxo padrão de abertura.</p>
              )}
            </div>
          )}
          {configError && !configLoading && <p className="text-xs text-red-600">{configError}</p>}
        </section>
      )}
      {usingDetailedProdutos && (
        <section className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Produtos da venda</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {produtosSelecionados.length}/{produtosForm.length} selecionados
              </p>
            </div>
            {tipoGarantiaCalculado && (
              <span className="text-xs font-semibold text-primary">
                Tipo de garantia: {tipoGarantiaCalculado}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Marque os itens que farão parte da garantia e informe os detalhes necessários.
          </p>
          {availableProdutosParaAdicionar.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Adicionar produto</span>
                <select
                  value={produtoParaAdicionar}
                  onChange={(event) => setProdutoParaAdicionar(event.target.value)}
                  className="rounded-xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione</option>
                  {availableProdutosParaAdicionar.map((produto) => {
                    const label = [produto.codigo, produto.descricao].filter(Boolean).join(" - ");
                    const value = produto.codigo?.toString().trim() ?? "";
                    return (
                      <option key={value} value={value}>
                        {label || value || "Produto"}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                onClick={() => produtoParaAdicionar && adicionarProdutoPorCodigo(produtoParaAdicionar)}
                disabled={!produtoParaAdicionar}
                className="rounded-xl border border-gray-200 dark:border-strokedark px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-primary disabled:opacity-40"
              >
                Incluir
              </button>
            </div>
          )}
          <div className="space-y-3">
            {produtosForm.map((produto) => (
              <div key={produto.id} className="rounded-2xl border border-gray-200 dark:border-strokedark p-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-strokedark accent-primary"
                    checked={produto.selected}
                    onChange={(event) => updateProduto(produto.id, { selected: event.target.checked })}
                  />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {[produto.codigo, produto.descricao].filter(Boolean).join(" - ") || "Produto"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quantidade: {produto.quantidade ?? "-"}</p>
                  </div>
                </label>
                {produto.selected && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <ReadOnlyInfo label="Código" value={produto.codigo ?? "-"} />
                      <ReadOnlyInfo label="Descrição" value={produto.descricao ?? "-"} />
                      <ReadOnlyInfo label="Quantidade" value={produto.quantidade?.toString() ?? "-"} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Tipo de Ocorrência
                        </span>
                        <select
                          value={produto.tipo}
                          onChange={(event) =>
                            updateProduto(produto.id, { tipo: event.target.value as ProdutoTipo })
                          }
                          className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PRODUTO_TIPOS.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">NF Compra</span>
                        <input
                          value={produto.nfCompra}
                          onChange={(event) => updateProduto(produto.id, { nfCompra: event.target.value })}
                          className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Referência do Fabricante
                        </span>
                        <input
                          value={produto.refFabricante}
                          onChange={(event) => updateProduto(produto.id, { refFabricante: event.target.value })}
                          className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {isFormularioProcesso && (
        <section className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Formulário preenchido *</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Anexe o arquivo exigido pelo fornecedor.</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              {formularioDownloadUrl ? (
                <a
                  href={formularioDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 text-sm"
                >
                  <MdFileDownload size={16} />
                  Baixar formulario
                </a>
              ) : formularioDownloadKey ? (
                <button
                  type="button"
                  onClick={handleFormularioDownload}
                  disabled={formularioDownloadLoading}
                  className="keep-color inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 text-sm disabled:opacity-60"
                >
                  <MdFileDownload size={16} />
                  {formularioDownloadLoading ? "Gerando link..." : "Baixar formulario"}
                </button>
              ) : fornecedorConfig ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum formulario disponivel.</p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Carregando instrucoes do fornecedor...</p>
              )}
              {formularioDownloadError && (
                <p className="text-xs text-red-600 max-w-xs">{formularioDownloadError}</p>
              )}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Selecionar arquivo</span>
            <input
              type="file"
              accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,image/*"
              onChange={handleFormularioFileChange}
              className="rounded-2xl border border-dashed border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {formularioFile && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-strokedark px-3 py-2 text-sm text-gray-700 dark:text-white">
              <span className="truncate">{formularioFile.name}</span>
              <button
                type="button"
                className="keep-color text-xs text-red-600 hover:text-red-500"
                onClick={removeFormularioFile}
              >
                Remover
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Imagens e vídeos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Adicione quantos arquivos forem necessários, incluindo o formulário.</p>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Adicionar arquivos</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaFilesChange}
            className="rounded-2xl border border-dashed border-gray-300 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        {mediaFiles.length > 0 && (
          <ul className="space-y-2 text-sm text-gray-700 dark:text-white">
            {mediaFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-strokedark px-3 py-2"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="keep-color inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-500"
                  onClick={() => removeMediaFile(index)}
                >
                  <MdDelete size={14} />
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <ActionButton label="Cancelar" variant="ghost" onClick={onCancel} />
        )}
        <ActionButton
          label="Enviar solicitação"
          icon={<MdCheckCircle size={18} />}
          type="submit"
          loading={submitting}
          className="rounded-2xl px-6 py-3"
        />
      </div>
    </form>
  );
};

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  textarea?: boolean;
  rows?: number;
}

const Field = ({ label, textarea = false, rows = 3, ...rest }: FieldProps) => (
  <label className="flex flex-col gap-1 text-sm ml-[3px]">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    {textarea ? (
      <textarea
        rows={rows}
        className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        className="rounded-2xl border border-gray-200 dark:border-strokedark bg-white dark:bg-boxdark px-3 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...rest}
      />
    )}
  </label>
);

const ReadOnlyInfo = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col gap-1 text-sm">
    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    <div className="rounded-2xl border border-gray-200 dark:border-strokedark bg-gray-50 dark:bg-meta-4 px-3 py-2 text-sm text-gray-700 dark:text-white">
      {value && value.length > 0 ? value : "-"}
    </div>
  </div>
);
