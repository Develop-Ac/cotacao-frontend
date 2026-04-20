"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaCalculator, FaCheckCircle, FaExclamationTriangle, FaFilePdf, FaSearch, FaSync } from "react-icons/fa";
import { createPortal } from "react-dom";
import { serviceUrl } from "@/lib/services";
import ConfirmationModal from "@/components/ConfirmationModal";
import { NotaFiscalRow, StCalculationResult } from "@/types/icms";
import UnmatchedSelection from "../components/UnmatchedSelection";
import StCalculationResults from "../components/StCalculationResults";
import { parseNfeXml, ParsedNfe } from "../utils/nfeXmlParser";

type PaymentStatusByKey = {
  chaveNfe: string;
  status: string | null;
  valor: number | null;
  tipo_imposto: string | null;
  data_pagamento: string | null;
  status_conferencia_produtos?: "OK" | "ERRO" | "SEM_RELACIONAMENTO" | "PENDENTE";
  itens_conciliacao?: Array<{
    n_item: number;
    cod_prod_fornecedor: string | null;
    pro_codigo: string | null;
    destinacao_mercadoria: DestinacaoMercadoria | null;
    imposto_escolhido: ImpostoEscolhido | null;
    possui_icms_st: boolean | null;
    possui_difal: boolean | null;
    ncm_xml: string | null;
    cst_nota: string | null;
    divergencias_json?: string[];
    status_conferencia: "OK" | "DIVERGENTE" | null;
    updated_at: string | null;
  }>;
  guia_gerada?: boolean;
  guia?: GuiaByNfe | null;
};

type GuiaByNfe = {
  chaveNfe: string;
  guia_gerada: boolean;
  bucket: string;
  path: string;
  original_file_name: string;
  numero_documento: string | null;
  data_vencimento: string | null;
  valor: number | null;
  fe_cte: string | null;
  numero_nf_extraido: string | null;
  fe_cte_confere: boolean | null;
  aviso: string | null;
  uploaded_at: string;
};

type DestinacaoMercadoria = "COMERCIALIZACAO" | "USO_CONSUMO";
type ImpostoEscolhido = "ST" | "DIFAL" | "TRIBUTADA";
type CachedFiscalSelection = {
  destinacaoMercadoria: DestinacaoMercadoria;
  impostoEscolhido: ImpostoEscolhido;
};

type FiscalCheckItemResult = {
  item: number;
  codProdFornecedor: string;
  impostoEscolhido?: ImpostoEscolhido;
  codigoProduto?: string;
  statusConferencia: "OK" | "DIVERGENTE";
  conformidades?: string[];
  divergencias: string[];
};

type FiscalCheckResult = {
  chaveNfe: string;
  flagsNota: {
    compraComercializacao: boolean;
    usoConsumo: boolean;
  };
  itens: FiscalCheckItemResult[];
  warnings?: string[];
};

type ModalDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirmAction?: () => void;
};

const SERVICE_URL = serviceUrl("calculadoraSt");
const DANFE_ENDPOINT = `${SERVICE_URL}/icms/danfe`;
const CALCULATE_ENDPOINT = `${SERVICE_URL}/icms/calculate`;
const DESTINATION_CACHE_KEY = "nf_item_destinations_v1";
const NO_RELATIONSHIP_WARNING = "Produto do fornecedor não foi relacionado ao nosso código interno no Sistema Celta. Por Favor Verifique!";

const normalizeProductCode = (code?: string | null) => String(code || "").trim().replace(/^0+/, "");

const buildItemKeys = (itemNumber: number, productCode?: string | null) => {
  const rawCode = String(productCode || "").trim();
  const normalizedCode = normalizeProductCode(productCode);
  const keys = [`${itemNumber}|${rawCode}`, String(itemNumber)];
  if (normalizedCode && normalizedCode !== rawCode) {
    keys.unshift(`${itemNumber}|${normalizedCode}`);
  }
  return keys;
};

