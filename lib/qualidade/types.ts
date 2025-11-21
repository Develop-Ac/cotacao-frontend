export interface Anexo {
  id: number;
  nome: string;
  caminho: string;
}

export type TimelineItem = TimelineHistoricoItem | TimelineEmailItem;

export interface TimelineBase {
  id: number;
  dataOcorrencia: string;
  isoData: Date;
  titulo: string;
  kind: "historico" | "email";
}

export interface TimelineHistoricoItem extends TimelineBase {
  kind: "historico";
  descricao: string;
  tipoInteracao: string;
  foiVisto: boolean;
}

export interface TimelineEmailItem extends TimelineBase {
  kind: "email";
  assunto: string;
  remetente: string;
  destinatarios: string;
  copias?: string | null;
  corpoHtml: string;
  foiEnviado: boolean;
}

export interface Garantia {
  id: number;
  nomeFornecedor: string;
  emailFornecedor?: string | null;
  copiasEmail?: string | null;
  produtos: string;
  notaInterna: string;
  status: number;
  dataCriacao: string;
  tipoGarantia?: string | null;
  nfsCompra?: string | null;
  protocoloFornecedor?: string | null;
  timeline: TimelineItem[];
  anexos: Anexo[];
  cfop?: string | null;
  precisaNotaFiscal?: boolean | null;
  fretePorContaDe?: string | null;
  transportadoraRazaoSocial?: string | null;
  transportadoraCnpj?: string | null;
  transportadoraIe?: string | null;
  transportadoraEndereco?: string | null;
  transportadoraCidade?: string | null;
  transportadoraUf?: string | null;
  numeroNfDevolucao?: string | null;
  dataColetaEnvio?: string | null;
  nfAbatidaBoleto?: string | null;
  tipoCreditoFinal?: string | null;
  temNovaInteracao: boolean;
  valorCreditoTotal?: number | null;
  valorCreditoUtilizado?: number | null;
}

export interface EmailAnexo {
  filename: string;
  url?: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface InboxEmail {
  id: number;
  assunto: string;
  remetente: string;
  corpoHtml: string;
  dataRecebimento: string;
  garantiaId?: number | null;
  notaInterna?: string | null;
  toList: string[];
  ccList: string[];
  bccList: string[];
  attachments: EmailAnexo[];
}

export interface UploadAttachment {
  file: File;
  name?: string;
  type?: string;
}

export interface AtualizacaoPayload {
  descricao: string;
  enviarEmail?: boolean;
  destinatario?: string;
  copias?: string;
  assunto?: string;
  anexos?: UploadAttachment[];
}

export interface NovaGarantiaPayload {
  erpFornecedorId?: number;
  nomeFornecedor: string;
  notaInterna: string;
  notaFiscal?: string;
  produtos: string;
  descricao?: string;
  emailFornecedor?: string;
  copiasEmail?: string;
  tipoGarantia?: string;
  protocoloFornecedor?: string;
  nfsCompra?: string;
  outrosMeios?: boolean;
  anexos?: UploadAttachment[];
}

export interface VendaCliente {
  codigo: number;
  nome: string;
  emails: string[];
}

export interface VendaProduto {
  codigo: string;
  descricao: string;
  quantidade?: number;
}

export interface VendaDetalhes {
  cliente: VendaCliente;
  produtos: VendaProduto[];
  fornecedorConfig?: FornecedorConfig | null;
}

export interface FornecedorConfig {
  erpFornecedorId: number;
  processoTipo: string;
  portalLink?: string | null;
  formularioPath?: string | null;
  nomeFormulario?: string | null;
  formularioUrl?: string | null;
  instrucoes?: string | null;
}
