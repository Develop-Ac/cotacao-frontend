"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MdAdd,
  MdAttachFile,
  MdBlock,
  MdCheckCircle,
  MdDelete,
  MdDescription,
  MdFlag,
  MdLocalShipping,
  MdPaid,
  MdThumbUp,
  MdThumbDown,
  MdRefresh,
  MdEdit,
} from "react-icons/md";
import { PageHeader } from "@/components/qualidade/PageHeader";
import { ActionButton } from "@/components/qualidade/ActionButton";
import { SectionCard } from "@/components/qualidade/SectionCard";
import { StatusChip } from "@/components/qualidade/StatusChip";
import { StatusStepper } from "@/components/qualidade/StatusStepper";
import { ResumoCard } from "@/components/qualidade/ResumoCard";
import { TimelineItemCard } from "@/components/qualidade/TimelineItemCard";
import { InfoLine } from "@/components/qualidade/InfoLine";
import { FormModal } from "@/components/qualidade/FormModal";
import { NovaGarantiaForm } from "@/components/qualidade/NovaGarantiaForm";
import { QualidadeApi } from "@/lib/qualidade/api";
import { Garantia, TimelineItem, UploadAttachment } from "@/lib/qualidade/types";
import { STATUS_CODES, STATUS_FLOW, getStatusDefinition } from "@/lib/qualidade/status";
import { formatCurrency, formatDate, formatDateTime, parseBrDate, parseCurrencyInput } from "@/lib/qualidade/formatters";
import { FaChevronLeft, FaChevronRight, FaDownload, FaTimes } from "react-icons/fa";

type AbatimentoRow = { nf: string; parcela: string; vencimento: string; valor: string };
const newAbatimentoRow = (): AbatimentoRow => ({ nf: "", parcela: "", vencimento: "", valor: "" });

type ColetaFormState = {
  frete: "fornecedor" | "loja";
  cfop: string;
  razao: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  uf: string;
  ie: string;
  codigo: string;
  obs: string;
};

const toggleButtonClasses = (active: boolean) =>
  `keep-color px-3 py-1.5 rounded-full border transition-colors duration-200 ${active
    ? "bg-[var(--primary-600)] border-[var(--primary-600)] text-white"
    : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
  }`;

const fileToAttachment = (file: File): UploadAttachment => ({
  file,
  name: file.name,
  type: file.type,
});

