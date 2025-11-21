import { QUALIDADE_API_BASE, QUALIDADE_EMAIL_SYNC_URL } from "./config";
import {
  AtualizacaoPayload,
  FornecedorConfig,
  Garantia,
  InboxEmail,
  NovaGarantiaPayload,
  TimelineEmailItem,
  TimelineHistoricoItem,
  TimelineItem,
  UploadAttachment,
  VendaDetalhes,
} from "./types";

const withBase = (path: string): string => {
  if (!path.startsWith("/")) {
    return `${QUALIDADE_API_BASE}/${path}`;
  }
  return `${QUALIDADE_API_BASE}${path}`;
};

const apiFetch = async (path: string, init?: RequestInit) => {
  const response = await fetch(withBase(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.clone().json();
      if (err?.message) detail = err.message;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return response;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean =>
  value === true || value === "true" || value === 1 || value === "1";

const toFloat = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const toIsoString = (value: unknown): string | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseAnexos = (payload: unknown) =>
  Array.isArray(payload)
    ? payload
        .map((item) => {
          if (item && typeof item === "object") {
            const cast = item as Record<string, unknown>;
            return {
              id: toNumber(cast.id) ?? 0,
              nome: String(cast.nome_ficheiro ?? cast.nome ?? cast.filename ?? "Arquivo"),
              caminho: String(cast.path_ficheiro ?? cast.caminho ?? cast.url ?? ""),
            };
          }
          return null;
        })
        .filter(Boolean)
    : [];

const ensureDate = (value: unknown): Date => {
  const iso = toIsoString(value);
  return iso ? new Date(iso) : new Date();
};

const isEmailTimeline = (payload: Record<string, unknown>): boolean => {
  const tipo = String(payload.tipo ?? payload.tipo_interacao ?? "").toLowerCase();
  return tipo.includes("email") || "corpo_html" in payload || "assunto" in payload || "foi_enviado" in payload;
};

const buildTimeline = (root: Record<string, unknown>): TimelineItem[] => {
  const direct = Array.isArray(root.timeline) ? (root.timeline as Record<string, unknown>[]) : null;
  const historico = Array.isArray(root.historico) ? (root.historico as Record<string, unknown>[]) : null;

  const pickDate = (entry: Record<string, unknown>) =>
    entry.data_ocorrencia ?? entry.created_at ?? entry.data ?? entry.dataEnvio ?? entry.data_envio;

const makeEmailItem = (entry: Record<string, unknown>): TimelineEmailItem => {
  const data = ensureDate(pickDate(entry));
  const destinatariosRaw = entry.destinatarios ?? entry.para ?? entry.to ?? root.email_fornecedor ?? "";
  const destinatarios = String(destinatariosRaw).trim() || String(root.email_fornecedor ?? "");
  const copias = String(entry.copias ?? entry.cc ?? entry.cc_list ?? entry.copias_email ?? entry.copia ?? "").trim();
  return {
    kind: "email",
    id: toNumber(entry.id) ?? Number(data),
    dataOcorrencia: data.toISOString(),
    isoData: data,
    titulo: String(entry.assunto ?? "Interação por e-mail"),
    assunto: String(entry.assunto ?? "Interação por e-mail"),
    remetente: String(entry.remetente ?? entry.de ?? root.email_fornecedor ?? "Fornecedor"),
    destinatarios,
    copias: copias || undefined,
    corpoHtml: String(entry.corpo_html ?? entry.descricao ?? ""),
    foiEnviado: toBoolean(entry.foi_enviado),
  };
};

  const makeHistoricoItem = (entry: Record<string, unknown>): TimelineHistoricoItem => {
    const data = ensureDate(pickDate(entry));
    return {
      kind: "historico",
      id: toNumber(entry.id) ?? Number(data),
      dataOcorrencia: data.toISOString(),
      isoData: data,
      titulo: String(entry.tipo_interacao ?? entry.titulo ?? "Atualização"),
      descricao: String(entry.descricao ?? entry.corpo_html ?? ""),
      tipoInteracao: String(entry.tipo_interacao ?? entry.tipo ?? "Interação"),
      foiVisto: toBoolean(entry.foi_visto ?? true),
    };
  };

  const fromEntry = (entry: Record<string, unknown>): TimelineItem =>
    isEmailTimeline(entry) ? makeEmailItem(entry) : makeHistoricoItem(entry);

  if (direct) {
    return direct.map(fromEntry).sort((a, b) => b.isoData.getTime() - a.isoData.getTime());
  }
  if (historico) {
    return historico.map(fromEntry).sort((a, b) => b.isoData.getTime() - a.isoData.getTime());
  }
  return [];
};

const toGarantia = (payload: Record<string, unknown>): Garantia => {
  const timeline = buildTimeline(payload);
  return {
    id: toNumber(payload.id) ?? 0,
    nomeFornecedor: String(payload.nome_fornecedor ?? payload.fornecedor ?? "Fornecedor"),
    emailFornecedor: payload.email_fornecedor?.toString(),
    copiasEmail: payload.copias_email?.toString(),
    produtos: String(payload.produtos ?? ""),
    notaInterna: String(payload.nota_interna ?? payload.nota ?? ""),
    status: toNumber(payload.status) ?? 0,
    dataCriacao: toIsoString(payload.data_criacao ?? payload.created_at) ?? new Date().toISOString(),
    tipoGarantia: payload.tipo_garantia?.toString(),
    nfsCompra: payload.nfs_compra?.toString(),
    protocoloFornecedor: payload.protocolo_fornecedor?.toString(),
    timeline,
    anexos: parseAnexos(payload.anexos),
    cfop: payload.cfop?.toString(),
    precisaNotaFiscal: payload.precisa_nota_fiscal as boolean | undefined,
    fretePorContaDe: payload.frete_por_conta_de?.toString(),
    transportadoraRazaoSocial: payload.transportadora_razao_social?.toString(),
    transportadoraCnpj: payload.transportadora_cnpj?.toString(),
    transportadoraIe: payload.transportadora_ie?.toString(),
    transportadoraEndereco: payload.transportadora_endereco?.toString(),
    transportadoraCidade: payload.transportadora_cidade?.toString(),
    transportadoraUf: payload.transportadora_uf?.toString(),
    numeroNfDevolucao: payload.numero_nf_devolucao?.toString(),
    dataColetaEnvio: toIsoString(payload.data_coleta_envio),
    nfAbatidaBoleto: payload.nf_abatida_boleto?.toString(),
    tipoCreditoFinal: payload.tipo_credito_final?.toString(),
    temNovaInteracao: toBoolean(payload.tem_nova_interacao ?? payload.temNovaInteracao),
    valorCreditoTotal: toFloat(payload.valor_credito_total),
    valorCreditoUtilizado: toFloat(payload.valor_credito_utilizado),
  };
};

const normalizeGarantiaList = (payload: unknown): Garantia[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => (item && typeof item === "object" ? toGarantia(item as Record<string, unknown>) : null))
      .filter(Boolean) as Garantia[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) {
    return (payload as any).data
      .map((item: unknown) => (item && typeof item === "object" ? toGarantia(item as Record<string, unknown>) : null))
      .filter(Boolean);
  }
  return [];
};

const toEmailList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((entry) => entry?.toString()).filter(Boolean) as string[]
    : typeof value === "string"
      ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
      : [];

const toVendaEmailList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => entry?.toString().trim()).filter(Boolean) as string[];
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/[,;]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
};

