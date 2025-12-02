"use client";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from "react";
import { serviceUrl } from "@/lib/services";
import { motion } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { usePermissions } from "../../../hooks/usePermissions";
import { usePathname } from "next/navigation";

// --- Types ---
type ColumnKey = "aguardando_atendimento" | "em_analise" | "finalizado";

type Task = {
  id: string;
  title: string;
  createdAt: number;
  etapa: ColumnKey;
  // SAC specific
  desc?: string;
  due?: string; // YYYY-MM-DD
  data?: string;
  venda?: string;
  cliente?: string;
  itemReclamado?: string;
  reclamacao?: string;
  solucao?: string;
  dataSolucao?: string;
  custo?: string;
  dptoResponsavel?: string;
  tipo?: string;
  vendedor?: string;
  imagens?: string[]; // Array de base64
};

type BoardState = Record<ColumnKey, Task[]>;

const COLS: { key: ColumnKey; label: string }[] = [
  { key: "aguardando_atendimento", label: "Solicitado" },
  { key: "em_analise", label: "Em Andamento" },
  { key: "finalizado", label: "Concluído" },
];

const AUTOS_KEY = "kanban_automations";
const uid = () =>
  Math.random().toString(36).slice(2, 7) + "-" + Date.now().toString(36);

// --- Componentes ---
function Card({
  task,
  onDelete,
  onOpen,
  onConcluir,
  isDragging = false,
  userSetor,
  colKey,
}: {
  task: Task;
  onDelete?: () => void;
  onOpen?: () => void;
  onConcluir?: () => void;
  isDragging?: boolean;
  userSetor: string;
  colKey: ColumnKey;
}) {
  // Permissão de edição (mantida do original)
  const canEdit =
    (userSetor === "Atacado" || userSetor === "Varejo")
      ? colKey === "aguardando_atendimento"
      : true;

  const dueDate = task.due ? new Date(task.due) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      onClick={() => canEdit && onOpen && onOpen()}
      data-kanban-card="true"
      className={`rounded-lg border border-gray-200 dark:border-neutral-700 p-3 
                  bg-white dark:bg-[#0e1116] 
                  transition-all duration-300 ease-out group relative
                  ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}
                  ${isDragging
          ? "shadow-xl ring-2 ring-blue-500 rotate-2 z-50"
          : "shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex flex-wrap gap-1">
            {task.vendedor && (
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border bg-gray-100 text-gray-700 border-gray-200 uppercase">
                {task.vendedor}
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium leading-5 text-gray-900 dark:text-[#d6d6d8] line-clamp-3">
            {task.title}
          </h4>
          {task.itemReclamado && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-semibold">Item:</span> {task.itemReclamado}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          {dueDate && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] leading-tight font-semibold border whitespace-nowrap
                ${isOverdue
                  ? "bg-red-500 text-white border-red-600"
                  : "bg-gray-100 text-gray-700 border-gray-300"
                }
              `}
            >
              {dueDate.toLocaleDateString("pt-BR").slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
          {task.venda && <span>Venda: {task.venda}</span>}
          {task.cliente && <span>Cod. Cliente: {task.cliente}</span>}
        </div>
      </div>

      {task.solucao && (
        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-bold text-green-600 dark:text-green-500">Solução:</span> {task.solucao}
          </p>
        </div>
      )}

    </motion.div>
  );
}