const money = (value?: number | null) =>
  (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

export default function NotaFiscalDetailsPage() {
  const params = useParams<{ chaveNfe: string }>();
  const router = useRouter();
  const chaveNfe = String(params?.chaveNfe || "").trim();

  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [calculatingTax, setCalculatingTax] = useState(false);
  const [uploadingGuia, setUploadingGuia] = useState(false);
  const [loadingGuia, setLoadingGuia] = useState(false);
  const [invoice, setInvoice] = useState<NotaFiscalRow | null>(null);
  const [parsed, setParsed] = useState<ParsedNfe | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusByKey | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [guiaInfo, setGuiaInfo] = useState<GuiaByNfe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productCheckOpen, setProductCheckOpen] = useState(false);
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);
  const [checkingProducts, setCheckingProducts] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [destinations, setDestinations] = useState<Record<number, DestinacaoMercadoria>>({});
  const [cachedTaxTypes, setCachedTaxTypes] = useState<Record<number, ImpostoEscolhido>>({});
  const [submittedTaxByItemKey, setSubmittedTaxByItemKey] = useState<Record<string, ImpostoEscolhido>>({});
  const [headerDestination, setHeaderDestination] = useState<DestinacaoMercadoria | "">("");
  const [fiscalCheckResult, setFiscalCheckResult] = useState<FiscalCheckResult | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<FiscalCheckItemResult | null>(null);
  const [taxFlowState, setTaxFlowState] = useState<"DETAIL" | "PRE_EVAL" | "RESULTS">("DETAIL");
  const [preEvaluationItems, setPreEvaluationItems] = useState<StCalculationResult[] | null>(null);
  const [taxResults, setTaxResults] = useState<StCalculationResult[] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [checkProgressText, setCheckProgressText] = useState("Preparando verificação...");
  const [dialogState, setDialogState] = useState<ModalDialogState>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    showCancel: true,
  });
  const checkProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialogResolverRef = useRef<((value: boolean) => void) | null>(null);
  const guiaFileInputRef = useRef<HTMLInputElement | null>(null);

  const isDentroDoEstado = useMemo(() => chaveNfe.startsWith("51"), [chaveNfe]);
  const hasGuiaAnexada = Boolean(guiaInfo?.guia_gerada || guiaInfo?.path);
  const hasPreviousTaxCalculation = useMemo(() => {
    const status = String(paymentStatus?.status || "").trim();
    const tipoImposto = String(paymentStatus?.tipo_imposto || invoice?.TIPO_IMPOSTO || "").trim();
    const valor = Number(paymentStatus?.valor || 0);
    return Boolean(status || tipoImposto || valor > 0);
  }, [paymentStatus, invoice?.TIPO_IMPOSTO]);

  const canShowGuiaSection = useMemo(() => {
    const normalize = (value: string | null | undefined) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    return normalize(paymentStatus?.status) === "tem guia complementar";
  }, [paymentStatus?.status]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      if (checkProgressIntervalRef.current) {
        clearInterval(checkProgressIntervalRef.current);
        checkProgressIntervalRef.current = null;
      }
    };
  }, [pdfUrl]);

  const readCachedFiscalSelectionMap = () => {
    if (typeof window === "undefined" || !chaveNfe) return {} as Record<string, CachedFiscalSelection>;

    try {
      const raw = window.localStorage.getItem(DESTINATION_CACHE_KEY);
      if (!raw) return {};
      const parsedCache = JSON.parse(raw);
      const map = parsedCache?.[chaveNfe]?.items || {};
      return map as Record<string, CachedFiscalSelection>;
    } catch {
      return {};
    }
  };

  const persistItemDestinations = (rows: StCalculationResult[]) => {
    if (typeof window === "undefined" || rows.length === 0) return;

    try {
      const raw = window.localStorage.getItem(DESTINATION_CACHE_KEY);
      const current = raw ? JSON.parse(raw) : {};

      rows.forEach((row) => {
        const chave = String(row.chaveNfe || "").trim();
        if (!chave || !row.destinacaoMercadoria || !row.impostoEscolhido) return;

        const nItem = Number(row.item ?? 0);
        const itemKeys = buildItemKeys(nItem, row.codProd);

        if (!current[chave]) {
          current[chave] = { updatedAt: new Date().toISOString(), items: {} };
        }

        current[chave].updatedAt = new Date().toISOString();
        itemKeys.forEach((itemKey) => {
          current[chave].items[itemKey] = {
            destinacaoMercadoria: row.destinacaoMercadoria,
            impostoEscolhido: row.impostoEscolhido,
          };
        });
      });

      window.localStorage.setItem(DESTINATION_CACHE_KEY, JSON.stringify(current));
    } catch {
      // cache non-blocking
    }
  };

  const refreshPaymentStatus = async () => {
    if (!invoice?.CHAVE_NFE) return;

    try {
      const statusRes = await fetch(`${SERVICE_URL}/icms/payment-status/${invoice.CHAVE_NFE}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (statusRes.ok) {
        const statusData: PaymentStatusByKey = await statusRes.json();
        setPaymentStatus(statusData);
      }
    } catch {
      // keep existing status in UI on refresh failure
    }
  };

  useEffect(() => {
    if (!chaveNfe) {
      setError("Chave NF-e inválida.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const invoiceRes = await fetch(`${SERVICE_URL}/icms/nfe-distribuicao/${chaveNfe}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!invoiceRes.ok) {
          throw new Error(`Não foi possível carregar os detalhes da NF (${invoiceRes.status}).`);
        }

        const invoiceData: NotaFiscalRow = await invoiceRes.json();
        setInvoice(invoiceData);

        if (invoiceData.XML_COMPLETO) {
          try {
            const parsedData = parseNfeXml(invoiceData.XML_COMPLETO);
            setParsed(parsedData);
          } catch {
            setParsed(null);
          }
        } else {
          setParsed(null);
        }

        try {
          const statusRes = await fetch(`${SERVICE_URL}/icms/payment-status/${chaveNfe}`, {
            method: "GET",
            headers: { Accept: "application/json" },
          });

          if (statusRes.ok) {
            const statusData: PaymentStatusByKey = await statusRes.json();
            setPaymentStatus(statusData);
          } else {
            setPaymentStatus(null);
          }
        } catch {
          setPaymentStatus(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar detalhes da NF.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chaveNfe]);

  const fetchGuiaInfo = async () => {
    if (!chaveNfe) return;

    setLoadingGuia(true);
    try {
      const res = await fetch(`${SERVICE_URL}/icms/guia/${chaveNfe}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        setGuiaInfo(null);
        return;
      }

      const data = await res.json();
      setGuiaInfo(data);
    } catch {
      setGuiaInfo(null);
    } finally {
      setLoadingGuia(false);
    }
  };

  useEffect(() => {
    void fetchGuiaInfo();
  }, [chaveNfe]);

  const handleUploadGuia = async (file: File) => {
    if (!chaveNfe) return;
    if (!file.type.toLowerCase().includes("pdf")) {
      showNotice("Aviso", "Envie um arquivo PDF da guia.");
      return;
    }

    const body = new FormData();
    body.append("file", file);

    setUploadingGuia(true);
    try {
      const res = await fetch(`${SERVICE_URL}/icms/guia/${chaveNfe}/upload`, {
        method: "POST",
        body,
      });

      if (!res.ok) {
        let message = "Falha ao enviar guia.";
        try {
          const data = await res.json();
          if (Array.isArray(data?.message)) {
            message = data.message.join(", ");
          } else if (typeof data?.message === "string" && data.message.trim()) {
            message = data.message;
          }
        } catch {
          const text = await res.text().catch(() => "");
          if (text.trim()) message = text;
        }
        throw new Error(message);
      }

      const data = await res.json();
      setGuiaInfo(data);
      void refreshPaymentStatus();
      showNotice("Sucesso", "Guia anexada com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao anexar guia.";
      showNotice("Erro", message);
    } finally {
      setUploadingGuia(false);
      if (guiaFileInputRef.current) {
        guiaFileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadGuia = async () => {
    if (!chaveNfe || !guiaInfo) return;

    try {
      const res = await fetch(`${SERVICE_URL}/icms/guia/${chaveNfe}/download`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error("Falha ao baixar a guia anexada.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = guiaInfo.original_file_name || `guia-${chaveNfe}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao baixar a guia anexada.";
      showNotice("Erro", message);
    }
  };

  const handleRemoveGuia = async () => {
    if (!chaveNfe || !guiaInfo) return;

    const confirmed = await askConfirmation(
      "Remover Guia Anexada",
      "Deseja remover a guia anexada desta NF? Esta ação permitirá anexar uma nova guia.",
      "Sim, remover"
    );

    if (!confirmed) return;

    setUploadingGuia(true);
    try {
      const res = await fetch(`${SERVICE_URL}/icms/guia/${chaveNfe}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Falha ao remover guia anexada.");
      }

      setGuiaInfo(null);
      void refreshPaymentStatus();
      showNotice("Sucesso", "Guia removida com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao remover guia anexada.";
      showNotice("Erro", message);
    } finally {
      setUploadingGuia(false);
    }
  };

  const generatePreviewPdf = async () => {
    if (!invoice?.XML_COMPLETO) {
      setError("XML não disponível para gerar pré-visualização do PDF.");
      return;
    }

    setLoadingPdf(true);
    setError(null);

    try {
      const res = await fetch(DANFE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: invoice.XML_COMPLETO }),
      });

      if (!res.ok) {
        throw new Error(`Erro ao gerar PDF (${res.status}).`);
      }

      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);

      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao gerar PDF da NF.";
      setError(message);
    } finally {
      setLoadingPdf(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl || !invoice) return;

    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `DANFE_${invoice.CHAVE_NFE}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  useEffect(() => {
    if (invoice?.XML_COMPLETO && !pdfUrl) {
      generatePreviewPdf();
    }
  }, [invoice?.XML_COMPLETO]);

  const taxResultByItemKey = useMemo(() => {
    const map: Record<string, ImpostoEscolhido> = {};
    (taxResults || []).forEach((row) => {
      if (!row.impostoEscolhido) return;
      const itemNum = Number(row.item ?? 0);
      buildItemKeys(itemNum, row.codProd).forEach((key) => {
        map[key] = row.impostoEscolhido as ImpostoEscolhido;
      });
    });
    return map;
  }, [taxResults]);

  const persistedFiscalByItemKey = useMemo(() => {
    const map: Record<string, CachedFiscalSelection> = {};
    (paymentStatus?.itens_conciliacao || []).forEach((item) => {
      if (!item?.n_item || !item?.imposto_escolhido || !item?.destinacao_mercadoria) return;
      const impostoEscolhido = item.imposto_escolhido as ImpostoEscolhido;
      const destinacaoMercadoria = item.destinacao_mercadoria as DestinacaoMercadoria;
      buildItemKeys(Number(item.n_item), item.cod_prod_fornecedor || "").forEach((key) => {
        map[key] = {
          impostoEscolhido,
          destinacaoMercadoria,
        };
      });
    });
    return map;
  }, [paymentStatus?.itens_conciliacao]);

  const resolveImpostoByItem = (itemNumber: number, productCode?: string | null, destinacaoAtual?: DestinacaoMercadoria) => {
    const keys = buildItemKeys(itemNumber, productCode);
    const fromSubmitted = keys.map((key) => submittedTaxByItemKey[key]).find(Boolean);
    if (fromSubmitted) return fromSubmitted;

    const fromPersisted = keys.map((key) => persistedFiscalByItemKey[key]?.impostoEscolhido).find(Boolean);
    if (fromPersisted) return fromPersisted;

    const fromTaxResult = keys.map((key) => taxResultByItemKey[key]).find(Boolean);
    if (fromTaxResult) return fromTaxResult;

    const cachedSelectionMap = readCachedFiscalSelectionMap();
    const fromCache = keys.map((key) => cachedSelectionMap[key]?.impostoEscolhido).find(Boolean);
    if (fromCache) return fromCache;

    if (destinacaoAtual === "USO_CONSUMO") {
      return isDentroDoEstado ? "TRIBUTADA" : "DIFAL";
    }
    return "ST";
  };

  useEffect(() => {
    const nextSelected = new Set<number>();
    const nextDestinations: Record<number, DestinacaoMercadoria> = {};
    const nextTaxTypes: Record<number, ImpostoEscolhido> = {};
    const cachedSelectionMap = readCachedFiscalSelectionMap();

    (parsed?.items || []).forEach((item, index) => {
      nextSelected.add(index);
      const isStItem = item.icmsSt > 0 || item.cst.endsWith("10") || item.cst.endsWith("60");
      const cachedSelection = buildItemKeys(item.nItem, item.codigo)
        .map((key) => cachedSelectionMap[key])
        .find(Boolean);

      const persistedSelection = buildItemKeys(item.nItem, item.codigo)
        .map((key) => persistedFiscalByItemKey[key])
        .find(Boolean);

      nextDestinations[index] = persistedSelection?.destinacaoMercadoria || cachedSelection?.destinacaoMercadoria || (isStItem ? "COMERCIALIZACAO" : "USO_CONSUMO");

      const impostoAnterior = resolveImpostoByItem(item.nItem, item.codigo, nextDestinations[index]);
      if (impostoAnterior) {
        nextTaxTypes[index] = impostoAnterior;
      }
    });

    setSelectedItems(nextSelected);
    setDestinations(nextDestinations);
    setCachedTaxTypes(nextTaxTypes);
    setFiscalCheckResult(null);
  }, [parsed?.items, taxResultByItemKey, submittedTaxByItemKey, persistedFiscalByItemKey, isDentroDoEstado]);

  const startProgressFeedback = (itemsCount: number) => {
    if (checkProgressIntervalRef.current) {
      clearInterval(checkProgressIntervalRef.current);
      checkProgressIntervalRef.current = null;
    }

    setCheckProgress(5);
    setCheckProgressText(`Verificando ${itemsCount} item(ns)...`);
    setProgressModalOpen(true);

    const step = Math.max(1, Math.floor(70 / Math.max(itemsCount, 1)));
    checkProgressIntervalRef.current = setInterval(() => {
      setCheckProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + step);
      });
    }, 200);
  };

  const finishProgressFeedback = (message: string) => {
    if (checkProgressIntervalRef.current) {
      clearInterval(checkProgressIntervalRef.current);
      checkProgressIntervalRef.current = null;
    }

    setCheckProgressText(message);
    setCheckProgress(100);

    window.setTimeout(() => {
      setProgressModalOpen(false);
    }, 500);
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const applyHeaderDestination = (value: DestinacaoMercadoria | "") => {
    setHeaderDestination(value);
    if (!value) return;
    setDestinations((prev) => {
      const next = { ...prev };
      selectedItems.forEach((idx) => {
        next[idx] = value;
      });
      return next;
    });
  };

  const closeDialog = (result: boolean) => {
    const resolver = dialogResolverRef.current;
    dialogResolverRef.current = null;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolver) resolver(result);
  };

  const showNotice = (title: string, message: string) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmText: "OK",
      cancelText: "",
      showCancel: false,
      onConfirmAction: () => closeDialog(true),
    });
  };

  const askConfirmation = (title: string, message: string, confirmText = "Confirmar") => {
    return new Promise<boolean>((resolve) => {
      dialogResolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText: "Cancelar",
        showCancel: true,
        onConfirmAction: () => closeDialog(true),
      });
    });
  };

  const getImpostoLabel = (imposto?: ImpostoEscolhido) => {
    if (imposto === "ST") return "ICMS ST";
    if (imposto === "DIFAL") return "DIFAL";
    if (imposto === "TRIBUTADA") return "TRIBUTADA";
    return "-";
  };

  const getImpostoBadgeClass = (imposto?: ImpostoEscolhido) => {
    if (imposto === "ST") return "bg-blue-100 text-blue-700";
    if (imposto === "DIFAL") return "bg-orange-100 text-orange-700";
    if (imposto === "TRIBUTADA") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-600";
  };

  const runProductCheck = async () => {
    if (!parsed?.items?.length || !invoice) return;

    if (selectedItems.size === 0) {
      showNotice("Aviso", "Selecione ao menos um item para verificar o cadastro do produto.");
      return;
    }

    const missingDestination = Array.from(selectedItems).filter((idx) => !destinations[idx]);
    if (missingDestination.length > 0) {
      showNotice("Aviso", "Defina a destinação para todos os itens selecionados.");
      return;
    }

    const nextSubmittedTaxByItemKey: Record<string, ImpostoEscolhido> = {};
    const itens = Array.from(selectedItems).map((idx) => {
      const item = parsed.items[idx];
      const destinacao = destinations[idx];
      const impostoFromCache = cachedTaxTypes[idx];
      const impostoEscolhido = impostoFromCache || resolveImpostoByItem(item.nItem, item.codigo, destinacao);

      buildItemKeys(item.nItem, item.codigo).forEach((compositeKey) => {
        nextSubmittedTaxByItemKey[compositeKey] = impostoEscolhido;
      });

      return {
        item: item.nItem,
        codProdFornecedor: item.codigo,
        impostoEscolhido,
        destinacaoMercadoria: destinacao,
        ncmNota: item.ncm,
        cfop: item.cfop,
        cstNota: item.cst,
        possuiIcmsSt: item.icmsSt > 0 || item.cst.endsWith("10") || item.cst.endsWith("60"),
        possuiDifal: impostoEscolhido === "DIFAL",
      };
    });

    setSubmittedTaxByItemKey(nextSubmittedTaxByItemKey);

    startProgressFeedback(selectedItems.size);
    setCheckingProducts(true);
    setError(null);
    try {
      const res = await fetch(`${SERVICE_URL}/icms/fiscal-conferencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: [{ chaveNfe: invoice.CHAVE_NFE, itens }] }),
      });

      if (!res.ok) {
        throw new Error("Erro ao executar a verificação de cadastro do produto.");
      }

      const data = await res.json();
      setFiscalCheckResult((data?.notas || [])[0] || null);
      void refreshPaymentStatus();
      finishProgressFeedback("Conferência concluída com sucesso.");
      setProductCheckOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao verificar cadastro do produto.";
      setError(message);
      if (checkProgressIntervalRef.current) {
        clearInterval(checkProgressIntervalRef.current);
        checkProgressIntervalRef.current = null;
      }
      setProgressModalOpen(false);
    } finally {
      setCheckingProducts(false);
    }
  };

  const generateErrorsPdfReport = () => {
    if (!fiscalCheckResult) {
      showNotice("Aviso", "Execute a verificação antes de gerar o relatório.");
      return;
    }

    const itensComErro = fiscalCheckResult.itens.filter((item) => item.divergencias.length > 0);
    if (itensComErro.length === 0) {
      showNotice("Aviso", "Nenhum erro encontrado para gerar relatório.");
      return;
    }

    const escapeHtml = (value: string) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const generatedAt = new Date().toLocaleString("pt-BR");
    const rows = itensComErro
      .map((item) => {
        const divergencias = item.divergencias
          .map((div) => `<li>${escapeHtml(normalizeValidationMessage(div))}</li>`)
          .join("");

        return `
          <section class="item-block">
            <h3>Item ${item.item} - Código fornecedor: ${escapeHtml(item.codProdFornecedor || "-")}</h3>
            ${item.codigoProduto ? `<p><strong>Código do Produto:</strong> ${escapeHtml(item.codigoProduto)}</p>` : ""}
            <ul>${divergencias}</ul>
          </section>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Erros - Conferência de Produto</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            .meta { margin-bottom: 16px; color: #4b5563; font-size: 13px; }
            .item-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .item-block h3 { margin: 0 0 8px; font-size: 15px; }
            .item-block ul { margin: 8px 0 0; padding-left: 18px; }
            .item-block li { margin-bottom: 6px; color: #b91c1c; }
          </style>
        </head>
        <body>
          <h1>Relatório de Erros da Conferência de Cadastro de Produto</h1>
          <p class="meta"><strong>NF-e:</strong> ${escapeHtml(chaveNfe)} | <strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>
          ${rows}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) {
      showNotice("Aviso", "Não foi possível abrir a janela de impressão.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenTaxCalculation = async () => {
    if (hasGuiaAnexada) {
      showNotice("Aviso", "Não é permitido recalcular o imposto quando já existe guia anexada para esta NF.");
      return;
    }

    if (!invoice?.CHAVE_NFE || !invoice.XML_COMPLETO) {
      showNotice("Aviso", "NF inválida para iniciar cálculo.");
      return;
    }

    if (hasPreviousTaxCalculation) {
      const shouldContinue = await askConfirmation(
        "Substituir Análise",
        "Esta NF já possui cálculo/análise anterior. A nova análise irá substituir a feita anteriormente. Deseja continuar?",
        "Sim, continuar"
      );

      if (!shouldContinue) {
        return;
      }
    }

    setCalculatingTax(true);
    setError(null);
    try {
      const res = await fetch(CALCULATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ xmls: [invoice.XML_COMPLETO] }),
      });

      if (!res.ok) {
        throw new Error("Erro ao executar pré-avaliação do imposto.");
      }

      const allData: StCalculationResult[] = await res.json();
      setTaxResults(null);
      setPreEvaluationItems(allData);
      setTaxFlowState("PRE_EVAL");
      setProductCheckOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao executar pré-avaliação do imposto.";
      showNotice("Erro", message);
    } finally {
      setCalculatingTax(false);
    }
  };

  const handleConfirmTaxPreEvaluation = (
    selectedIndices: Set<number>,
    taxTypes: Record<number, ImpostoEscolhido>,
    destinationsFromSelection: Record<number, DestinacaoMercadoria>,
  ) => {
    if (!preEvaluationItems) return;

    const finalized = preEvaluationItems.reduce((acc, item, idx) => {
      if (selectedIndices.has(idx)) {
        acc.push({
          ...item,
          impostoEscolhido: taxTypes[idx],
          destinacaoMercadoria: destinationsFromSelection[idx],
        });
      }
      return acc;
    }, [] as StCalculationResult[]);

    persistItemDestinations(finalized);
    setPreEvaluationItems(null);
    setTaxResults(finalized);
    setTaxFlowState("RESULTS");
  };

  const headerData = useMemo(() => {
    if (!invoice) return null;

    return {
      numero:
        parsed?.header.numero ||
        (invoice.CHAVE_NFE ? invoice.CHAVE_NFE.substring(25, 34).replace(/^0+/, "") : ""),
      serie: parsed?.header.serie || "-",
      dataEmissao: parsed?.header.dataEmissao || invoice.DATA_EMISSAO,
    };
  }, [invoice, parsed]);

  const fiscalCheckByItem = useMemo(() => {
    const map: Record<string, FiscalCheckItemResult> = {};
    (paymentStatus?.itens_conciliacao || []).forEach((item) => {
      const row: FiscalCheckItemResult = {
        item: Number(item.n_item || 0),
        codProdFornecedor: String(item.cod_prod_fornecedor || ""),
        impostoEscolhido: item.imposto_escolhido || undefined,
        codigoProduto: item.pro_codigo || undefined,
        statusConferencia: item.status_conferencia === "OK" ? "OK" : "DIVERGENTE",
        divergencias: Array.isArray(item.divergencias_json) ? item.divergencias_json : [],
      };

      map[`${row.item}-${row.codProdFornecedor}`] = row;
      map[`${row.item}`] = map[`${row.item}`] || row;
    });

    (fiscalCheckResult?.itens || []).forEach((item) => {
      map[`${item.item}-${item.codProdFornecedor}`] = item;
      map[`${item.item}`] = map[`${item.item}`] || item;
    });

    return map;
  }, [fiscalCheckResult, paymentStatus?.itens_conciliacao]);

  const conferenceStatusLabel = useMemo(() => {
    const status = String(paymentStatus?.status_conferencia_produtos || "").toUpperCase();
    if (status === "OK") return "OK";
    if (status === "ERRO") return "Com Erro";
    if (status === "SEM_RELACIONAMENTO") return "Sem Relacionamento";
    return "Pendente";
  }, [paymentStatus?.status_conferencia_produtos]);

  const conferenceStatusClass = useMemo(() => {
    const status = String(paymentStatus?.status_conferencia_produtos || "").toUpperCase();
    if (status === "OK") return "bg-green-100 text-green-700";
    if (status === "ERRO") return "bg-red-100 text-red-700";
    if (status === "SEM_RELACIONAMENTO") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
  }, [paymentStatus?.status_conferencia_produtos]);

  const normalizeValidationMessage = (message: string) => {
    return message
      .replace(/PIS_CODIGO/g, "Código do Pis")
      .replace(/COFINS_CODIGO/g, "Código do Cofins")
      .replace(
        "Produto do fornecedor não vinculado na Stage_Produtos_Fornecedor_NFE para o FOR_CODIGO identificado.",
        NO_RELATIONSHIP_WARNING
      );
  };

  const isOnlyNoRelationshipWarning = (item: FiscalCheckItemResult | null) => {
    if (!item || !item.divergencias.length) return false;
    return item.divergencias.every(
      (div) => normalizeValidationMessage(div).trim().toLowerCase() === NO_RELATIONSHIP_WARNING.toLowerCase()
    );
  };

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
      <ConfirmationModal
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        showCancel={dialogState.showCancel}
        onConfirm={() => {
          if (dialogState.onConfirmAction) {
            dialogState.onConfirmAction();
          } else {
            closeDialog(true);
          }
        }}
        onCancel={() => closeDialog(false)}
      />

      {taxFlowState === "PRE_EVAL" && preEvaluationItems && (
        <UnmatchedSelection
          unmatchedItems={preEvaluationItems}
          onConfirm={handleConfirmTaxPreEvaluation}
          onCancel={() => {
            setPreEvaluationItems(null);
            setTaxFlowState("DETAIL");
          }}
        />
      )}

      {taxFlowState === "RESULTS" && taxResults && invoice && (
        <StCalculationResults
          results={taxResults}
          originalItems={[invoice]}
          selectedInvoices={new Set([invoice.CHAVE_NFE])}
          onBack={() => {
            setTaxResults(null);
            setTaxFlowState("DETAIL");
          }}
          onSuccess={() => {
            setTaxResults(null);
            setTaxFlowState("DETAIL");
            void refreshPaymentStatus();
          }}
        />
      )}

      {taxFlowState === "DETAIL" && (
      <>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FaArrowLeft /> Voltar
          </button>
          <Link
            href="/compras/notaFiscal/notaFiscal"
            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ir para lista
          </Link>
        </div>

        {invoice?.XML_COMPLETO && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenTaxCalculation}
              disabled={calculatingTax || hasGuiaAnexada}
              title={hasGuiaAnexada ? "Recalculo bloqueado: já existe guia anexada para esta NF" : "Calcular imposto"}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {calculatingTax ? <FaSync className="animate-spin" /> : <FaCalculator />} {calculatingTax ? "Calculando..." : "Calcular Imposto"}
            </button>
            <button
              onClick={() => setProductCheckOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <FaSearch /> Verificação do Produto
            </button>
            <button
              onClick={generateErrorsPdfReport}
              disabled={!fiscalCheckResult || fiscalCheckResult.itens.every((item) => item.divergencias.length === 0)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFilePdf /> Relatório de Erros (PDF)
            </button>
            <button
              onClick={generatePreviewPdf}
              disabled={loadingPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSync className={loadingPdf ? "animate-spin" : ""} />
              Atualizar PDF
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-black">Detalhes da Nota Fiscal de Entrada</h1>
        <p className="mt-1 text-sm text-gray-500">Consulta completa sem cálculo obrigatório.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}


      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-gray-600 shadow-sm">
          Carregando detalhes da nota fiscal...
        </div>
      )}

      {!loading && invoice && headerData && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Chave NF-e</p>
              <p className="mt-1 break-all text-sm font-mono text-gray-900">{invoice.CHAVE_NFE}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Número / Série</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Nº {headerData.numero || "-"} / Série {headerData.serie}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Emitente</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{invoice.NOME_EMITENTE || "-"}</p>
              <p className="mt-1 text-xs text-gray-600">{invoice.CPF_CNPJ_EMITENTE || "-"}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Data Emissão / Valor Total</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(headerData.dataEmissao)}</p>
              <p className="mt-1 text-sm text-green-700">{money(invoice.VALOR_TOTAL ?? 0)}</p>
            </div>
          </div>

          <div className="space-y-6">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Produtos da NF</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{parsed?.items.length || 0} itens</span>
                    <button
                      type="button"
                      onClick={() => setIsProductsExpanded((prev) => !prev)}
                      className="inline-flex items-center rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {isProductsExpanded ? "Recolher" : "Expandir"}
                    </button>
                  </div>
                </div>

                {isProductsExpanded && (
                <>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed border-collapse text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-2 py-2 w-[60px]">Item</th>
                        <th className="px-2 py-2 w-[240px]">Produto</th>
                        <th className="px-2 py-2 w-[170px]">Conferência Cadastro</th>
                        <th className="px-2 py-2 w-[120px]">NCM/CFOP</th>
                        <th className="px-2 py-2 text-right w-[90px]">Qtd</th>
                        <th className="px-2 py-2 text-right w-[110px]">Unitário</th>
                        <th className="px-2 py-2 text-right w-[120px]">Total</th>
                        <th className="px-2 py-2 text-right w-[110px]">ICMS</th>
                        <th className="px-2 py-2 text-right w-[110px]">ICMS ST</th>
                        <th className="px-2 py-2 text-right w-[100px]">IPI</th>
                        <th className="px-2 py-2 text-right w-[100px]">PIS</th>
                        <th className="px-2 py-2 text-right w-[110px]">COFINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parsed?.items || []).map((item) => {
                        const checkItem = fiscalCheckByItem[`${item.nItem}-${item.codigo}`] || fiscalCheckByItem[`${item.nItem}`] || null;
                        return (
                          <tr key={`${item.nItem}-${item.codigo}`} className="border-t border-gray-100">
                            <td className="px-2 py-2">{item.nItem}</td>
                            <td className="px-2 py-2">
                              <p className="font-medium text-gray-900">{item.descricao || "-"}</p>
                              <p className="text-xs text-gray-500">Cód: {item.codigo || "-"}</p>
                            </td>
                            <td className="px-2 py-2">
                              {!checkItem ? (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">Sem análise</span>
                              ) : checkItem.statusConferencia === "OK" ? (
                                <button
                                  onClick={() => setSelectedDetailItem(checkItem)}
                                  className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-200"
                                >
                                  <FaCheckCircle /> OK ({checkItem.conformidades?.length || 0})
                                </button>
                              ) : isOnlyNoRelationshipWarning(checkItem) ? (
                                <button
                                  onClick={() => setSelectedDetailItem(checkItem)}
                                  className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-semibold text-yellow-700 hover:bg-yellow-200"
                                >
                                  <FaExclamationTriangle /> Sem Relacionamento
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedDetailItem(checkItem)}
                                  className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-200"
                                >
                                  <FaExclamationTriangle /> Erro ({checkItem.divergencias.length})
                                </button>
                              )}
                              {checkItem?.codigoProduto && (
                                <p className="mt-1 text-[11px] font-semibold text-gray-700">Código do Produto: {checkItem.codigoProduto}</p>
                              )}
                            </td>
                            <td className="px-2 py-2 text-xs text-gray-700">
                              NCM: {item.ncm || "-"}
                              <br />
                              CFOP: {item.cfop || "-"}
                            </td>
                            <td className="px-2 py-2 text-right">{item.quantidade.toLocaleString("pt-BR")}</td>
                            <td className="px-2 py-2 text-right">{money(item.valorUnitario)}</td>
                            <td className="px-2 py-2 text-right font-semibold">{money(item.valorTotal)}</td>
                            <td className="px-2 py-2 text-right">{money(item.icmsProprio)}</td>
                            <td className="px-2 py-2 text-right">{money(item.icmsSt)}</td>
                            <td className="px-2 py-2 text-right">{money(item.ipi)}</td>
                            <td className="px-2 py-2 text-right">{money(item.pis)}</td>
                            <td className="px-2 py-2 text-right">{money(item.cofins)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {(!parsed || parsed.items.length === 0) && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Não foi possível identificar itens no XML desta NF.
                  </p>
                )}
                </>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Impostos da NF (XML)</h2>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">ICMS</p><p className="font-semibold">{money(parsed?.taxes.vICMS ?? 0)}</p></div>
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">ICMS ST</p><p className="font-semibold">{money(parsed?.taxes.vST ?? 0)}</p></div>
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">IPI</p><p className="font-semibold">{money(parsed?.taxes.vIPI ?? 0)}</p></div>
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">PIS</p><p className="font-semibold">{money(parsed?.taxes.vPIS ?? 0)}</p></div>
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">COFINS</p><p className="font-semibold">{money(parsed?.taxes.vCOFINS ?? 0)}</p></div>
                  <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-500">Valor NF</p><p className="font-semibold">{money(parsed?.taxes.vNF ?? invoice.VALOR_TOTAL ?? 0)}</p></div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Impostos calculados (se existentes)</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Tipo de imposto selecionado</p>
                    <p className="font-semibold text-gray-900">{paymentStatus?.tipo_imposto || invoice.TIPO_IMPOSTO || "Não informado"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Status cálculo/guia</p>
                    <p className="font-semibold text-gray-900">{paymentStatus?.status || "Sem cálculo salvo"}</p>
                  </div>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">Valor de guia calculado</p>
                    <p className="font-semibold text-gray-900">{money(paymentStatus?.valor)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">Conferência de produtos</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${conferenceStatusClass}`}>
                      {conferenceStatusLabel}
                    </span>
                  </p>
                </div>
              </div>

              {canShowGuiaSection && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Guia da NF</h2>
                  <div className="flex items-center gap-2">
                    <input
                      ref={guiaFileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleUploadGuia(file);
                        }
                      }}
                    />
                    {guiaInfo ? (
                      <>
                        <button
                          onClick={handleDownloadGuia}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <FaFilePdf /> Download Guia
                        </button>
                        <button
                          onClick={() => void handleRemoveGuia()}
                          disabled={uploadingGuia}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          {uploadingGuia ? <FaSync className="animate-spin" /> : <FaFilePdf />} {uploadingGuia ? "Removendo..." : "Remover Guia Anexada"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => guiaFileInputRef.current?.click()}
                        disabled={uploadingGuia}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {uploadingGuia ? <FaSync className="animate-spin" /> : <FaFilePdf />} {uploadingGuia ? "Enviando..." : "Anexar Guia PDF"}
                      </button>
                    )}
                  </div>
                </div>

                {loadingGuia && <p className="text-sm text-gray-500">Carregando guia vinculada...</p>}

                {!loadingGuia && !guiaInfo && (
                  <p className="text-sm text-gray-500">Nenhuma guia anexada para esta NF.</p>
                )}

                {!loadingGuia && guiaInfo && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500">Arquivo</p>
                        <p className="text-sm font-semibold text-gray-900">{guiaInfo.original_file_name || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500">Documento (Campo 23)</p>
                        <p className="text-sm font-semibold text-gray-900">{guiaInfo.numero_documento || "-"}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500">Vencimento (Campo 22)</p>
                        <p className="text-sm font-semibold text-gray-900">{guiaInfo.data_vencimento ? formatDate(guiaInfo.data_vencimento) : "-"}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 p-3">
                        <p className="text-xs text-gray-500">Valor (Campo 31)</p>
                        <p className="text-sm font-semibold text-gray-900">{money(guiaInfo.valor ?? 0)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 p-3">
                      <p className="text-xs text-gray-500">NFE/CTE (Campo 32)</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {guiaInfo.fe_cte || "-"}
                      </p>
                      {guiaInfo.fe_cte_confere === false && guiaInfo.aviso ? (
                        <p className="mt-2 inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">{guiaInfo.aviso}</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">PDF da NF (DANFE)</h2>
              <button
                onClick={downloadPdf}
                disabled={!pdfUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <FaFilePdf /> Download
              </button>
            </div>

            {!invoice.XML_COMPLETO && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                XML indisponível para gerar o PDF desta nota.
              </div>
            )}

            {invoice.XML_COMPLETO && !pdfUrl && (
              <div className="flex h-[75vh] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                Gerando pré-visualização do PDF...
              </div>
            )}

            {pdfUrl && (
              <iframe
                title="Pré-visualização DANFE"
                src={pdfUrl}
                className="h-[75vh] w-full rounded-lg border border-gray-200"
              />
            )}
          </div>
        </>
      )}
      </>
      )}

      {isClient && productCheckOpen && parsed && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-8 w-full max-w-6xl rounded-xl border border-gray-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Verificação de Cadastro do Produto</h3>
              <button
                onClick={() => setProductCheckOpen(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                disabled={checkingProducts}
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
              <p className="text-sm text-gray-600">
                Selecione a destinação por item. Para uso e consumo: dentro do estado o imposto não é obrigatório; fora do estado será aplicado DIFAL automaticamente.
              </p>

              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="min-w-full table-fixed border-collapse text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="w-[60px] px-2 py-2 text-center">Sel.</th>
                      <th className="w-[70px] px-2 py-2">Item</th>
                      <th className="px-2 py-2">Produto</th>
                      <th className="w-[140px] px-2 py-2">NCM/CFOP</th>
                      <th className="w-[140px] px-2 py-2">Imposto</th>
                      <th className="w-[240px] px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <span>Destinação</span>
                          <select
                            value={headerDestination}
                            onChange={(e) => applyHeaderDestination(e.target.value as DestinacaoMercadoria | "")}
                            className="rounded border border-gray-300 p-1 text-xs"
                          >
                            <option value="">Aplicar a todos</option>
                            <option value="COMERCIALIZACAO">Compra para Comercialização</option>
                            <option value="USO_CONSUMO">Uso e Consumo</option>
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.items.map((item, idx) => {
                      const isSelected = selectedItems.has(idx);
                      const destinoAtual = destinations[idx];
                      const impostoFromCache = cachedTaxTypes[idx];
                      const impostoAtual = impostoFromCache || resolveImpostoByItem(item.nItem, item.codigo, destinoAtual);
                      return (
                        <tr key={`${item.nItem}-${item.codigo}`} className={`border-t border-gray-100 ${isSelected ? "bg-blue-50/50" : ""}`}>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(idx)}
                            />
                          </td>
                          <td className="px-2 py-2">{item.nItem}</td>
                          <td className="px-2 py-2">
                            <p className="font-medium text-gray-900">{item.descricao || "-"}</p>
                            <p className="text-xs text-gray-500">Cód: {item.codigo || "-"}</p>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-700">
                            NCM: {item.ncm || "-"}
                            <br />
                            CFOP: {item.cfop || "-"}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${getImpostoBadgeClass(impostoAtual)}`}>
                              {getImpostoLabel(impostoAtual)}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={destinations[idx] || ""}
                              onChange={(e) => setDestinations((prev) => ({ ...prev, [idx]: e.target.value as DestinacaoMercadoria }))}
                              className="w-full rounded border border-gray-300 p-1.5 text-sm"
                            >
                              <option value="">Selecione...</option>
                              <option value="COMERCIALIZACAO">Compra para Comercialização</option>
                              <option value="USO_CONSUMO">Uso e Consumo</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={runProductCheck}
                  disabled={checkingProducts}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <FaSearch /> {checkingProducts ? "Verificando..." : "Verificar Cadastro"}
                </button>
              </div>

              {fiscalCheckResult && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      Comercialização: {fiscalCheckResult.flagsNota.compraComercializacao ? "Sim" : "Não"}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                      Uso e Consumo: {fiscalCheckResult.flagsNota.usoConsumo ? "Sim" : "Não"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {fiscalCheckResult.itens.map((item) => (
                      <div key={`${item.item}-${item.codProdFornecedor}`} className="rounded border border-gray-200 bg-white px-3 py-2">
                        {(() => {
                          const keyComposite = `${item.item}|${item.codProdFornecedor || ""}`;
                          const impostoItem = item.impostoEscolhido || submittedTaxByItemKey[keyComposite] || submittedTaxByItemKey[String(item.item)];
                          return (
                            <div className="mb-2">
                              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${getImpostoBadgeClass(impostoItem)}`}>
                                Imposto: {getImpostoLabel(impostoItem)}
                              </span>
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">Item {item.item} - Cód. fornecedor: {item.codProdFornecedor}</p>
                          {item.statusConferencia === "OK" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700"><FaCheckCircle /> OK</span>
                          ) : isOnlyNoRelationshipWarning(item) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700"><FaExclamationTriangle /> Sem Relacionamento</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700"><FaExclamationTriangle /> Divergente</span>
                          )}
                        </div>
                        {item.divergencias.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700">
                            {item.divergencias.map((div, idx) => <li key={`${item.item}-div-${idx}`}>{div}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                  {(fiscalCheckResult.warnings || []).length > 0 && (
                    <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      {(fiscalCheckResult.warnings || []).join(" | ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isClient && selectedDetailItem && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalhes da Conferência</h3>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
              <p className="text-sm text-gray-700">
                Item {selectedDetailItem.item} - Cód. fornecedor: {selectedDetailItem.codProdFornecedor}
              </p>
              {(() => {
                const keyComposite = `${selectedDetailItem.item}|${selectedDetailItem.codProdFornecedor || ""}`;
                const impostoItem = selectedDetailItem.impostoEscolhido || submittedTaxByItemKey[keyComposite] || submittedTaxByItemKey[String(selectedDetailItem.item)];
                return (
                  <p className="text-sm text-gray-800">
                    <strong>Imposto considerado:</strong> {getImpostoLabel(impostoItem)}
                  </p>
                );
              })()}
              {selectedDetailItem.codigoProduto && (
                <p className="text-sm font-semibold text-gray-800">Código do Produto: {selectedDetailItem.codigoProduto}</p>
              )}

              {(selectedDetailItem.conformidades || []).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-green-700">Validações corretas</p>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-green-700">
                    {(selectedDetailItem.conformidades || []).map((ok, idx) => (
                      <li key={`detail-ok-${idx}`}>{normalizeValidationMessage(ok)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDetailItem.divergencias.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-red-700">Pendências encontradas</p>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-red-700">
                    {selectedDetailItem.divergencias.map((div, idx) => (
                      <li key={`detail-error-${idx}`}>{normalizeValidationMessage(div)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isClient && progressModalOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900">Verificação em andamento</h3>
            <p className="mt-1 text-sm text-gray-600">{checkProgressText}</p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${checkProgress}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-gray-600">{checkProgress}%</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
