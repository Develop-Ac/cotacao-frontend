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


// --- Types ---
type ColumnKey =
  | "cadastro_produto"
  | "criacao_pedido"
  | "conferencia_pedido"
  | "digitacao_pedido"
  | "acompanhamento_pedido"
  | "conciliacao_pedido"
  | "recebimento"
  | "checkin"
  | "codificacao"
  | "impressao_mapa"
  | "arquivo";

type Task = {
  id: string;
  title: string;
  createdAt: number;
  desc?: string;
  responsavel?: string;
  due?: string; // YYYY-MM-DD
  prioridade?: "baixa" | "media" | "alta";
};

type BoardState = Record<ColumnKey, Task[]>;

const COLS: { key: ColumnKey; label: string }[] = [
  { key: "cadastro_produto", label: "Cadastro produto" },
  { key: "criacao_pedido", label: "Criação pedido" },
  { key: "conferencia_pedido", label: "Conferência pedido" },
  { key: "digitacao_pedido", label: "Digitação pedido" },
  { key: "acompanhamento_pedido", label: "Acompanhamento pedido" },
  { key: "conciliacao_pedido", label: "Conciliação pedido" },
  { key: "recebimento", label: "Recebimento" },
  { key: "checkin", label: "Check-in" },
  { key: "codificacao", label: "Codificação" },
  { key: "impressao_mapa", label: "Impressão mapa" },
  { key: "arquivo", label: "Arquivo" },
];

const AUTOS_KEY = "kanban_automations";
const uid = () =>
  Math.random().toString(36).slice(2, 7) + "-" + Date.now().toString(36);