const toVendaCliente = (payload: Record<string, unknown>): VendaDetalhes["cliente"] => ({
  codigo:
    toNumber(
      payload.CLI_CODIGO ??
        payload.cli_codigo ??
        payload.cliCodigo ??
        payload.codigo ??
        payload.id,
    ) ?? 0,
  nome: String(
    payload.CLI_NOME ??
      payload.cli_nome ??
      payload.cliNome ??
      payload.nome ??
      "Cliente",
  ),
  emails: toVendaEmailList(payload.EMAILS ?? payload.emails ?? payload.email ?? payload.contatos ?? []),
});

const toVendaProduto = (payload: Record<string, unknown>): VendaDetalhes["produtos"][number] => ({
  codigo: String(
    payload.PRO_CODIGO ??
      payload.pro_codigo ??
      payload.proCodigo ??
      payload.codigo ??
      payload.id ??
      "",
  ),
  descricao: String(
    payload.PRO_DESCRICAO ??
      payload.pro_descricao ??
      payload.proDescricao ??
      payload.descricao ??
      payload.nome ??
      "Produto",
  ),
  quantidade: toFloat(payload.QUANTIDADE ?? payload.quantidade ?? payload.qtd ?? payload.qte),
});

const toVendaDetalhes = (payload: unknown): VendaDetalhes => {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const cliente = root.cliente && typeof root.cliente === "object"
    ? toVendaCliente(root.cliente as Record<string, unknown>)
    : toVendaCliente(root);

  const produtosRaw = Array.isArray(root.produtos ?? root.PRODUTOS)
    ? ((root.produtos ?? root.PRODUTOS) as Array<Record<string, unknown>>)
    : [];
  const produtos = produtosRaw
    .map((item) => (item && typeof item === "object" ? toVendaProduto(item as Record<string, unknown>) : null))
    .filter((item): item is VendaDetalhes["produtos"][number] => Boolean(item));

  const fornecedorConfigRaw =
    (root.fornecedorConfig as Record<string, unknown> | undefined) ??
    (root.config as Record<string, unknown> | undefined) ??
    undefined;
  const fornecedorConfig = fornecedorConfigRaw ? toFornecedorConfig(fornecedorConfigRaw) : undefined;

  return {
    cliente,
    produtos,
    fornecedorConfig,
  };
};

