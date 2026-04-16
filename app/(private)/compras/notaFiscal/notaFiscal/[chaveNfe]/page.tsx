"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaArrowLeft, FaFilePdf, FaSync } from "react-icons/fa";
import { serviceUrl } from "@/lib/services";
import { NotaFiscalRow } from "@/types/icms";
import { parseNfeXml, ParsedNfe } from "../utils/nfeXmlParser";

type PaymentStatusByKey = {
  chaveNfe: string;
  status: string | null;
  valor: number | null;
  tipo_imposto: string | null;
  data_pagamento: string | null;
};

const SERVICE_URL = serviceUrl("calculadoraSt");
const DANFE_ENDPOINT = `${SERVICE_URL}/icms/danfe`;

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
  const [invoice, setInvoice] = useState<NotaFiscalRow | null>(null);
  const [parsed, setParsed] = useState<ParsedNfe | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusByKey | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

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

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10 space-y-6">
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
          <button
            onClick={generatePreviewPdf}
            disabled={loadingPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FaSync className={loadingPdf ? "animate-spin" : ""} />
            Atualizar PDF
          </button>
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Produtos da NF</h2>
                  <span className="text-xs text-gray-500">{parsed?.items.length || 0} itens</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed border-collapse text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-2 py-2 w-[60px]">Item</th>
                        <th className="px-2 py-2 w-[240px]">Produto</th>
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
                      {(parsed?.items || []).map((item) => (
                        <tr key={`${item.nItem}-${item.codigo}`} className="border-t border-gray-100">
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
                          <td className="px-2 py-2 text-right">{item.quantidade.toLocaleString("pt-BR")}</td>
                          <td className="px-2 py-2 text-right">{money(item.valorUnitario)}</td>
                          <td className="px-2 py-2 text-right font-semibold">{money(item.valorTotal)}</td>
                          <td className="px-2 py-2 text-right">{money(item.icmsProprio)}</td>
                          <td className="px-2 py-2 text-right">{money(item.icmsSt)}</td>
                          <td className="px-2 py-2 text-right">{money(item.ipi)}</td>
                          <td className="px-2 py-2 text-right">{money(item.pis)}</td>
                          <td className="px-2 py-2 text-right">{money(item.cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!parsed || parsed.items.length === 0) && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Não foi possível identificar itens no XML desta NF.
                  </p>
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
              </div>
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
          </div>
        </>
      )}
    </div>
  );
}