const formatDateMask = (value: string): string => {
  const digits = value.replace(/\D+/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatCurrencyMask = (value: string): string => {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "";
  const numberValue = Number(digits) / 100;
  return numberValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isImageAttachment = (anexo?: Garantia["anexos"][number]) => {
  if (!anexo) return false;
  const name = anexo.nome?.toLowerCase() ?? "";
  const caminho = anexo.caminho?.toLowerCase() ?? "";
  return /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(name) || /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(caminho);
};

const FINAL_STATUS_CODES = new Set<number>([
  STATUS_CODES.concluida,
  STATUS_CODES.garantiaReprovada,
  STATUS_CODES.garantiaReprovadaAnalise,
]);

const NF_REQUIRED_STATUS = new Set<number>([
  STATUS_CODES.trocaProduto,
  STATUS_CODES.abatimentoProximoPedido,
]);

const normalizeStatusText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const squeezeStatusText = (value: string): string => normalizeStatusText(value).replace(/\s+/g, "");

const humanizeStatusKey = (value: string): string =>
  value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");

const STATUS_KEYWORDS: Record<number, string[]> = {
  [STATUS_CODES.emissaoNotaFiscal]: ["emissao de nota fiscal", "nota fiscal emitida", "nf emitida", "nf-e emitida"],
  [STATUS_CODES.aguardandoFreteCortesia]: ["frete cortesia"],
  [STATUS_CODES.aguardandoColeta]: ["coleta"],
};

const STATUS_TEXT_PATTERNS = STATUS_FLOW.map((status) => {
  const patterns = new Set<string>();
  const addPattern = (source?: string) => {
    if (!source) return;
    const normalized = normalizeStatusText(source);
    if (!normalized) return;
    patterns.add(normalized);
    const squeezed = squeezeStatusText(source);
    if (squeezed) {
      patterns.add(squeezed);
    }
  };
  addPattern(status.label);
  addPattern(humanizeStatusKey(status.key));
  addPattern(status.key);
  return { code: status.code, patterns: Array.from(patterns) };
});

const findStatusCodeInText = (text: string): number | null => {
  const normalized = normalizeStatusText(text);
  if (!normalized) return null;
  const normalizedNoSpaces = normalized.replace(/\s+/g, "");
  const normalizedPadded = ` ${normalized} `;
  let bestMatch: { code: number; index: number } | null = null;

  for (const [code, keywords] of Object.entries(STATUS_KEYWORDS)) {
    const numCode = Number(code);
    if (keywords.some((kw) => normalized.includes(kw))) {
      return numCode;
    }
  }

  for (const entry of STATUS_TEXT_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (!pattern) continue;
      const hasSpace = /\s/.test(pattern);
      const haystack = hasSpace ? normalizedPadded : normalizedNoSpaces;
      const needle = hasSpace ? ` ${pattern} ` : pattern;
      const index = haystack.indexOf(needle);
      if (index >= 0 && (!bestMatch || index > bestMatch.index)) {
        bestMatch = { code: entry.code, index };
      }
    }
  }

  if (bestMatch?.code != null) return bestMatch.code;

  const numeric = normalized.match(/status[^0-9]{0,3}(\d{1,2})/i);
  if (numeric) {
    const code = Number(numeric[1]);
    if (STATUS_FLOW.some((item) => item.code === code)) {
      return code;
    }
  }

  return null;
};

const buildStatusSequence = (timeline: TimelineItem[]): number[] => {
  const ordered = [...timeline]
    .sort((a, b) => a.isoData.getTime() - b.isoData.getTime())
    .reduce<number[]>((acc, item) => {
      const code = findStatusCodeInText(
        `${(item as any).titulo ?? ""} ${(item as any).descricao ?? ""} ${(item as any).tipoInteracao ?? ""} ${(item as any).assunto ?? ""} ${(item as any).corpoHtml ?? ""}`,
      );
      if (code != null) {
        const last = acc[acc.length - 1];
        if (last !== code) {
          acc.push(code);
        }
      }
      return acc;
    }, []);
  if (ordered.length === 0 || ordered[0] !== STATUS_CODES.aguardandoAprovacaoFornecedor) {
    ordered.unshift(STATUS_CODES.aguardandoAprovacaoFornecedor);
  }
  return ordered;
};

const computeCompletedStatuses = (garantia: Garantia): number[] => {
  const sequence = buildStatusSequence(garantia.timeline ?? []);
  const current = garantia.status;
  if (current != null && sequence[sequence.length - 1] !== current) {
    sequence.push(current);
  }
  if (sequence.length <= 1) {
    if (current == null) return [];
    return STATUS_FLOW.filter((status) => status.code < current).map((status) => status.code);
  }
  const completed = new Set<number>();
  sequence.forEach((code, index) => {
    const isLast = index === sequence.length - 1;
    if (isLast) {
      if (current != null && FINAL_STATUS_CODES.has(current)) {
        completed.add(code);
      }
      return;
    }
    completed.add(code);
  });
  return Array.from(completed);
};

export default function GarantiaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const garantiaId = Number(params?.id ?? 0);

  const [garantia, setGarantia] = useState<Garantia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  const [anomaliaVisible, setAnomaliaVisible] = useState(false);
  const [anomaliaPrecisaNF, setAnomaliaPrecisaNF] = useState(false);
  const [anomaliaCfop, setAnomaliaCfop] = useState("");

  const [aprovarModalVisible, setAprovarModalVisible] = useState(false);
  const [aprovarPrecisaNF, setAprovarPrecisaNF] = useState(false);
  const [aprovarCfop, setAprovarCfop] = useState("");

  const [coletaForm, setColetaForm] = useState<ColetaFormState>({
    frete: "fornecedor",
    cfop: "",
    razao: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    uf: "",
    ie: "",
    codigo: "",
    obs: "",
  });

  const [notaVisible, setNotaVisible] = useState(false);
  const [notaNumero, setNotaNumero] = useState("");
  const [notaAnexos, setNotaAnexos] = useState<File[]>([]);
  const notaFileInputRef = useRef<HTMLInputElement | null>(null);
  const [mensagemAnexos, setMensagemAnexos] = useState<File[]>([]);
  const mensagemFileInputRef = useRef<HTMLInputElement | null>(null);

  const [descarteVisible, setDescarteVisible] = useState(false);
  const [descarteAnexos, setDescarteAnexos] = useState<File[]>([]);

  const [dataEnvioVisible, setDataEnvioVisible] = useState(false);
  const [dataEnvioInput, setDataEnvioInput] = useState("");

  const [valorCreditoVisible, setValorCreditoVisible] = useState(false);
  const [valorCreditoInput, setValorCreditoInput] = useState("");

  const [liberarVisible, setLiberarVisible] = useState(false);
  const [liberarStatus, setLiberarStatus] = useState<number>(STATUS_CODES.produtoProximaCompra);
  const [liberarValor, setLiberarValor] = useState("");
  const [liberarNf, setLiberarNf] = useState("");
  const [liberarRows, setLiberarRows] = useState<AbatimentoRow[]>([newAbatimentoRow()]);
  const [editarDadosVisible, setEditarDadosVisible] = useState(false);
  const [concluirVisible, setConcluirVisible] = useState(false);
  const [concluirNf, setConcluirNf] = useState("");
  const [freteCortesiaSelecionado, setFreteCortesiaSelecionado] = useState(false);
  const [envioVisible, setEnvioVisible] = useState(false);
  const [enviarMercadoria, setEnviarMercadoria] = useState(true);
  const [envioFrete, setEnvioFrete] = useState<"fornecedor" | "loja">("fornecedor");
  const [envioCorreio, setEnvioCorreio] = useState(false);
  const [codigoObjeto, setCodigoObjeto] = useState("");
  const [anexoViewerOpen, setAnexoViewerOpen] = useState(false);
  const [anexoViewerIndex, setAnexoViewerIndex] = useState(0);
  const [anexoViewerLoading, setAnexoViewerLoading] = useState(false);
  const [anexoViewerError, setAnexoViewerError] = useState<string | null>(null);
  const [anexoUrlCache, setAnexoUrlCache] = useState<Record<number, string>>({});
  const [downloadingAnexoId, setDownloadingAnexoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!Number.isFinite(garantiaId)) return;
    setLoading(true);
    try {
      const data = await QualidadeApi.obterGarantia(garantiaId);
      setGarantia(data);
      setError(null);
    } catch (err) {
      setGarantia(null);
      setError(err instanceof Error ? err.message : "Não foi possível carregar os detalhes.");
    } finally {
      setLoading(false);
    }
  }, [garantiaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const frete = garantia?.fretePorContaDe?.toString().toLowerCase();
    setFreteCortesiaSelecionado(frete === "cortesia");
  }, [garantia?.fretePorContaDe]);

  const updateStatus = useCallback(
    async (novoStatus: number, extra?: Record<string, unknown>) => {
      if (!garantia) return;
      setAlterandoStatus(true);
      try {
        await QualidadeApi.atualizarStatus(garantia.id, novoStatus, extra);
        await carregar();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Falha ao atualizar status.");
      } finally {
        setAlterandoStatus(false);
      }
    },
    [garantia, carregar],
  );

  const handleAtualizacao = async () => {
    if (!mensagem.trim() && mensagemAnexos.length === 0) return;
    setEnviando(true);
    try {
      await QualidadeApi.enviarAtualizacao(garantiaId, {
        descricao: mensagem,
        anexos: mensagemAnexos.map(fileToAttachment),
      });
      setMensagem("");
      setMensagemAnexos([]);
      if (mensagemFileInputRef.current) {
        mensagemFileInputRef.current.value = "";
      }
      await carregar();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível registrar a atualização.");
    } finally {
      setEnviando(false);
    }
  };


  const resolveAnexoUrl = useCallback(async (anexo: Garantia["anexos"][number]) => {
    const caminho = anexo?.caminho?.trim();
    if (!caminho) {
      throw new Error("Arquivo sem caminho disponivel.");
    }
    if (/^https?:\/\//i.test(caminho)) {
      return caminho;
    }
    return QualidadeApi.gerarLinkArquivo(caminho);
  }, []);

  const openAnexoModal = useCallback(
    (index: number) => {
      if (!garantia?.anexos?.length) return;
      const total = garantia.anexos.length;
      const safeIndex = Math.min(Math.max(index, 0), total - 1);
      setAnexoViewerIndex(safeIndex);
      setAnexoViewerError(null);
      setAnexoViewerOpen(true);
    },
    [garantia?.anexos?.length],
  );

  const closeAnexoModal = useCallback(() => {
    setAnexoViewerOpen(false);
    setAnexoViewerError(null);
    setAnexoViewerLoading(false);
  }, []);

  const goToPrevAnexo = useCallback(() => {
    if (!garantia?.anexos?.length) return;
    const total = garantia.anexos.length;
    setAnexoViewerIndex((prev) => (prev - 1 + total) % total);
    setAnexoViewerError(null);
  }, [garantia?.anexos?.length]);

  const goToNextAnexo = useCallback(() => {
    if (!garantia?.anexos?.length) return;
    const total = garantia.anexos.length;
    setAnexoViewerIndex((prev) => (prev + 1) % total);
    setAnexoViewerError(null);
  }, [garantia?.anexos?.length]);

  const handleDownloadAnexo = useCallback(
    async (anexo: Garantia["anexos"][number]) => {
      setDownloadingAnexoId(anexo.id);
      try {
        const cached = anexoUrlCache[anexo.id];
        const url = cached ?? (await resolveAnexoUrl(anexo));
        if (!cached) {
          setAnexoUrlCache((prev) => ({ ...prev, [anexo.id]: url }));
        }
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.download = anexo.nome ?? "anexo";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Não foi possivel baixar o anexo.");
      } finally {
        setDownloadingAnexoId(null);
      }
    },
    [anexoUrlCache, resolveAnexoUrl],
  );

  useEffect(() => {
    if (!anexoViewerOpen) return;
    const atual = garantia?.anexos?.[anexoViewerIndex];
    if (!atual) return;
    if (anexoUrlCache[atual.id]) {
      setAnexoViewerError(null);
      return;
    }
    let cancelled = false;
    setAnexoViewerLoading(true);
    setAnexoViewerError(null);
    (async () => {
      try {
        const url = await resolveAnexoUrl(atual);
        if (!cancelled) {
          setAnexoUrlCache((prev) => (prev[atual.id] ? prev : { ...prev, [atual.id]: url }));
        }
      } catch (err) {
        if (!cancelled) {
          setAnexoViewerError(err instanceof Error ? err.message : "Não foi possivel carregar o arquivo.");
        }
      } finally {
        if (!cancelled) {
          setAnexoViewerLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anexoViewerOpen, anexoViewerIndex, garantia?.anexos, anexoUrlCache, resolveAnexoUrl]);

  const anexosDisponiveis = garantia?.anexos ?? [];
  const totalAnexos = anexosDisponiveis.length;
  const currentAnexo =
    anexoViewerOpen && totalAnexos > 0 ? anexosDisponiveis[anexoViewerIndex] ?? null : null;
  const currentAnexoUrl = currentAnexo ? anexoUrlCache[currentAnexo.id] : undefined;
  const currentAnexoEhImagem = currentAnexo ? isImageAttachment(currentAnexo) : false;
  const downloadingCurrentAnexo = currentAnexo ? downloadingAnexoId === currentAnexo.id : false;

  const abrirAprovacao = () => {
    if (!garantia) return;
    const isAnomalia = (garantia.tipoGarantia ?? "").toLowerCase().includes("anomalia");
    if (isAnomalia) {
      setAnomaliaCfop("");
      setAnomaliaPrecisaNF(false);
      setAnomaliaVisible(true);
      return;
    }
    setAprovarPrecisaNF(true);
    setAprovarCfop("");
    setFreteCortesiaSelecionado(false);
    setAprovarModalVisible(true);
  };

  const submitAnomalia = async () => {
    if (!anomaliaCfop.trim()) {
      window.alert("Informe o CFOP.");
      return;
    }
    await updateStatus(STATUS_CODES.aguardandoAnalise, {
      precisa_nota_fiscal: anomaliaPrecisaNF,
      cfop: anomaliaCfop.trim(),
    });
    setAnomaliaVisible(false);
  };

  const submitAprovarModal = async () => {
    if (aprovarPrecisaNF && !aprovarCfop.trim()) {
      window.alert("Informe o CFOP.");
      return;
    }
    const payload: Record<string, unknown> = {
      precisa_nota_fiscal: aprovarPrecisaNF,
      ...(aprovarPrecisaNF ? { cfop: aprovarCfop.trim() } : {}),
      ...(freteCortesiaSelecionado ? { frete_por_conta_de: "cortesia" } : {}),
    };
    setAprovarModalVisible(false);
    if (aprovarPrecisaNF) {
      await updateStatus(STATUS_CODES.emissaoNotaFiscal, payload);
      return;
    }
    await updateStatus(STATUS_CODES.descarteMercadoria, payload);
  };

  const closeNotaModal = () => {
    setNotaVisible(false);
    setNotaAnexos([]);
  };

  const handleNota = () => {
    setNotaNumero("");
    setNotaAnexos([]);
    setNotaVisible(true);
  };

  const submitNota = async () => {
    if (!garantia) return;
    if (!notaNumero.trim()) {
      window.alert("Informe o número da NF.");
      return;
    }
    if (notaAnexos.length > 0) {
      await QualidadeApi.enviarAtualizacao(garantia.id, {
        descricao: "Prezados, segue anexo a NF-e emitida conforme a solicitacao.",
        anexos: notaAnexos.map(fileToAttachment),
        enviarEmail: false,
      });
    }
    await updateStatus(STATUS_CODES.aprovacaoNotaFiscal, {
      numero_nf_devolucao: notaNumero.trim(),
      ...(freteCortesiaSelecionado ? { frete_por_conta_de: "cortesia" } : {}),
    });
    closeNotaModal();
  };

  const handleConcluirProcesso = useCallback(async () => {
    if (!garantia) return;
    if (garantia.status === STATUS_CODES.produtoProximaCompra) {
      setConcluirNf("");
      setConcluirVisible(true);
      return;
    }
    await updateStatus(STATUS_CODES.concluida);
  }, [garantia, updateStatus]);

  const submitConcluir = async () => {
    if (!garantia) return;
    if (garantia.status === STATUS_CODES.produtoProximaCompra) {
      const nf = concluirNf.trim();
      if (!nf) {
        window.alert("Informe o número da NF para concluir.");
        return;
      }
      try {
        await QualidadeApi.enviarAtualizacao(garantia.id, {
          descricao: `NF informada para conclusão (Produto em Próxima Compra): ${nf}.`,
        });
      } catch {
        // segue mesmo se falhar o registro
      }
      await updateStatus(STATUS_CODES.concluida, { numero_nf_credito: nf });
      setConcluirVisible(false);
      return;
    }
    await updateStatus(STATUS_CODES.concluida);
    setConcluirVisible(false);
  };

  const handleNotaFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNotaAnexos(event.target.files ? Array.from(event.target.files) : []);
  };

  const removeNotaAnexo = (index: number) => {
    setNotaAnexos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNfeReprovada = async () => {
    await updateStatus(STATUS_CODES.emissaoNotaFiscal);
    setAprovarPrecisaNF(true);
    setAprovarCfop("");
    setAprovarModalVisible(true);
  };

  const handleNfeAprovada = () => {
    if (freteCortesiaSelecionado) {
      void updateStatus(STATUS_CODES.aguardandoFreteCortesia, { frete_por_conta_de: "cortesia" });
      return;
    }
    setEnviarMercadoria(true);
    setEnvioFrete("fornecedor");
    setEnvioCorreio(false);
    setCodigoObjeto("");
    setColetaForm((prev) => ({
      ...prev,
      frete: "fornecedor",
      razao: "",
      cnpj: "",
      endereco: "",
      cidade: "",
      uf: "",
      ie: "",
      codigo: "",
      obs: "",
    }));
    setEnvioVisible(true);
  };

  const submitEnvio = async () => {
    if (!garantia) return;
    if (!enviarMercadoria) {
      await updateStatus(STATUS_CODES.aguardandoCredito);
      setEnvioVisible(false);
      return;
    }
    if (envioFrete === "loja") {
      await updateStatus(STATUS_CODES.aguardandoFreteCortesia, {
        frete_por_conta_de: "loja",
        transportadora_razao_social: "ST SOLUCAO TRANSPORTES LOGISTICA LTDA",
        transportadora_cnpj: "13.327.196/0002-56",
        transportadora_endereco: "AV TENENTE AMARO FELICISSIMO DA SILVEIRA, S/N, PARQUE NOVO MUNDO",
        transportadora_cidade: "SÃO PAULO",
        transportadora_uf: "SP",
        transportadora_ie: "119012690115",
      });
      setEnvioVisible(false);
      return;
    }
    if (envioCorreio) {
      const codigo = codigoObjeto.trim();
      if (!codigo) {
        window.alert("Informe o código do objeto dos Correios.");
        return;
      }
      await updateStatus(STATUS_CODES.aguardandoColeta, {
        frete_por_conta_de: "fornecedor",
        transportadora_razao_social: "Correios",
        codigo_coleta_envio: codigo,
        obs: `Código de Rastreio: ${codigo}`,
      });
      setEnvioVisible(false);
      return;
    }
    const required: (keyof typeof coletaForm)[] = ["razao", "cnpj", "endereco", "cidade", "uf"];
    if (required.some((field) => coletaForm[field].trim() === "")) {
      window.alert("Preencha todos os dados da transportadora.");
      return;
    }
    await updateStatus(STATUS_CODES.aguardandoColeta, {
      frete_por_conta_de: "fornecedor",
      transportadora_razao_social: coletaForm.razao.trim(),
      transportadora_cnpj: coletaForm.cnpj.trim(),
      transportadora_endereco: coletaForm.endereco.trim(),
      transportadora_cidade: coletaForm.cidade.trim(),
      transportadora_uf: coletaForm.uf.trim().toUpperCase(),
      ...(coletaForm.ie.trim() && { transportadora_ie: coletaForm.ie.trim() }),
      codigo_coleta_envio: coletaForm.codigo.trim(),
      obs: coletaForm.obs.trim(),
    });
    setEnvioVisible(false);
  };

  const handleMensagemFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMensagemAnexos(event.target.files ? Array.from(event.target.files) : []);
  };

  const removeMensagemAnexo = (index: number) => {
    setMensagemAnexos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDescarte = () => {
    setDescarteAnexos([]);
    setDescarteVisible(true);
  };

  const submitDescarte = async () => {
    if (!garantia) return;
    if (descarteAnexos.length === 0) {
      window.alert("Selecione ao menos um comprovante.");
      return;
    }
    await QualidadeApi.enviarAtualizacao(garantia.id, {
      descricao: "Comprovante de descarte anexado.",
      anexos: descarteAnexos.map(fileToAttachment),
      enviarEmail: false,
    });
    await updateStatus(STATUS_CODES.aguardandoCredito);
    setDescarteVisible(false);
  };

  const handleEnvio = () => {
    setDataEnvioInput("");
    setDataEnvioVisible(true);
  };

  const submitDataEnvio = async () => {
    const date = parseBrDate(dataEnvioInput);
    if (!date) {
      window.alert("Informe a data no formato dd/mm/aaaa.");
      return;
    }
    await updateStatus(STATUS_CODES.aguardandoAnalise, { data_coleta_envio: date.toISOString() });
    setDataEnvioVisible(false);
  };

  const handleValorCredito = () => {
    setValorCreditoInput("");
    setValorCreditoVisible(true);
  };

  const submitValorCredito = async () => {
    const valor = parseCurrencyInput(valorCreditoInput);
    if (!valor || valor <= 0) {
      window.alert("Informe um valor válido.");
      return;
    }
    await updateStatus(STATUS_CODES.aguardandoCredito, { valor_credito_total: valor });
    setValorCreditoVisible(false);
  };

  const handleLiberarCredito = () => {
    setLiberarStatus(STATUS_CODES.produtoProximaCompra);
    setLiberarValor("");
    setLiberarNf("");
    setLiberarRows([newAbatimentoRow()]);
    setLiberarVisible(true);
  };

  const submitLiberarCredito = async () => {
    if (!garantia) return;
    if (liberarStatus === STATUS_CODES.abatimentoEmBoleto) {
      const linhas: Array<{ nf: string; parcela: string; vencimento: string; valor: number }> = [];
      for (const row of liberarRows) {
        const valor = parseCurrencyInput(row.valor);
        const data = parseBrDate(row.vencimento);
        if (!row.nf.trim() || !row.parcela.trim() || !valor || !data) {
          window.alert("Preencha todas as colunas das linhas de abatimento.");
          return;
        }
        linhas.push({
          nf: row.nf.trim(),
          parcela: row.parcela.trim(),
          vencimento: data.toISOString().split("T")[0],
          valor,
        });
      }
      await updateStatus(STATUS_CODES.abatimentoEmBoleto, { abatimentos: linhas });
      setLiberarVisible(false);
      return;
    }
    const valor = parseCurrencyInput(liberarValor);
    const precisaNf = NF_REQUIRED_STATUS.has(liberarStatus);
    const nfInformada = liberarNf.trim();
    if (precisaNf && !nfInformada) {
      window.alert("Informe o número da NF recebida.");
      return;
    }
    if (precisaNf) {
      const statusLabel = STATUS_FLOW.find((item) => item.code === liberarStatus)?.label ?? "Status final";
      await QualidadeApi.enviarAtualizacao(garantia.id, {
        descricao: `NF informada para conclusão (${statusLabel}): ${nfInformada}.`,
      });
    }
    const payload: Record<string, unknown> = {};
    if (valor && valor > 0) {
      payload.valor_credito_utilizado = valor;
    }
    if (nfInformada) {
      payload.numero_nf_credito = nfInformada;
    }
    await updateStatus(liberarStatus, Object.keys(payload).length > 0 ? payload : undefined);
    setLiberarVisible(false);
  };

  const statusAtual = garantia ? getStatusDefinition(garantia.status) : undefined;
  const total = garantia?.valorCreditoTotal ?? 0;
  const utilizado = garantia?.valorCreditoUtilizado ?? 0;
  const saldo = Math.max(total - utilizado, 0);
  const completedStatusCodes = garantia ? computeCompletedStatuses(garantia) : undefined;
  const editFormData = useMemo(
    () =>
      garantia
        ? {
          nomeFornecedor: garantia.nomeFornecedor,
          notaInterna: garantia.notaInterna,
          emailFornecedor: garantia.emailFornecedor ?? "",
          copiasEmail: garantia.copiasEmail ?? "",
          produtos: garantia.produtos,
          tipoGarantia: garantia.tipoGarantia ?? "Avaria",
          protocoloFornecedor: garantia.protocoloFornecedor ?? "",
          nfsCompra: garantia.nfsCompra ?? "",
        }
        : undefined,
    [garantia],
  );

  const handleEditSuccess = useCallback(() => {
    setEditarDadosVisible(false);
    carregar();
  }, [carregar]);

  const actionButtons = useMemo(() => {
    if (!garantia) return null;
    const status = garantia.status;
    if (status === STATUS_CODES.aguardandoAprovacaoFornecedor) {
      return (
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="Editar dados"
            variant="ghost"
            icon={<MdEdit size={18} />}
            onClick={() => setEditarDadosVisible(true)}
          />
          <ActionButton
            label="Reprovar"
            variant="ghost"
            icon={<MdBlock size={18} />}
            onClick={() => updateStatus(STATUS_CODES.garantiaReprovada)}
          />
          <ActionButton label="Aprovar Garantia" icon={<MdCheckCircle size={18} />} onClick={abrirAprovacao} />
        </div>
      );
    }
    if (status === STATUS_CODES.aprovacaoNotaFiscal) {
      return (
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="NFe Reprovada"
            variant="ghost"
            icon={<MdThumbDown size={18} />}
            onClick={handleNfeReprovada}
          />
          <ActionButton label="NFe Aprovada" icon={<MdThumbUp size={18} />} onClick={handleNfeAprovada} />
        </div>
      );
    }
    if (status === STATUS_CODES.emissaoNotaFiscal) {
      return <ActionButton label="Registrar Nota Fiscal" icon={<MdDescription size={18} />} onClick={handleNota} />;
    }
    if (status === STATUS_CODES.descarteMercadoria) {
      return <ActionButton label="Confirmar Descarte" icon={<MdDelete size={18} />} onClick={handleDescarte} />;
    }
    if (status === STATUS_CODES.aguardandoColeta || status === STATUS_CODES.aguardandoFreteCortesia) {
      return <ActionButton label="Confirmar Envio/Coleta" icon={<MdLocalShipping size={18} />} onClick={handleEnvio} />;
    }
    if (status === STATUS_CODES.aguardandoAnalise) {
      return (
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="Analise Reprovada"
            variant="ghost"
            icon={<MdThumbDown size={18} />}
            onClick={() => updateStatus(STATUS_CODES.garantiaReprovadaAnalise)}
          />
          <ActionButton label="Analise Aprovada" icon={<MdThumbUp size={18} />} onClick={handleValorCredito} />
        </div>
      );
    }
    if (status === STATUS_CODES.aguardandoCredito) {
      return <ActionButton label="Crédito Liberado" icon={<MdPaid size={18} />} onClick={handleLiberarCredito} />;
    }
    const etapasConclusao = [
      STATUS_CODES.produtoProximaCompra,
      STATUS_CODES.trocaProduto,
      STATUS_CODES.abatimentoProximoPedido,
      STATUS_CODES.creditoEmConta,
      STATUS_CODES.abatimentoEmBoleto,
    ];
    if (etapasConclusao.includes(status)) {
      return (
        <ActionButton
          label="Concluir Processo"
          icon={<MdFlag size={18} />}
          onClick={handleConcluirProcesso}
          className="bg-lime-600 hover:bg-lime-700 border-0"
        />
      );
    }
    if ([STATUS_CODES.concluida, STATUS_CODES.garantiaReprovada, STATUS_CODES.garantiaReprovadaAnalise].includes(status)) {
      return <p className="text-sm font-semibold text-slate-500">Processo finalizado.</p>;
    }
    return <p className="text-sm text-slate-500">Nenhuma ação disponível para este status.</p>;
  }, [garantia, updateStatus]);

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title={garantia ? `Garantia #${garantia.id}` : "Detalhes da Garantia"}
          subtitle="Acompanhe as interações e atualize o processo"
          onBack={() => router.back()}
        />
        {alterandoStatus && <p className="text-sm text-slate-500">Atualizando status...</p>}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-3xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : garantia ? (
          <div className="space-y-6">
            <SectionCard
              title="Resumo do Processo"
              trailing={
                statusAtual && <StatusChip label={statusAtual.label} color={statusAtual.color} background={statusAtual.background} />
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InfoLine label="Fornecedor" value={garantia.nomeFornecedor} />
                <InfoLine label="Nota Interna" value={garantia.notaInterna} />
                <InfoLine label="NF Compra" value={garantia.nfsCompra ?? "N/A"} />
                <InfoLine label="Tipo de Garantia" value={garantia.tipoGarantia ?? "N/A"} />
                {garantia.protocoloFornecedor && <InfoLine label="Protocolo" value={garantia.protocoloFornecedor} />}
                <InfoLine label="Criado em" value={formatDateTime(garantia.dataCriacao)} />
              </div>
              <div className="mt-4">{actionButtons}</div>
            </SectionCard>

            <SectionCard title="Produtos">
              {garantia.produtos ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {garantia.produtos.split(';').map((p) => p.trim()).filter(Boolean).map((prod, idx) => {
                    // Regex para extrair campos: Base (Tipo) (Qtd: N) (NF Compra: X) (Ref: Y)
                    const match = prod.match(/^(.*?)(?:\s+\((Avaria|Anomalia)\))?(?:\s+\(Qtd:\s*(\d+)\))?(?:\s+\(NF Compra:\s*([^)]+)\))?(?:\s+\(Ref:\s*([^)]+)\))?$/i);

                    const base = match ? match[1].trim() : prod;
                    const tipo = match ? match[2] : null;
                    const qtd = match ? match[3] : null;
                    const nf = match ? match[4] : null;
                    const ref = match ? match[5] : null;

                    const parts = base.split(' - ');
                    const codigo = parts.length > 1 ? parts[0].trim() : null;
                    const descricao = parts.length > 1 ? parts.slice(1).join(' - ').trim() : base;

                    return (
                      <div key={idx} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3 relative overflow-hidden">
                        {tipo && (
                          <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${tipo.toLowerCase() === 'anomalia' ? 'bg-purple-500' : 'bg-orange-500'} rounded-bl-xl`}>
                            {tipo}
                          </div>
                        )}
                        {codigo && <span className="text-xs font-bold text-slate-500 mb-1">{codigo}</span>}
                        <span className="text-sm font-medium text-slate-800 mb-2 pr-12">{descricao}</span>

                        <div className="mt-auto flex flex-wrap gap-2 text-xs text-slate-600">
                          {qtd && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 border border-slate-200">
                              <span className="font-semibold">Qtd:</span> {qtd}
                            </span>
                          )}
                          {nf && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 border border-slate-200">
                              <span className="font-semibold">NF:</span> {nf}
                            </span>
                          )}
                          {ref && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 border border-slate-200">
                              <span className="font-semibold">Ref:</span> {ref}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum produto registrado.</p>
              )}
            </SectionCard>

            <SectionCard title="Status">
              <div className="w-full overflow-x-auto pb-2">
                <StatusStepper current={garantia.status} completed={completedStatusCodes} />
              </div>
            </SectionCard>

            <SectionCard title="Valores de Crédito">
              <div className="grid gap-4 md:grid-cols-3">
                <ResumoCard label="Crédito Total" value={formatCurrency(total)} />
                <ResumoCard label="Utilizado" value={formatCurrency(utilizado)} />
                <ResumoCard label="Saldo" value={formatCurrency(saldo)} highlight />
              </div>
            </SectionCard>

            <SectionCard title="Linha do Tempo">
              {garantia.timeline.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma interação registrada ainda.</p>
              ) : (
                garantia.timeline.map((item) => <TimelineItemCard key={item.id} item={item} />)
              )}
            </SectionCard>

            <SectionCard title="Atualizações internas">
              <textarea
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
                placeholder="Descreva a atualização e ela será registrada neste processo."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              />
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <input
                  ref={mensagemFileInputRef}
                  id="mensagem-anexos-input"
                  type="file"
                  multiple
                  onChange={handleMensagemFilesChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => mensagemFileInputRef.current?.click()}
                  className="keep-color inline-flex items-center gap-2 w-fit rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-2 text-slate-600 hover:border-slate-400"
                >
                  <MdAttachFile size={16} />
                  Anexar arquivos
                </button>
                {mensagemAnexos.length > 0 && (
                  <ul className="space-y-2 text-xs text-slate-600">
                    {mensagemAnexos.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <span className="truncate pr-3">{file.name}</span>
                        <button
                          type="button"
                          className="keep-color text-red-600 hover:text-red-500"
                          onClick={() => removeMensagemAnexo(index)}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ActionButton
                label="Registrar atualização"
                icon={<MdAttachFile size={18} />}
                onClick={handleAtualizacao}
                loading={enviando}
                disabled={!mensagem.trim() && mensagemAnexos.length === 0}
                className="rounded-2xl px-6 py-3"
              />
            </SectionCard>

            <SectionCard title="Anexos">
              {garantia.anexos.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum anexo disponível.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {garantia.anexos.map((anexo, index) => {
                    const hasPath = Boolean(anexo.caminho?.trim());
                    return (
                      <button
                        key={anexo.id}
                        type="button"
                        className="keep-color text-left text-[var(--primary-600)] underline disabled:opacity-60"
                        onClick={() => hasPath && openAnexoModal(index)}
                        disabled={!hasPath}
                      >
                        {anexo.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Dados logísticos">
              <div className="grid gap-4 md:grid-cols-2">
                {garantia.fretePorContaDe && <InfoLine label="Frete por conta de" value={garantia.fretePorContaDe} />}
                {garantia.transportadoraRazaoSocial && <InfoLine label="Transportadora" value={garantia.transportadoraRazaoSocial} />}
                {garantia.dataColetaEnvio && <InfoLine label="Data de coleta/envio" value={formatDate(garantia.dataColetaEnvio)} />}
                {garantia.numeroNfDevolucao && <InfoLine label="NF de devolução" value={garantia.numeroNfDevolucao} />}
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
            <p className="text-lg font-semibold text-slate-900">Nenhum dado encontrado.</p>
            <p className="text-sm text-slate-500">{error ?? "Tente atualizar para buscar novamente."}</p>
            <ActionButton label="Tentar novamente" icon={<MdRefresh size={18} />} onClick={carregar} />
          </div>
        )}

        {anexoViewerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/60" onClick={closeAnexoModal} />
            <div className="relative z-10 w-full max-w-4xl mx-4 rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold">
                  Visualizar anexos{" "}
                  {totalAnexos > 0 ? `(${Math.min(anexoViewerIndex + 1, totalAnexos)}/${totalAnexos})` : ""}
                </div>
                <button
                  type="button"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-slate-100"
                  onClick={closeAnexoModal}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {currentAnexo ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div className="lg:col-span-7">
                      <div className="relative w-full aspect-[4/3] bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                        {totalAnexos > 1 && (
                          <>
                            <button
                              type="button"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-slate-100"
                              onClick={goToPrevAnexo}
                              title="Anterior"
                            >
                              <FaChevronLeft />
                            </button>
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-slate-100"
                              onClick={goToNextAnexo}
                              title="Próximo"
                            >
                              <FaChevronRight />
                            </button>
                          </>
                        )}
                        {anexoViewerLoading && !currentAnexoUrl ? (
                          <p className="text-sm text-slate-500">Carregando arquivo...</p>
                        ) : currentAnexoEhImagem && currentAnexoUrl ? (
                          <img
                            src={currentAnexoUrl}
                            alt={currentAnexo.nome ?? "Anexo"}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : currentAnexoEhImagem ? (
                          <p className="text-sm text-slate-500">Gerando link para visualização...</p>
                        ) : (
                          <div className="px-6 text-center text-sm text-slate-600">
                            Pré-visualização disponível apenas para imagens. Utilize o botão para baixar o arquivo.
                          </div>
                        )}
                      </div>
                      {anexoViewerError && (
                        <p className="mt-3 text-center text-sm text-red-600">{anexoViewerError}</p>
                      )}
                      {totalAnexos > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          {anexosDisponiveis.map((_, idx) => (
                            <button
                              type="button"
                              key={idx}
                              className={`h-2.5 rounded-full transition-all ${idx === anexoViewerIndex ? "w-6 bg-[var(--primary-600)]" : "w-2.5 bg-slate-300"
                                }`}
                              onClick={() => setAnexoViewerIndex(idx)}
                              aria-label={`Ir para anexo ${idx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="lg:col-span-5 space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-700">{currentAnexo.nome}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tipo: {currentAnexoEhImagem ? "Imagem" : "Arquivo"}
                        </p>
                        {currentAnexo.caminho && (
                          <p className="mt-2 text-xs text-slate-500 break-all">{currentAnexo.caminho}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary-600)] px-4 py-2.5 font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
                        onClick={() => currentAnexo && handleDownloadAnexo(currentAnexo)}
                        disabled={downloadingCurrentAnexo}
                      >
                        <FaDownload />
                        {downloadingCurrentAnexo ? "Preparando download..." : "Baixar arquivo"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-600">Nenhum anexo selecionado.</p>
                )}
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-end">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                  onClick={closeAnexoModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <FormModal
          open={editarDadosVisible}
          title="Editar garantia"
          onClose={() => setEditarDadosVisible(false)}
          width="lg"
        >
          {garantia && (
            <NovaGarantiaForm
              variant="modal"
              mode="edit"
              garantiaId={garantia.id}
              initialData={editFormData}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditarDadosVisible(false)}
            />
          )}
        </FormModal>

        <FormModal
          open={anomaliaVisible}
          title="Aprovar (Anomalia)"
          onClose={() => setAnomaliaVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setAnomaliaVisible(false)} />
              <ActionButton label="Continuar" shape="rounded" onClick={submitAnomalia} disabled={!anomaliaCfop.trim()} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <p className="text-sm font-semibold text-slate-600">Será necessária Nota Fiscal?</p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setAnomaliaPrecisaNF(false)}
                className={toggleButtonClasses(!anomaliaPrecisaNF)}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setAnomaliaPrecisaNF(true)}
                className={toggleButtonClasses(anomaliaPrecisaNF)}
              >
                Sim
              </button>
            </div>
            <input
              type="text"
              value={anomaliaCfop}
              onChange={(event) => setAnomaliaCfop(event.target.value)}
              placeholder="CFOP *"
              className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FormModal>

        <FormModal
          open={aprovarModalVisible}
          title="Aprovar Garantia"
          onClose={() => setAprovarModalVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setAprovarModalVisible(false)} />
              <ActionButton label="Continuar" shape="rounded" onClick={submitAprovarModal} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <p className="text-sm font-semibold text-slate-600">O fornecedor precisa de Nota Fiscal?</p>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setAprovarPrecisaNF(false)}
                className={toggleButtonClasses(!aprovarPrecisaNF)}
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => setAprovarPrecisaNF(true)}
                className={toggleButtonClasses(aprovarPrecisaNF)}
              >
                Sim
              </button>
            </div>
            {aprovarPrecisaNF && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-slate-600">CFOP *</span>
                <input
                  type="text"
                  value={aprovarCfop}
                  onChange={(event) => setAprovarCfop(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={freteCortesiaSelecionado}
                onChange={(event) => setFreteCortesiaSelecionado(event.target.checked)}
                className="h-4 w-4 accent-[var(--primary-600)]"
              />
              <span>Frete cortesia</span>
            </label>
          </div>
        </FormModal>

        <FormModal
          open={concluirVisible}
          title="Concluir Garantia"
          onClose={() => setConcluirVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setConcluirVisible(false)} />
              <ActionButton label="Concluir" shape="rounded" onClick={submitConcluir} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <p className="text-sm text-slate-600">Informe a NF recebida para concluir o processo.</p>
            <input
              type="text"
              value={concluirNf}
              onChange={(event) => setConcluirNf(event.target.value)}
              placeholder="Número da NF *"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FormModal>

        <FormModal
          open={envioVisible}
          title="Envio da Mercadoria"
          onClose={() => setEnvioVisible(false)}
          width="lg"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setEnvioVisible(false)} />
              <ActionButton label="Salvar" shape="rounded" onClick={submitEnvio} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <p className="text-sm font-semibold text-slate-600">A mercadoria será enviada?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEnviarMercadoria(true)}
                className={toggleButtonClasses(enviarMercadoria)}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setEnviarMercadoria(false)}
                className={toggleButtonClasses(!enviarMercadoria)}
              >
                Não
              </button>
            </div>

            {enviarMercadoria && (
              <>
                <p className="text-sm font-semibold text-slate-600">Frete por conta de</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnvioFrete("fornecedor");
                      setEnvioCorreio(false);
                      setColetaForm((prev) => ({
                        ...prev,
                        razao: "",
                        cnpj: "",
                        endereco: "",
                        cidade: "",
                        uf: "",
                        ie: "",
                        codigo: "",
                        obs: "",
                      }));
                    }}
                    className={toggleButtonClasses(envioFrete === "fornecedor")}
                  >
                    Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnvioFrete("loja");
                      setEnvioCorreio(false);
                    }}
                    className={toggleButtonClasses(envioFrete === "loja")}
                  >
                    Loja
                  </button>
                </div>

                {envioFrete === "loja" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-semibold">Transportadora padrão ST</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dados serão preenchidos automaticamente para a coleta.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={envioCorreio}
                        onChange={(event) => setEnvioCorreio(event.target.checked)}
                        className="h-4 w-4 accent-[var(--primary-600)]"
                      />
                      <span>Envio pelos Correios</span>
                    </label>
                    {envioCorreio ? (
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-xs font-semibold text-slate-600">Código do objeto *</span>
                        <input
                          type="text"
                          value={codigoObjeto}
                          onChange={(event) => setCodigoObjeto(event.target.value)}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Transportadora *"
                          value={coletaForm.razao}
                          onChange={(event) => setColetaForm((prev) => ({ ...prev, razao: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            placeholder="CNPJ *"
                            value={coletaForm.cnpj}
                            onChange={(event) => setColetaForm((prev) => ({ ...prev, cnpj: event.target.value }))}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="I.E. (opcional)"
                            value={coletaForm.ie}
                            onChange={(event) => setColetaForm((prev) => ({ ...prev, ie: event.target.value }))}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Endereço *"
                          value={coletaForm.endereco}
                          onChange={(event) => setColetaForm((prev) => ({ ...prev, endereco: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            type="text"
                            placeholder="Cidade *"
                            value={coletaForm.cidade}
                            onChange={(event) => setColetaForm((prev) => ({ ...prev, cidade: event.target.value }))}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="UF *"
                            value={coletaForm.uf}
                            onChange={(event) => setColetaForm((prev) => ({ ...prev, uf: event.target.value.toUpperCase() }))}
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Código de coleta/envio (opcional)"
                          value={coletaForm.codigo}
                          onChange={(event) => setColetaForm((prev) => ({ ...prev, codigo: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          rows={3}
                          placeholder="Observações (opcional)"
                          value={coletaForm.obs}
                          onChange={(event) => setColetaForm((prev) => ({ ...prev, obs: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </FormModal>

        <FormModal
          open={notaVisible}
          title="Registrar Nota Fiscal"
          onClose={closeNotaModal}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={closeNotaModal} />
              <ActionButton label="Salvar" shape="rounded" onClick={submitNota} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <input
              type="text"
              value={notaNumero}
              onChange={(event) => setNotaNumero(event.target.value)}
              placeholder="Número da NF *"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <span className="font-semibold text-slate-500">Comprovantes (opcional)</span>
              <input
                ref={notaFileInputRef}
                id="nota-comprovante-input"
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleNotaFilesChange}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => notaFileInputRef.current?.click()}
                className="keep-color inline-flex items-center gap-2 w-fit rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
              >
                <MdAttachFile size={16} />
                Escolher arquivo
              </button>
              {notaAnexos.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum arquivo selecionado.</p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-600">
                  {notaAnexos.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <span className="truncate pr-3">{file.name}</span>
                      <button
                        type="button"
                        className="keep-color text-red-600 hover:text-red-500"
                        onClick={() => removeNotaAnexo(index)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </FormModal>

        <FormModal
          open={descarteVisible}
          title="Confirmar Descarte"
          onClose={() => setDescarteVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setDescarteVisible(false)} />
              <ActionButton label="Confirmar" shape="rounded" onClick={submitDescarte} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-500">Comprovantes *</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDescarteAnexos(event.target.files ? Array.from(event.target.files) : [])
                }
              />
            </label>
            {descarteAnexos.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-600 space-y-1">
                {descarteAnexos.map((file) => (
                  <li key={file.name}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
        </FormModal>

        <FormModal
          open={dataEnvioVisible}
          title="Data de Coleta/Envio"
          onClose={() => setDataEnvioVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setDataEnvioVisible(false)} />
              <ActionButton label="Salvar" shape="rounded" onClick={submitDataEnvio} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <input
              type="text"
              value={dataEnvioInput}
              onChange={(event) => setDataEnvioInput(formatDateMask(event.target.value))}
              placeholder="Data (dd/mm/aaaa)"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FormModal>

        <FormModal
          open={valorCreditoVisible}
          title="Valor de Crédito"
          onClose={() => setValorCreditoVisible(false)}
          width="sm"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setValorCreditoVisible(false)} />
              <ActionButton label="Confirmar" shape="rounded" onClick={submitValorCredito} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <input
              type="text"
              value={valorCreditoInput}
              onChange={(event) => setValorCreditoInput(formatCurrencyMask(event.target.value))}
              placeholder="Valor (R$)"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </FormModal>

        <FormModal
          open={liberarVisible}
          title="Liberar Crédito"
          onClose={() => setLiberarVisible(false)}
          width="lg"
          footer={
            <>
              <ActionButton label="Cancelar" variant="ghost" shape="rounded" onClick={() => setLiberarVisible(false)} />
              <ActionButton label="Confirmar" shape="rounded" onClick={submitLiberarCredito} />
            </>
          }
        >
          <div className="space-y-4 px-1">
            <label className="text-sm font-semibold text-slate-600">Status final</label>
            <select
              value={liberarStatus}
              onChange={(event) => setLiberarStatus(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={STATUS_CODES.produtoProximaCompra}>Produto em Próxima Compra</option>
              <option value={STATUS_CODES.trocaProduto}>Troca de Produto</option>
              <option value={STATUS_CODES.abatimentoProximoPedido}>Abatimento em Próximo Pedido</option>
              <option value={STATUS_CODES.creditoEmConta}>Crédito em Conta</option>
              <option value={STATUS_CODES.abatimentoEmBoleto}>Abatimento em Boleto</option>
            </select>

            {liberarStatus === STATUS_CODES.abatimentoEmBoleto ? (
              <div className="mt-4 space-y-4">
                {liberarRows.map((row, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-4 space-y-2 relative">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="NF *"
                        value={row.nf}
                        onChange={(event) =>
                          setLiberarRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, nf: event.target.value } : item)))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Parcela *"
                        value={row.parcela}
                        onChange={(event) =>
                          setLiberarRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, parcela: event.target.value } : item)))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Vencimento (dd/mm/aaaa) *"
                        value={row.vencimento}
                        onChange={(event) =>
                          setLiberarRows((prev) =>
                            prev.map((item, idx) =>
                              idx === index ? { ...item, vencimento: formatDateMask(event.target.value) } : item,
                            ),
                          )
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Valor *"
                        value={row.valor}
                        onChange={(event) =>
                          setLiberarRows((prev) =>
                            prev.map((item, idx) =>
                              idx === index ? { ...item, valor: formatCurrencyMask(event.target.value) } : item,
                            ),
                          )
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute top-2 right-2 rounded-full border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-30"
                      onClick={() => setLiberarRows((prev) => prev.filter((_, idx) => idx !== index))}
                      disabled={liberarRows.length === 1}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <ActionButton
                  label="Adicionar linha"
                  variant="ghost"
                  icon={<MdAdd size={18} />}
                  onClick={() => setLiberarRows((prev) => [...prev, newAbatimentoRow()])}
                />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={liberarValor}
                  onChange={(event) => setLiberarValor(formatCurrencyMask(event.target.value))}
                  placeholder="Valor utilizado (opcional)"
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={liberarNf}
                  onChange={(event) => setLiberarNf(event.target.value)}
                  placeholder={`NF recebida${NF_REQUIRED_STATUS.has(liberarStatus) ? " *" : " (opcional)"}`}
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        </FormModal>
      </div>
    </div>
  );
}
