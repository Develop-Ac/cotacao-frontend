export type NfeItemDetail = {
  nItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  icmsProprio: number;
  icmsSt: number;
  ipi: number;
  pis: number;
  cofins: number;
};

export type NfeTaxesDetail = {
  vProd: number;
  vNF: number;
  vICMS: number;
  vST: number;
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vFrete: number;
  vDesc: number;
};

export type NfeHeaderDetail = {
  numero: string;
  serie: string;
  dataEmissao: string;
};

export type ParsedNfe = {
  header: NfeHeaderDetail;
  items: NfeItemDetail[];
  taxes: NfeTaxesDetail;
};

const toNumber = (raw?: string | null) => {
  if (!raw) return 0;
  const normalized = raw.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getFirstByLocalName = (parent: Element | Document, localName: string): Element | null => {
  const nodes = parent.getElementsByTagName('*');
  for (const node of Array.from(nodes)) {
    if ((node as Element).localName === localName) {
      return node as Element;
    }
  }
  return null;
};

const getTextByLocalName = (parent: Element | Document, localName: string) => {
  const found = getFirstByLocalName(parent, localName);
  return found?.textContent?.trim() ?? '';
};

export const parseNfeXml = (xml: string): ParsedNfe => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const parserError = doc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('XML da NF inválido para leitura.');
  }

  const ide = getFirstByLocalName(doc, 'ide');
  const icmsTot = getFirstByLocalName(doc, 'ICMSTot');

  const header: NfeHeaderDetail = {
    numero: ide ? getTextByLocalName(ide, 'nNF') : '',
    serie: ide ? getTextByLocalName(ide, 'serie') : '',
    dataEmissao: ide ? (getTextByLocalName(ide, 'dhEmi') || getTextByLocalName(ide, 'dEmi')) : '',
  };

  const taxes: NfeTaxesDetail = {
    vProd: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vProd')) : 0,
    vNF: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vNF')) : 0,
    vICMS: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vICMS')) : 0,
    vST: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vST')) : 0,
    vIPI: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vIPI')) : 0,
    vPIS: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vPIS')) : 0,
    vCOFINS: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vCOFINS')) : 0,
    vFrete: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vFrete')) : 0,
    vDesc: icmsTot ? toNumber(getTextByLocalName(icmsTot, 'vDesc')) : 0,
  };

  const allNodes = Array.from(doc.getElementsByTagName('*')) as Element[];
  const detNodes = allNodes.filter((node) => node.localName === 'det');

  const items: NfeItemDetail[] = detNodes.map((detNode, index) => {
    const prod = getFirstByLocalName(detNode, 'prod');
    const imposto = getFirstByLocalName(detNode, 'imposto');

    return {
      nItem: Number(detNode.getAttribute('nItem') || index + 1),
      codigo: prod ? getTextByLocalName(prod, 'cProd') : '',
      descricao: prod ? getTextByLocalName(prod, 'xProd') : '',
      ncm: prod ? getTextByLocalName(prod, 'NCM') : '',
      cfop: prod ? getTextByLocalName(prod, 'CFOP') : '',
      unidade: prod ? getTextByLocalName(prod, 'uCom') : '',
      quantidade: prod ? toNumber(getTextByLocalName(prod, 'qCom')) : 0,
      valorUnitario: prod ? toNumber(getTextByLocalName(prod, 'vUnCom')) : 0,
      valorTotal: prod ? toNumber(getTextByLocalName(prod, 'vProd')) : 0,
      icmsProprio: imposto ? toNumber(getTextByLocalName(imposto, 'vICMS')) : 0,
      icmsSt: imposto ? toNumber(getTextByLocalName(imposto, 'vICMSST')) : 0,
      ipi: imposto ? toNumber(getTextByLocalName(imposto, 'vIPI')) : 0,
      pis: imposto ? toNumber(getTextByLocalName(imposto, 'vPIS')) : 0,
      cofins: imposto ? toNumber(getTextByLocalName(imposto, 'vCOFINS')) : 0,
    };
  });

  return { header, items, taxes };
};