function Column({
  label,
  colKey,
  tasks,
  onAddTask,
  onDeleteTask,
  onOpenTask,
  onConcluirTask,
  disableDrag,
  userSetor,
  onCreateTask,
}: {
  label: string;
  colKey: ColumnKey;
  tasks: Task[];
  onAddTask: (col: ColumnKey, title: string) => void;
  onDeleteTask: (col: ColumnKey, id: string) => void;
  onOpenTask: (col: ColumnKey, id: string) => void;
  onConcluirTask: (col: ColumnKey, id: string) => void;
  onCreateTask: (col: ColumnKey, initialTitle: string, type: string) => void;
  disableDrag: boolean;
  userSetor: string;
}) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Modal de tipo para criação
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeChoice, setTypeChoice] = useState<"garantia" | "devolucao" | "pendencia" | null>(null);

  const canCreate = (userSetor === "Atacado" || userSetor === "Varejo") ? colKey === "aguardando_atendimento" : true;

  return (
    <div
      data-col={colKey}
      className="flex flex-col w-[320px] shrink-0 max-h-full rounded-xl bg-gray-200 dark:bg-[#171c23] border border-gray-300/60 dark:border-neutral-700"
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 px-1">
          {label}
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-200 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Tasks List */}
      <Droppable droppableId={colKey} isDropDisabled={disableDrag}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 min-h-[20px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700
              ${snapshot.isDraggingOver
                ? "dark:bg-blue-900/10 transition-colors"
                : ""
              }
            `}
          >
            <div className="flex flex-col gap-2">
              {tasks.map((t, index) => {
                // Usando o ID da tarefa como draggableId para garantir unicidade e persistência correta
                const draggableId = t.id;
                return (
                  <Draggable
                    key={draggableId}
                    draggableId={draggableId}
                    index={index}
                    isDragDisabled={disableDrag || ((userSetor === "Atacado" || userSetor === "Varejo") && colKey !== "aguardando_atendimento")}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="draggable-wrapper keep-color"
                        style={{ ...dragProvided.draggableProps.style }}
                      >
                        <Card
                          task={t}
                          onDelete={() => onDeleteTask(colKey, t.id)}
                          onOpen={() => onOpenTask(colKey, t.id)}
                          onConcluir={() => onConcluirTask(colKey, t.id)}
                          isDragging={dragSnapshot.isDragging}
                          userSetor={userSetor}
                          colKey={colKey}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>

      {colKey === "aguardando_atendimento" && (
        <div className="p-2 shrink-0">
          <button
            onClick={() => setShowTypeModal(true)}
            disabled={!canCreate}
            className={`keep-color kanban-btn flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-lg leading-none">+</span> Adicionar um cartão
          </button>
        </div>
      )}

      {/* Modal de escolha Garantia/Devolução */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[340px] shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tipo de Card</h2>
            <div className="flex flex-col gap-3">
              <button
                className={`px-4 py-2 rounded-xl border font-bold ${typeChoice === "garantia" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"}`}
                onClick={() => setTypeChoice("garantia")}
              >Garantia</button>
              <button
                className={`px-4 py-2 rounded-xl border font-bold ${typeChoice === "devolucao" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"}`}
                onClick={() => setTypeChoice("devolucao")}
              >Devolução</button>
              <button
                className={`px-4 py-2 rounded-xl border font-bold ${typeChoice === "pendencia" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"}`}
                onClick={() => setTypeChoice("pendencia")}
              >Pendência</button>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300"
                onClick={() => {
                  setShowTypeModal(false);
                  setTypeChoice(null);
                }}
              >Cancelar</button>
              <button
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                disabled={!typeChoice}
                onClick={() => {
                  let prefix = "";
                  if (typeChoice === "garantia") prefix = "garantia #";
                  else if (typeChoice === "devolucao") prefix = "devolucao #";
                  else if (typeChoice === "pendencia") prefix = "pendencia #";

                  if (typeChoice) {
                    onCreateTask(colKey, prefix, typeChoice);
                    setShowTypeModal(false);
                    setTypeChoice(null);
                  }
                }}
              >Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Hook Customizado para Drag-to-Scroll ---
function useDraggableScroll(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const slider = ref.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const shouldIgnoreTarget = (target: HTMLElement | null) => {
      if (!target) return false;
      return !!target.closest(
        "[data-kanban-card], button, textarea, input, select, label, option, a"
      );
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (shouldIgnoreTarget(target)) return;
      isDown = true;
      startX = e.clientX;
      scrollLeft = slider.scrollLeft;
      slider.style.cursor = "grabbing";
      slider.style.userSelect = "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown || !slider) return;
      e.preventDefault();
      const x = e.clientX;
      const walk = x - startX;
      slider.scrollLeft = scrollLeft - walk;
    };

    const onMouseUp = () => {
      if (!isDown || !slider) return;
      isDown = false;
      slider.style.cursor = "grab";
      slider.style.userSelect = "auto";
    };

    slider.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      slider.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [ref]);
}