const toFornecedorConfig = (payload: Record<string, unknown>): FornecedorConfig => ({
  erpFornecedorId: toNumber(payload.erp_fornecedor_id ?? payload.erpFornecedorId ?? payload.erpId) ?? 0,
  processoTipo: String(payload.processo_tipo ?? payload.processoTipo ?? "padrao"),
  portalLink: payload.portal_link?.toString() ?? payload.portalLink?.toString(),
  formularioPath: payload.formulario_path?.toString() ?? payload.formularioPath?.toString(),
  nomeFormulario: payload.nome_formulario?.toString() ?? payload.nomeFormulario?.toString(),
  formularioUrl: payload.formulario_url?.toString() ?? payload.formularioUrl?.toString(),
  instrucoes: payload.instrucoes?.toString() ?? payload.instrucao?.toString() ?? payload.instructions?.toString(),
});

const toInboxEmail = (payload: Record<string, unknown>): InboxEmail => ({
  id: toNumber(payload.id) ?? 0,
  assunto: String(payload.assunto ?? payload.subject ?? "E-mail"),
  remetente: String(payload.remetente ?? payload.from ?? ""),
  corpoHtml: String(payload.corpo_html ?? payload.html ?? ""),
  dataRecebimento: toIsoString(payload.data_recebimento ?? payload.received_at ?? payload.date) ?? new Date().toISOString(),
  garantiaId: toNumber(payload.garantia_id ?? payload.garantiaId),
  notaInterna: payload.nota_interna?.toString(),
  toList: toEmailList(payload.to_list ?? payload.toList ?? payload.to),
  ccList: toEmailList(payload.cc_list ?? payload.ccList ?? payload.cc),
  bccList: toEmailList(payload.bcc_list ?? payload.bccList ?? payload.bcc),
  attachments: Array.isArray(payload.attachments ?? payload.anexos)
    ? ((payload.attachments ?? payload.anexos) as Array<Record<string, unknown>>).map((item) => ({
        filename: String(item.filename ?? item.nome ?? "Anexo"),
        url: item.url?.toString(),
        sizeBytes: toNumber(item.size_bytes ?? item.sizeBytes),
        mimeType: item.mime_type?.toString(),
      }))
    : [],
});

const appendIfValue = (form: FormData, key: string, value: unknown) => {
  if (value == null) return;
  if (typeof value === "string" && value.trim() === "") return;
  form.append(key, value as any);
};

const appendAttachment = (form: FormData, field: string, file: UploadAttachment) => {
  if (!file?.file) return;
  form.append(field, file.file, file.name ?? file.file.name);
};