// --- Componentes ---
function Card({
  task,
  onDelete,
  onOpen,
  isDragging = false,
}: {
  task: Task;
  onDelete?: () => void;
  onOpen?: () => void;
  isDragging?: boolean;
}) {
  // classes de cor por prioridade
  let priorityClasses = "";
  switch (task.prioridade) {
    case "alta":
      priorityClasses = "bg-red-100 text-red-700 border-red-200";
      break;
    case "media":
      priorityClasses = "bg-amber-100 text-amber-700 border-amber-200";
      break;
    case "baixa":
      priorityClasses = "bg-emerald-100 text-emerald-700 border-emerald-200";
      break;
    default:
      priorityClasses = "bg-gray-100 text-gray-600 border-gray-200";
  }
  const dueDate = task.due ? new Date(task.due) : null;
  const isOverdue = dueDate ? dueDate < new Date() : false;

  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      onClick={() => onOpen && onOpen()}
      data-kanban-card="true"
      className={`rounded-lg border border-gray-200 dark:border-neutral-700 p-3 
                  bg-white dark:bg-neutral-800 
                  transition-all duration-150 ease-out cursor-pointer group
                  ${isDragging
          ? "shadow-xl ring-2 ring-blue-500 rotate-2 z-50"
          : "shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {task.prioridade && (
            <span
              className={`priority-badge inline-flex items-center px-2 py-0.5 
                          text-[10px] font-semibold rounded border uppercase ${priorityClasses}`}
            >
              {task.prioridade}
            </span>
          )}
          <h4 className="text-sm font-medium leading-5 text-gray-900 dark:text-gray-100 line-clamp-3">
            {task.title}
          </h4>
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
              Prazo: {dueDate.toLocaleDateString("pt-BR").slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {task.responsavel && (
          <div
            className="flex items-center"
            title={`Responsável: ${task.responsavel}`}
          >
            <div className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 px-2 py-1 min-h-[28px] min-w-[28px] whitespace-nowrap">
              {task.responsavel}
            </div>
          </div>
        )}
      </div>
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
  disableDrag,
}: {
  label: string;
  colKey: ColumnKey;
  tasks: Task[];
  onAddTask: (col: ColumnKey, title: string) => void;
  onDeleteTask: (col: ColumnKey, id: string) => void;
  onOpenTask: (col: ColumnKey, id: string) => void;
  disableDrag: boolean;
}) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div
      data-col={colKey}
      className="flex flex-col w-[280px] shrink-0 max-h-full rounded-xl bg-[#F2F3F5] dark:bg-neutral-900/50 border border-gray-200/60 dark:border-neutral-800"
      style={{ backgroundColor: "#F2F3F5" }} // garante cor fixa no tema claro
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
                const draggableId = `${colKey}-${t.id}-${index}`;
                return (
                  <Draggable
                    key={draggableId}
                    draggableId={draggableId}
                    index={index}
                    isDragDisabled={disableDrag}
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
                          isDragging={dragSnapshot.isDragging}
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

      <div className="p-2 shrink-0">
        {isAdding ? (
          <div className="p-2 bg-white dark:bg-neutral-800 rounded-lg border border-blue-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (value.trim()) {
                    onAddTask(colKey, value);
                    setValue("");
                  }
                }
                if (e.key === "Escape") {
                  setIsAdding(false);
                }
              }}
              placeholder="Insira um título para este cartão..."
              className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 resize-none placeholder:text-gray-400"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  if (value.trim()) {
                    onAddTask(colKey, value);
                    setValue("");
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Adicionar Cartão
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="keep-color kanban-btn flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left"
          >
            <span className="text-lg leading-none">+</span> Adicionar um cartão
          </button>
        )}
      </div>
    </div>
  );
}

// --- Hook Customizado para Drag-to-Scroll (versão nativa) ---
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
      if (e.button !== 0) return; // só botão esquerdo

      const target = e.target as HTMLElement | null;
      if (shouldIgnoreTarget(target)) return;

      isDown = true;
      startX = e.clientX;
      scrollLeft = slider.scrollLeft;

      slider.style.cursor = "grabbing";
      slider.style.userSelect = "none";

      // debug opcional
      // console.log("DOWN: scrollLeft=", scrollLeft, "scrollWidth=", slider.scrollWidth, "clientWidth=", slider.clientWidth);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      if (!slider) return;

      e.preventDefault();

      const x = e.clientX;
      const walk = x - startX; // positivo = arrasta pra direita, scroll pra esquerda
      slider.scrollLeft = scrollLeft - walk;

      // debug opcional
      // console.log("MOVE: scrollLeft=", slider.scrollLeft);
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      if (!slider) return;

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
  const KANBAN_URL = `${serviceUrl("compras")}/compras/kanban`;
  const [board, setBoard] = useState<BoardState>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: [] }), {} as BoardState)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // refs para drag-to-scroll
  const boardRef = useRef<HTMLDivElement | null>(null);
  useDraggableScroll(boardRef);



  // Carrega o board via GET ao montar
  useEffect(() => {
    async function fetchBoard() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(KANBAN_URL);
        if (!res.ok) throw new Error("Erro ao buscar kanban");
        const data = await res.json();
        setBoard(data);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchBoard();
  }, [KANBAN_URL]);

  // --- Filtro por Responsável ---
  const [filterResp, setFilterResp] = useState<string>("");

  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    Object.values(board).forEach((list) =>
      list.forEach((t) => {
        if (t.responsavel && t.responsavel.trim())
          set.add(t.responsavel.trim());
      })
    );
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );
  }, [board]);

  // Modal de automação
  const [showModal, setShowModal] = useState(false);
  const [automation, setAutomation] = useState({
    col: COLS[0].key,
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
    responsavel: string;
    due: string;
    prioridade: "baixa" | "media" | "alta";
  }>({ title: "", desc: "", responsavel: "", due: "", prioridade: "media" });

  // Persistência do board via PUT
  useEffect(() => {
    if (loading) return;
    async function putBoard() {
      try {
        await fetch(KANBAN_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(board),
        });
      } catch {
        // silencia erro de persistência
      }
    }
    putBoard();
  }, [board, loading, KANBAN_URL]);

  function addTask(col: ColumnKey, title: string) {
    setBoard((prev) => ({
      ...prev,
      [col]: [{ id: uid(), title, createdAt: Date.now() }, ...prev[col]],
    }));
  }

  function deleteTask(col: ColumnKey, id: string) {
    setBoard((prev) => ({
      ...prev,
      [col]: prev[col].filter((t) => t.id !== id),
    }));
  }

  // --- Drag & Drop estilo Trello ---
  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    const from = source.droppableId as ColumnKey;
    const to = destination.droppableId as ColumnKey;
    const fromIndex = source.index;
    const toIndex = destination.index;

    if (from === to && fromIndex === toIndex) return;

    if (filterResp) return;

    setBoard((prev) => {
      const newBoard: BoardState = { ...prev };

      const sourceList = Array.from(newBoard[from]);
      const [moved] = sourceList.splice(fromIndex, 1);
      if (!moved) return prev;

      if (from === to) {
        sourceList.splice(toIndex, 0, moved);
        newBoard[from] = sourceList;
      } else {
        const destList = newBoard[to].filter((t) => t.id !== moved.id);
        destList.splice(toIndex, 0, moved);
        newBoard[from] = sourceList;
        newBoard[to] = destList;
      }

      return newBoard;
    });
  }

  // --- Automação robusta ---
  useEffect(() => {
    type Automation = {
      id: string;
      title: string;
      time: string; // HH:MM
      col: ColumnKey;
      lastRunDate?: string; // YYYY-MM-DD
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
          setBoard((prev) => ({
            ...prev,
            [a.col]: [
              {
                id: uid(),
                title: a.title + " (auto)",
                createdAt: Date.now(),
              },
              ...prev[a.col],
            ],
          }));
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
  }, []);

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
    autos.push({ id: uid(), title, time: t, col: automation.col });
    localStorage.setItem(AUTOS_KEY, JSON.stringify(autos));
    setShowModal(false);
  }

  // --- Modal do Card ---
  function openTaskModal(col: ColumnKey, id: string) {
    setSelected({ col, id });
    setBoard((prev) => {
      const t = prev[col].find((x) => x.id === id);
      setTaskForm({
        title: t?.title || "",
        desc: t?.desc || "",
        responsavel: t?.responsavel || "",
        due: t?.due || "",
        prioridade: (t?.prioridade as any) || "media",
      });
      return prev;
    });
    setShowTaskModal(true);
  }

  function saveTaskModal() {
    if (!selected) return;
    setBoard((prev) => {
      const list = prev[selected.col].map((t) =>
        t.id === selected.id ? { ...t, ...taskForm } : t
      );
      return { ...prev, [selected.col]: list };
    });
    setShowTaskModal(false);
  }

  function deleteSelectedTask() {
    if (!selected) return;
    const confirmed = window.confirm("Deseja realmente excluir este card?");
    if (!confirmed) return;
    setBoard((prev) => ({
      ...prev,
      [selected.col]: prev[selected.col].filter((t) => t.id !== selected.id),
    }));
    setShowTaskModal(false);
  }

  // Board filtrado por responsável (apenas visual)
  const filteredBoard: BoardState = useMemo(() => {
    if (!filterResp) return board;
    const out = {} as BoardState;
    for (const col of COLS) {
      out[col.key] = board[col.key].filter(
        (t) =>
          (t.responsavel || "").toLowerCase() === filterResp.toLowerCase()
      );
    }
    return out;
  }, [board, filterResp]);

  // Card/coluna selecionados para o modal (Trello-like)
  const selectedTask =
    selected
      ? board[selected.col].find((t) => t.id === selected.id) || null
      : null;
  const selectedColLabel =
    selected ? COLS.find((c) => c.key === selected.col)?.label || "" : "";

  const prioridadeLabel =
    taskForm.prioridade === "alta"
      ? "Alta"
      : taskForm.prioridade === "media"
        ? "Média"
        : "Baixa";

  if (!isMounted) return null;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: "#407595" }}
    >
      {/* Header Toolbar DENTRO do container principal da intranet */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-gray-200 dark:border-neutral-800 shrink-0 z-10">
        {/* Título */}
        <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white mr-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7v10" />
              <path d="M16 7v10" />
              <path d="M12 7v10" />
            </svg>
          </span>
          <span>Fluxo Operacional</span>
        </h1>

        {/* Separador */}
        <div className="h-6 w-px bg-gray-300 dark:bg-neutral-700"></div>

        {/* Filtro de responsáveis */}
        <select
          value={filterResp}
          onChange={(e) => setFilterResp(e.target.value)}
          className="text-sm rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {filterResp && (
          <button
            onClick={() => setFilterResp("")}
            className="text-xs px-2 py-1.5 rounded text-red-600 hover:bg-red-50 font-medium"
          >
            Limpar
          </button>
        )}

        {/* Botão de automação */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm transition-colors"
        >
          Automação
        </button>
      </div>

      {/* Board Area: só aqui tem overflow-x */}
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
                disableDrag={!!filterResp}
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

      {/* Modal: Detalhes/Edição do Card (estilo Trello) */}
      {
        showTaskModal && selected && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
              {/* Cabeçalho com “ícone”, título grande e coluna */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-neutral-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M8 7v10" />
                      <path d="M16 7v10" />
                      <path d="M12 7v10" />
                    </svg>
                  </div>

                  <div className="flex-1">
                    <input
                      value={taskForm.title}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, title: e.target.value })
                      }
                      className="w-full bg-transparent border-none text-lg md:text-xl font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-0"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Em <span className="font-medium">{selectedColLabel}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {taskForm.prioridade && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase
                        ${taskForm.prioridade === "alta"
                            ? "bg-red-100 text-red-700 border-red-300"
                            : taskForm.prioridade === "media"
                              ? "bg-amber-100 text-amber-700 border-amber-300"
                              : "bg-emerald-100 text-emerald-700 border-emerald-300"
                          }`}
                      >
                        Prioridade: {prioridadeLabel}
                      </span>
                    )}
                    <button
                      onClick={() => setShowTaskModal(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors text-lg leading-none"
                      aria-label="Fechar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Corpo do modal: 2 colunas (conteúdo + lateral) */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
                  {/* Coluna principal */}
                  <div className="space-y-6">
                    {/* Descrição */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          Descrição
                        </span>
                      </div>
                      <textarea
                        value={taskForm.desc}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, desc: e.target.value })
                        }
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        placeholder="Adicione uma descrição detalhada para este card..."
                      />
                    </div>

                    {/* Responsável + Prazo */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">
                          Detalhes
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="block text-[11px] font-medium text-gray-500 uppercase">
                            Responsável
                          </span>
                          <input
                            value={taskForm.responsavel}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                responsavel: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Nome do responsável"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="block text-[11px] font-medium text-gray-500 uppercase">
                            Prazo
                          </span>
                          <input
                            type="date"
                            value={taskForm.due}
                            onChange={(e) =>
                              setTaskForm({ ...taskForm, due: e.target.value })
                            }
                            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna lateral (Ações + Info) */}
                  <div className="space-y-4">
                    {/* Ações */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-gray-200 dark:border-neutral-800 rounded-lg p-3 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Ações
                      </p>
                      <button
                        onClick={deleteSelectedTask}
                        className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors text-left"
                      >
                        Excluir card
                      </button>

                      <div className="space-y-1">
                        <span className="block text-[11px] font-medium text-gray-500 uppercase">
                          Prioridade
                        </span>
                        <select
                          value={taskForm.prioridade}
                          onChange={(e) =>
                            setTaskForm((prev) => ({
                              ...prev,
                              prioridade: e.target
                                .value as "baixa" | "media" | "alta",
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                    </div>

                    {/* Informações do card */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-gray-200 dark:border-neutral-800 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        Informações
                      </p>
                      {selectedTask && (
                        <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                          <li>
                            <span className="font-semibold">Criado em: </span>
                            {new Date(
                              selectedTask.createdAt
                            ).toLocaleDateString("pt-BR")}
                          </li>
                          <li>
                            <span className="font-semibold">Lista: </span>
                            {selectedColLabel}
                          </li>
                          {taskForm.due && (
                            <li>
                              <span className="font-semibold">Prazo: </span>
                              {new Date(taskForm.due).toLocaleDateString(
                                "pt-BR"
                              )}
                            </li>
                          )}
                          <li>
                            <span className="font-semibold">Prioridade: </span>
                            {prioridadeLabel}
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rodapé com ações principais */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3 bg-gray-50 dark:bg-neutral-900/50 rounded-b-xl">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveTaskModal}
                  className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all transform active:scale-95"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Automação */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-xl w-full max-w-md shadow-2xl">
              <div className="p-6 border-b border-gray-100 dark:border-neutral-800">
                <h2 className="text-lg font-bold">Criar Automação</h2>
                <p className="text-sm text-gray-500">
                  Crie cards automaticamente em horários específicos.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Título do card
                  </label>
                  <input
                    value={automation.title}
                    onChange={(e) =>
                      setAutomation({ ...automation, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Verificar estoque"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Horário (HH:MM)
                  </label>
                  <input
                    value={automation.time}
                    onChange={(e) =>
                      setAutomation({ ...automation, time: e.target.value })
                    }
                    placeholder="08:30"
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Coluna de destino
                  </label>
                  <select
                    value={automation.col}
                    onChange={(e) =>
                      setAutomation({
                        ...automation,
                        col: e.target.value as ColumnKey,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {COLS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3 bg-gray-50 dark:bg-neutral-900/50 rounded-b-xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAutomation}
                  className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                >
                  Salvar Automação
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