export default function Page() {
  const KANBAN_URL = serviceUrl("sac");
  const [board, setBoard] = useState<BoardState>({
    aguardando_atendimento: [],
    em_analise: [],
    finalizado: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const boardRef = useRef<HTMLDivElement | null>(null);
  useDraggableScroll(boardRef);

  // Carrega o board
  useEffect(() => {
    async function fetchBoard() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(KANBAN_URL + "/kanban");
        if (!res.ok) throw new Error("Erro ao buscar kanban");
        const data = await res.json();
        setBoard({
          aguardando_atendimento: data.aguardando_atendimento || [],
          em_analise: data.em_analise || [],
          finalizado: data.finalizado || []
        });
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchBoard();
  }, [KANBAN_URL]);

  // --- Filtros ---
  const [filterVendedor, setFilterVendedor] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterVenda, setFilterVenda] = useState("");

  // Modal de automação
  const [showModal, setShowModal] = useState(false);
  const [automation, setAutomation] = useState({
    col: "aguardando_atendimento",
    title: "",
    time: "",
  });

  // Modal de edição de card
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selected, setSelected] = useState<{
    col: ColumnKey;
    id: string;
  } | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    desc: string;
    due: string;
    // SAC fields
    data: string;
    venda: string;
    cliente: string;
    itemReclamado: string;
    reclamacao: string;
    solucao: string;
    dataSolucao: string;
    custo: string;
    dptoResponsavel: string;
    tipo: string;
    vendedor: string;
    imagens: string[];
    files: File[];
  }>({
    title: "", desc: "", due: "",
    data: "", venda: "", cliente: "", itemReclamado: "", reclamacao: "",
    solucao: "", dataSolucao: "", custo: "", dptoResponsavel: "",
    tipo: "", vendedor: "", imagens: [], files: []
  });

  // Modal de Conclusão
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [concluirSolution, setConcluirSolution] = useState("");
  const [taskToConclude, setTaskToConclude] = useState<{ col: ColumnKey; id: string } | null>(null);

  function openConcluirModal(col: ColumnKey, id: string) {
    setShowTaskModal(false); // Fecha o modal da tarefa antes
    setTaskToConclude({ col, id });
    setConcluirSolution("");
    setShowConcluirModal(true);
  }

  // Modal de Reabertura
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [taskToReopen, setTaskToReopen] = useState<{ id: string; from: ColumnKey; to: ColumnKey } | null>(null);

  function openReopenModal(id: string, from: ColumnKey, to: ColumnKey) {
    setTaskToReopen({ id, from, to });
    setShowReopenModal(true);
  }

  async function confirmReopen() {
    if (!taskToReopen) return;
    const { id, from, to } = taskToReopen;
    const task = board[from].find(t => t.id === id);
    if (!task) return;

    const updatedTask = {
      ...task,
      etapa: to,
      solucao: "",
      dataSolucao: ""
    };

    setBoard(prev => {
      const sourceList = prev[from].filter(t => t.id !== id);
      const destList = [updatedTask, ...prev[to]]; // Move to top of destination
      return { ...prev, [from]: sourceList, [to]: destList };
    });

    try {
      await fetch(`${KANBAN_URL}/kanban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask)
      });
    } catch { }

    setShowReopenModal(false);
    setTaskToReopen(null);
  }

  async function saveConclusao() {
    if (!taskToConclude || !concluirSolution.trim()) return;

    const { col, id } = taskToConclude;
    const task = board[col].find(t => t.id === id);
    if (!task) return;

    const updatedTask = {
      ...task,
      etapa: "finalizado" as ColumnKey,
      solucao: concluirSolution,
      dataSolucao: new Date().toISOString().slice(0, 10)
    };

    // Atualiza estado local: remove da origem e adiciona em finalizado
    setBoard(prev => {
      const sourceList = prev[col].filter(t => t.id !== id);
      const destList = [updatedTask, ...prev.finalizado];
      return {
        ...prev,
        [col]: sourceList,
        finalizado: destList
      };
    });

    try {
      await fetch(`${KANBAN_URL}/kanban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask)
      });
    } catch { }

    setShowConcluirModal(false);
    setTaskToConclude(null);
    setShowTaskModal(false);
  }

  const addTask = React.useCallback(async (col: ColumnKey, title: string) => {
    const newTask: Task = {
      id: uid(),
      title,
      createdAt: Date.now(),
      etapa: col,
    };
    setBoard((prev) => ({
      ...prev,
      [col]: [newTask, ...(prev[col] ?? [])],
    }));
    try {
      await fetch(`${KANBAN_URL}/kanban`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
    } catch { }
  }, [KANBAN_URL]);

  function deleteTask(col: ColumnKey, id: string) {
    setBoard((prev) => ({
      ...prev,
      [col]: prev[col].filter((t) => t.id !== id),
    }));
    fetch(`${KANBAN_URL}/kanban/${id}`, {
      method: "DELETE"
    });
  }

  // --- Drag & Drop ---
  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId as ColumnKey;
    const to = destination.droppableId as ColumnKey;
    const fromIndex = source.index;
    const toIndex = destination.index;

    if (from === to && fromIndex === toIndex) return;
    if (from === to && fromIndex === toIndex) return;
    if (filterVendedor || filterCliente || filterVenda) return; // Desabilita drop se filtrado

    // Intercepta movimento para finalizado
    if (to === "finalizado" && from !== "finalizado") {
      openConcluirModal(from, draggableId);
      return;
    }

    // Intercepta movimento saindo de finalizado (Reabertura)
    if (from === "finalizado" && to !== "finalizado") {
      openReopenModal(draggableId, from, to);
      return;
    }

    // Atualiza estado local
    setBoard((prev) => {
      const newBoard = { ...prev };
      const sourceList = Array.from(newBoard[from]);
      const [moved] = sourceList.splice(fromIndex, 1);

      if (!moved) return prev;

      // Atualiza a etapa na tarefa movida
      const updatedTask = { ...moved, etapa: to };

      if (from === to) {
        sourceList.splice(toIndex, 0, updatedTask);
        newBoard[from] = sourceList;
      } else {
        const destList = Array.from(newBoard[to]);
        destList.splice(toIndex, 0, updatedTask);
        newBoard[from] = sourceList;
        newBoard[to] = destList;
      }
      return newBoard;
    });

    // Chama API para mover
    // Nota: O endpoint original era PUT /kanban/etapa/{id} com body { etapa: to }
    // O draggableId deve ser o ID da tarefa
    try {
      fetch(`${KANBAN_URL}/kanban/etapa/${draggableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: to })
      });
    } catch { }
  }

  // --- Automação ---
  useEffect(() => {
    type Automation = {
      id: string;
      title: string;
      time: string;
      col: ColumnKey;
      lastRunDate?: string;
    };

    const loadAutos = (): Automation[] => {
      try {
        const raw = localStorage.getItem(AUTOS_KEY);
        return raw ? (JSON.parse(raw) as Automation[]) : [];
      } catch {
        return [];
      }
    };
    const saveAutos = (arr: Automation[]) =>
      localStorage.setItem(AUTOS_KEY, JSON.stringify(arr));
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const toTodayDate = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
      const d = new Date();
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    };

    const runCheck = () => {
      const now = new Date();
      const autos = loadAutos();
      let changed = false;
      for (const a of autos) {
        if (!a.time || !a.title) continue;
        const target = toTodayDate(a.time);
        const shouldRun = now >= target && a.lastRunDate !== todayStr();
        if (shouldRun) {
          addTask(a.col as ColumnKey, a.title + " (auto)");
          a.lastRunDate = todayStr();
          changed = true;
        }
      }
      if (changed) saveAutos(autos);
    };

    runCheck();
    const delay = 60000 - (Date.now() % 60000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timer = setTimeout(() => {
      runCheck();
      interval = setInterval(runCheck, 60000);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [addTask]);

  function saveAutomation() {
    const t = automation.time?.trim();
    const title = automation.title?.trim();
    if (!title) {
      alert("Informe um título.");
      return;
    }
    if (!t || !/^\d{2}:\d{2}$/.test(t)) {
      alert("Informe um horário válido no formato HH:MM.");
      return;
    }
    type Automation = {
      id: string;
      title: string;
      time: string;
      col: ColumnKey;
      lastRunDate?: string;
    };
    const saved = localStorage.getItem(AUTOS_KEY);
    const autos: Automation[] = saved ? JSON.parse(saved) : [];
    autos.push({ id: uid(), title, time: t, col: automation.col as ColumnKey });
    localStorage.setItem(AUTOS_KEY, JSON.stringify(autos));
    setShowModal(false);
  }

  // --- Modal do Card ---
  function openTaskModal(col: ColumnKey, id: string) {
    setSelected({ col, id });
    const t = board[col].find((x) => x.id === id);
    if (t) {
      setTaskForm({
        title: t.title || "",
        desc: t.desc || "",
        due: t.due || "",
        data: t.data || "",
        venda: t.venda || "",
        cliente: t.cliente || "",
        itemReclamado: t.itemReclamado || "",
        reclamacao: t.reclamacao || "",
        solucao: t.solucao || "",
        dataSolucao: t.dataSolucao || "",
        custo: t.custo || "",
        dptoResponsavel: t.dptoResponsavel || "",
        tipo: t.tipo || "",
        vendedor: t.vendedor || "",
        imagens: t.imagens || [],
        files: []
      });
    }
    setShowTaskModal(true);
  }

  function openCreateTaskModal(col: ColumnKey, initialTitle: string, type: string) {
    setSelected({ col, id: "new" }); // "new" indicates creation
    setTaskForm({
      title: initialTitle,
      desc: "",
      due: "",
      data: "",
      venda: "",
      cliente: "",
      itemReclamado: "",
      reclamacao: "",
      solucao: "",
      dataSolucao: "",
      custo: "",
      dptoResponsavel: "",
      tipo: type,
      vendedor: "",
      imagens: [],
      files: []
    });
    setShowTaskModal(true);
  }

  async function saveTaskModal() {
    if (!selected) return;

    // Upload de imagens (base64)
    let imagens: string[] = [...(taskForm.imagens || [])];
    if (taskForm.files && taskForm.files.length > 0) {
      const toBase64 = (file: File) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };
      try {
        const filesBase64 = await Promise.all(taskForm.files.map(toBase64));
        imagens = imagens.concat(filesBase64);
      } catch { }
    }

    if (selected.id === "new") {
      // Criação
      const newTask: Task = {
        id: uid(),
        createdAt: Date.now(),
        etapa: selected.col,
        ...taskForm,
        imagens
      };
      // Remove files do objeto final se existir na tipagem (Task não tem files)
      // @ts-ignore
      delete newTask.files;

      setBoard((prev) => ({
        ...prev,
        [selected.col]: [newTask, ...(prev[selected.col] ?? [])],
      }));

      try {
        await fetch(`${KANBAN_URL}/kanban`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTask)
        });
      } catch { }
    } else {
      // Edição
      const updatedTask = { ...taskForm, imagens, id: selected.id, etapa: selected.col };

      setBoard((prev) => {
        const list = prev[selected.col].map((t) =>
          t.id === selected.id ? { ...t, ...updatedTask } : t
        );
        return { ...prev, [selected.col]: list };
      });

      try {
        await fetch(`${KANBAN_URL}/kanban`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTask)
        });
      } catch { }
    }

    setShowTaskModal(false);
  }

  // Board filtrado
  // Board filtrado
  const filteredBoard: BoardState = useMemo(() => {
    if (!filterVendedor && !filterCliente && !filterVenda) return board;
    const out = {} as BoardState;
    for (const col of COLS) {
      out[col.key] = board[col.key].filter((t) => {
        const matchVendedor = !filterVendedor || (t.vendedor || "").toLowerCase().includes(filterVendedor.toLowerCase());
        const matchCliente = !filterCliente || (t.cliente || "").toLowerCase().includes(filterCliente.toLowerCase());
        const matchVenda = !filterVenda || (t.venda || "").toLowerCase().includes(filterVenda.toLowerCase());
        return matchVendedor && matchCliente && matchVenda;
      });
    }
    return out;
  }, [board, filterVendedor, filterCliente, filterVenda]);

  // User Setor
  const userSetor = typeof window !== "undefined" ? (() => {
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return "";
      const data = JSON.parse(raw);
      return data.setor || "";
    } catch { return ""; }
  })() : "";

  if (!isMounted) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header Toolbar */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-gray-200 dark:border-neutral-800 shrink-0 z-10">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7v10" />
              <path d="M16 7v10" />
              <path d="M12 7v10" />
            </svg>
          </span>
          <span>Kanban SAC</span>
        </h1>

        <div className="h-6 w-px bg-gray-300 dark:bg-neutral-700"></div>

        <div className="flex items-center gap-2">
          <input
            value={filterVendedor}
            onChange={(e) => setFilterVendedor(e.target.value)}
            placeholder="Vendedor"
            className="text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
          />
          <input
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
            placeholder="Cód. Cliente"
            className="text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-32"
          />
          <input
            value={filterVenda}
            onChange={(e) => setFilterVenda(e.target.value)}
            placeholder="Nº Venda"
            className="text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-28"
          />
        </div>

        {(filterVendedor || filterCliente || filterVenda) && (
          <button
            onClick={() => {
              setFilterVendedor("");
              setFilterCliente("");
              setFilterVenda("");
            }}
            className="text-xs px-2 py-1.5 rounded text-red-600 hover:bg-red-50 font-medium"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Board Area */}
      <div
        ref={boardRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden select-none"
        style={{ cursor: "grab" }}
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full flex gap-4 px-6 pb-4 pt-6 min-w-max items-start">
            {COLS.map((c) => (
              <Column
                key={c.key}
                label={c.label}
                colKey={c.key}
                tasks={filteredBoard[c.key]}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onOpenTask={openTaskModal}
                onConcluirTask={openConcluirModal}
                onCreateTask={openCreateTaskModal}
                disableDrag={!!(filterVendedor || filterCliente || filterVenda)}
                userSetor={userSetor}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {error && (
        <div className="absolute bottom-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          Erro: {error}
        </div>
      )}

      {/* Modal Automação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Nova Automação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Card</label>
                <input
                  value={automation.title}
                  onChange={(e) => setAutomation({ ...automation, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horário (HH:MM)</label>
                <input
                  type="time"
                  value={automation.time}
                  onChange={(e) => setAutomation({ ...automation, time: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coluna</label>
                <select
                  value={automation.col}
                  onChange={(e) => setAutomation({ ...automation, col: e.target.value as ColumnKey })}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                >
                  {COLS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700">Cancelar</button>
              <button onClick={saveAutomation} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conclusão */}
      {showConcluirModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Concluir Solicitação</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solução Aplicada</label>
              <textarea
                value={concluirSolution}
                onChange={(e) => setConcluirSolution(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2 min-h-[100px]"
                placeholder="Descreva a solução..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConcluirModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700">Cancelar</button>
              <button onClick={saveConclusao} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold">Confirmar Conclusão</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reabertura */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Reabrir Solicitação?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ao mover este cartão para fora de &quot;Concluído&quot;, a solução aplicada será apagada e o cartão voltará a ficar pendente. Deseja continuar?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReopenModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700">Cancelar</button>
              <button onClick={confirmReopen} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold">Sim, Reabrir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Task Details (SAC Fields) */}
      {showTaskModal && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 7v10" /><path d="M16 7v10" /><path d="M12 7v10" /></svg>
                </div>
                <div className="flex-1">
                  <input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white"
                    placeholder="Título do cartão"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    na coluna <span className="font-medium text-gray-700 dark:text-gray-300">{COLS.find(c => c.key === selected.col)?.label}</span>
                  </p>
                </div>
                <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Campos SAC */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Venda</label>
                  <input
                    value={taskForm.venda}
                    onChange={e => setTaskForm({ ...taskForm, venda: e.target.value })}
                    disabled={selected.id !== "new"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                  <input
                    value={taskForm.cliente}
                    onChange={e => setTaskForm({ ...taskForm, cliente: e.target.value })}
                    disabled={selected.id !== "new"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendedor</label>
                  <input
                    value={taskForm.vendedor}
                    onChange={e => setTaskForm({ ...taskForm, vendedor: e.target.value })}
                    disabled={selected.id !== "new"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                  <input
                    value={taskForm.tipo}
                    onChange={e => setTaskForm({ ...taskForm, tipo: e.target.value })}
                    disabled={selected.id !== "new"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Reclamado</label>
                  <input
                    value={taskForm.itemReclamado}
                    onChange={e => setTaskForm({ ...taskForm, itemReclamado: e.target.value })}
                    disabled={selected.id !== "new"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição / Reclamação</label>
                <textarea
                  value={taskForm.reclamacao || taskForm.desc}
                  onChange={(e) => setTaskForm({ ...taskForm, reclamacao: e.target.value, desc: e.target.value })}
                  disabled={selected.id !== "new"}
                  className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 min-h-[100px] ${selected.id !== "new" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  placeholder="Detalhes..."
                />
              </div>

              {selected.col === "finalizado" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Solução Aplicada</label>
                  <textarea
                    value={taskForm.solucao}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 px-3 py-2 min-h-[80px] opacity-80 cursor-not-allowed"
                    placeholder="Solução..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo</label>
                  <input
                    type="date"
                    value={taskForm.due}
                    onChange={e => setTaskForm({ ...taskForm, due: e.target.value })}
                    disabled={selected.col === "finalizado"}
                    className={`w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 ${selected.col === "finalizado" ? "bg-gray-200 dark:bg-neutral-800 text-gray-500 cursor-not-allowed" : "bg-transparent"}`}
                  />
                </div>
              </div>

              {/* Imagens */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anexos</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {taskForm.imagens?.map((img, idx) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={idx} src={img} alt="Anexo" className="w-16 h-16 object-cover rounded border" />
                  ))}
                </div>
                <input
                  type="file"
                  multiple
                  disabled={selected.col === "finalizado"}
                  onChange={e => {
                    if (e.target.files) {
                      setTaskForm({ ...taskForm, files: Array.from(e.target.files) });
                    }
                  }}
                  className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${selected.col === "finalizado" ? "bg-gray-200 dark:bg-neutral-800 cursor-not-allowed opacity-60" : ""}`}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-neutral-800 flex justify-between bg-gray-50 dark:bg-neutral-900/50 rounded-b-xl">
              <button onClick={() => {
                if (confirm("Excluir este cartão?")) {
                  deleteTask(selected.col, selected.id);
                  setShowTaskModal(false);
                }
              }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium">Excluir</button>
              <div className="flex gap-2">
                <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                {selected.col !== "finalizado" && selected.id !== "new" && (
                  <button
                    onClick={() => openConcluirModal(selected.col, selected.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none"
                  >
                    Concluir
                  </button>
                )}
                {selected.col !== "finalizado" && (
                  <button onClick={saveTaskModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none">Salvar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
