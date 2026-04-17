export type NotaFiscalRow = {
    EMPRESA: number;
    CHAVE_NFE: string;
    CPF_CNPJ_EMITENTE: string;
    NOME_EMITENTE: string;
    RG_IE_EMITENTE: string;
    DATA_EMISSAO: string; // ISO
    TIPO_OPERACAO: number;
    TIPO_OPERACAO_DESC: string;
    STATUS_ERP?: 'PENDENTE' | 'LANCADA';
    XML_COMPLETO?: string; // Optional, might be fetched separately
    XML_TIPO?: 'COMPLETO' | 'RESUMO' | 'SEM_XML';
    VALOR_TOTAL?: number;
    TIPO_IMPOSTO?: string;
};

export type StCalculationResult = {
    chaveNfe: string;
    emitente: string;
    item: number;
    codProd: string;
    produto: string;
    ncmNota: string;
    cfop: string;
    cstNota?: string;
    icmsTag?: string;
    possuiIcmsSt?: boolean;
    refTabela?: number;
    matchType: string;
    mvaNota: number;
    mvaRef: number;
    vlProduto: number;
    vlIcmsProprio: number;
    creditoOrigem: number;
    stDestacado: number;
    stCalculado: number;
    vlDifal?: number;
    diferenca: number;
    status: 'Guia Complementar' | 'Pago a Maior' | 'OK' | 'NCM s/ Ref' | 'Erro';
    impostoEscolhido?: 'ST' | 'DIFAL' | 'TRIBUTADA';
    destinacaoMercadoria?: 'COMERCIALIZACAO' | 'USO_CONSUMO';
};

export type FiscalConferenceItem = {
    item: number;
    codProdFornecedor: string;
    impostoEscolhido: 'ST' | 'DIFAL' | 'TRIBUTADA';
    destinacaoMercadoria: 'COMERCIALIZACAO' | 'USO_CONSUMO';
    ncmNota?: string;
    cfop?: string;
    cstNota?: string;
    possuiIcmsSt?: boolean;
    possuiDifal?: boolean;
};

export type FiscalConferenceInvoiceResult = {
    chaveNfe: string;
    flagsNota: {
        compraComercializacao: boolean;
        usoConsumo: boolean;
    };
    itens: Array<{
        item: number;
        codProdFornecedor: string;
        statusConferencia: 'OK' | 'DIVERGENTE';
        divergencias: string[];
        fornecedor?: { forCodigo: string; forNome: string } | null;
        produtoInterno?: { proCodigo: string; descricao: string } | null;
        produtoVinculado?: { proCodigo: string; descFornecedor: string } | null;
    }>;
    warnings?: string[];
};

export type InvoicePaymentStatus = {
    chaveNfe: string;
    status: 'PAGO' | 'PENDENTE';
    notes?: string;
    date?: string;
};
