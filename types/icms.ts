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
    VALOR_TOTAL?: number;
};

export type StCalculationResult = {
    chaveNfe: string;
    emitente: string;
    item: number;
    codProd: string;
    produto: string;
    ncmNota: string;
    cfop: string;
    refTabela?: number;
    matchType: string;
    mvaNota: number;
    mvaRef: number;
    vlProduto: number;
    vlIcmsProprio: number;
    creditoOrigem: number;
    stDestacado: number;
    stCalculado: number;
    diferenca: number;
    status: 'Guia Complementar' | 'Pago a Maior' | 'OK' | 'NCM s/ Ref' | 'Erro';
};

export type InvoicePaymentStatus = {
    chaveNfe: string;
    status: 'PAGO' | 'PENDENTE';
    notes?: string;
    date?: string;
};