export const QualidadeApi = {
  async listarGarantias(): Promise<Garantia[]> {
    const res = await apiFetch("/garantias");
    const data = await res.json();
    return normalizeGarantiaList(data);
  },

  async obterGarantia(id: number): Promise<Garantia> {
    const res = await apiFetch(`/garantias/${id}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      const first = data[0];
      return toGarantia((first ?? {}) as Record<string, unknown>);
    }
    return toGarantia((data ?? {}) as Record<string, unknown>);
  },

  async atualizarStatus(garantiaId: number, novoStatus: number, extra?: Record<string, unknown>) {
    await apiFetch(`/garantias/${garantiaId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        novo_status: novoStatus,
        ...extra,
      }),
    });
  },

  async enviarAtualizacao(garantiaId: number, payload: AtualizacaoPayload) {
    const form = new FormData();
    appendIfValue(form, "descricao", payload.descricao);
    if (payload.enviarEmail) {
      appendIfValue(form, "enviar_email", "1");
    }
    appendIfValue(form, "destinatario", payload.destinatario);
    appendIfValue(form, "copias", payload.copias);
    appendIfValue(form, "assunto", payload.assunto);
    payload.anexos?.forEach((file) => appendAttachment(form, "anexos", file));

    await apiFetch(`/garantias/${garantiaId}/update`, {
      method: "POST",
      body: form,
    });
  },

  async criarGarantia(payload: NovaGarantiaPayload) {
    const form = new FormData();
    appendIfValue(form, "erpFornecedorId", payload.erpFornecedorId);
    appendIfValue(form, "nomeFornecedor", payload.nomeFornecedor);
    const notaFiscal = payload.notaFiscal ?? payload.notaInterna;
    appendIfValue(form, "notaFiscal", notaFiscal);
    appendIfValue(form, "produtos", payload.produtos);
    appendIfValue(form, "descricao", payload.descricao);
    appendIfValue(form, "emailFornecedor", payload.emailFornecedor);
    appendIfValue(form, "copiasEmail", payload.copiasEmail);
    appendIfValue(form, "tipoGarantia", payload.tipoGarantia);
    appendIfValue(form, "protocoloFornecedor", payload.protocoloFornecedor);
    appendIfValue(form, "nfsCompra", payload.nfsCompra);
    appendIfValue(form, "outrosMeios", payload.outrosMeios ? "true" : undefined);
    payload.anexos?.forEach((file) => appendAttachment(form, "anexos", file));

    await apiFetch("/garantias", {
      method: "POST",
      body: form,
    });
  },

  async atualizarGarantia(id: number, payload: NovaGarantiaPayload) {
    const form = new FormData();
    appendIfValue(form, "erpFornecedorId", payload.erpFornecedorId);
    appendIfValue(form, "nomeFornecedor", payload.nomeFornecedor);
    const notaFiscal = payload.notaFiscal ?? payload.notaInterna;
    appendIfValue(form, "notaFiscal", notaFiscal);
    appendIfValue(form, "produtos", payload.produtos);
    appendIfValue(form, "descricao", payload.descricao);
    appendIfValue(form, "emailFornecedor", payload.emailFornecedor);
    appendIfValue(form, "copiasEmail", payload.copiasEmail);
    appendIfValue(form, "tipoGarantia", payload.tipoGarantia);
    appendIfValue(form, "protocoloFornecedor", payload.protocoloFornecedor);
    appendIfValue(form, "nfsCompra", payload.nfsCompra);
    appendIfValue(form, "outrosMeios", payload.outrosMeios ? "true" : undefined);
    // para compatibilidade com backends que não aceitam PUT diretamente
    form.append("_method", "PUT");
    payload.anexos?.forEach((file) => appendAttachment(form, "anexos", file));

    await apiFetch(`/garantias/${id}`, {
      method: "POST",
      body: form,
    });
  },

  async consultarVenda(notaInterna: string): Promise<VendaDetalhes> {
    const trimmed = notaInterna.trim();
    if (!trimmed) {
      throw new Error("Informe o número da venda (NI).");
    }
    const res = await apiFetch(`/dados-erp/venda/${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    return toVendaDetalhes(data);
  },

  async gerarLinkArquivo(key: string): Promise<string> {
    const trimmed = key.trim();
    if (!trimmed) {
      throw new Error("Informe a chave do arquivo.");
    }
    const res = await apiFetch(`/garantias/arquivos/url?key=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (data?.ok && typeof data.url === "string" && data.url.length > 0) {
      return data.url;
    }
    throw new Error(data?.message ?? "Não foi possível gerar o link para download.");
  },

  async obterConfigFornecedor(erpFornecedorId: number): Promise<FornecedorConfig> {
    const res = await apiFetch(`/fornecedores/config/${erpFornecedorId}`);
    const data = await res.json();
    return toFornecedorConfig(data);
  },

  async listarEmails(): Promise<InboxEmail[]> {
    const res = await apiFetch("/emails");
    const data = await res.json();
    const payload = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return payload
      .map((item: unknown) => (item && typeof item === "object" ? toInboxEmail(item as Record<string, unknown>) : null))
      .filter(Boolean) as InboxEmail[];
  },

  async sincronizarEmails() {
    if (!QUALIDADE_EMAIL_SYNC_URL) {
      throw new Error("Variável NEXT_PUBLIC_QUALIDADE_EMAIL_SYNC_URL não configurada.");
    }
    const response = await fetch(QUALIDADE_EMAIL_SYNC_URL, { method: "POST" });
    if (!response.ok) {
      throw new Error(`Falha ao sincronizar e-mails (HTTP ${response.status}).`);
    }
  },
};
