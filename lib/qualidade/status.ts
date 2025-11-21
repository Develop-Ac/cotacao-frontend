export interface StatusDefinition {
  code: number;
  key: string;
  label: string;
  color: string;
  background: string;
}

const palette = {
  awaiting: "#E9802F",
  done: "#C4D600",
  rejected: "#C62828",
  neutral: "#6B7280",
  blue: "#00529B",
};

export const STATUS_FLOW: StatusDefinition[] = [
  { code: 1, key: "aguardandoAprovacaoFornecedor", label: "Aguardando Aprovação do Fornecedor", color: palette.blue, background: "rgba(0,82,155,0.13)" },
  { code: 2, key: "emissaoNotaFiscal", label: "Emissão de Nota Fiscal", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 17, key: "aprovacaoNotaFiscal", label: "Aprovação de Nota Fiscal", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 3, key: "descarteMercadoria", label: "Descarte da Mercadoria", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 4, key: "aguardandoColeta", label: "Aguardando Coleta", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 5, key: "aguardandoFreteCortesia", label: "Aguardando Frete Cortesia", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 6, key: "aguardandoAnalise", label: "Aguardando Análise de Garantia", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 7, key: "aguardandoCredito", label: "Aguardando Crédito", color: palette.awaiting, background: "rgba(233,128,47,0.12)" },
  { code: 8, key: "produtoProximaCompra", label: "Produto em Próxima Compra", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 9, key: "trocaProduto", label: "Troca de Produto", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 10, key: "abatimentoProximoPedido", label: "Abatimento em Próximo Pedido", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 11, key: "creditoEmConta", label: "Crédito em Conta", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 12, key: "abatimentoEmBoleto", label: "Abatimento em Boleto", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 13, key: "garantiaRecebida", label: "Garantia Recebida", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 14, key: "concluida", label: "Concluída", color: palette.done, background: "rgba(196,214,0,0.16)" },
  { code: 15, key: "garantiaReprovada", label: "Garantia Reprovada", color: palette.rejected, background: "rgba(198,40,40,0.12)" },
  { code: 16, key: "garantiaReprovadaAnalise", label: "Garantia Reprovada na Análise", color: palette.rejected, background: "rgba(198,40,40,0.12)" },
];

const STATUS_BY_CODE = new Map(STATUS_FLOW.map((item) => [item.code, item]));

export type StatusKey = (typeof STATUS_FLOW)[number]["key"];

export const STATUS_CODES = STATUS_FLOW.reduce(
  (acc, item) => {
    acc[item.key as StatusKey] = item.code;
    return acc;
  },
  {} as Record<StatusKey, number>,
);

export const getStatusDefinition = (value?: number | string | null): StatusDefinition | undefined => {
  if (value == null) return undefined;
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return undefined;
  return STATUS_BY_CODE.get(Number(numeric));
};

export const getStatusLabel = (value?: number | string | null): string =>
  getStatusDefinition(value)?.label ?? "Desconhecido";

export const getStatusColor = (value?: number | string | null): string =>
  getStatusDefinition(value)?.color ?? palette.neutral;
