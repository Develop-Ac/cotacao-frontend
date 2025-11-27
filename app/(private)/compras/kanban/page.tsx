"use client";
import React, { useEffect, useMemo, useState } from "react";
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

  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      onClick={() => onOpen && onOpen()}
      data-kanban-card="true"
      className={`rounded-2xl border border-gray-200 dark:border-neutral-700 p-3 
                  bg-white dark:bg-neutral-900 
                  transition-all duration-150 ease-out cursor-pointer
                  ${
                    isDragging
                      ? "shadow-lg ring-2 ring-blue-400/70 scale-[0.98] z-50"
                      : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-5 text-gray-900 dark:text-gray-50">
          {task.title}
        </h4>

        <div className="flex items-center gap-1">
          {task.prioridade && (
            <span
              className={`keep-color inline-flex items-center px-2 py-0.5 
                          text-[10px] font-semibold rounded-full border uppercase ${priorityClasses}`}
            >
              {task.prioridade}
            </span>
          )}

          {onDelete && (
            <button
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.stopPropagation();
                onDelete();
              }}
              className="keep-color inline-flex items-center justify-center
                         w-6 h-6 rounded-md border border-red-200
                         bg-red-50 text-[10px] font-bold text-red-600
                         hover:bg-red-100 hover:border-red-300"
              aria-label="Excluir"
              title="Excluir"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 text-[11px] text-gray-400">
        {new Date(task.createdAt).toLocaleString("pt-BR")}
      </div>

      {task.responsavel && (
        <div className="mt-2 text-[11px] text-gray-700 dark:text-gray-200 flex items-center gap-1">
          <span>👤</span>
          <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-neutral-700">
            {task.responsavel}
          </span>
        </div>
      )}

      {task.due && (
        <div className="mt-2 text-[11px] text-gray-500">
          vence {new Date(task.due).toLocaleDateString("pt-BR")}
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

  return (
    <div
      data-col={colKey}
      className={`
        flex flex-col gap-3 w-[320px] md:w-[360px] rounded-2xl shadow-md p-3
        border border-gray-100 dark:border-neutral-800
        bg-gray-100 dark:bg-neutral-900
        h-full
      `}
    >
      <div className="sticky top-0 bg-gray-100 dark:bg-neutral-900/80 backdrop-blur rounded-xl px-2 py-2 flex items-center justify-between z-10">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-gray-500">{tasks.length}</span>
      </div>

      <Droppable droppableId={colKey} isDropDisabled={disableDrag}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex flex-col gap-2 mt-1 flex-1 min-h-0 overflow-y-auto pr-1 rounded-xl transition-all duration-150
              bg-gray-100 dark:bg-neutral-900
              ${snapshot.isDraggingOver ? "ring-2 ring-blue-400/60" : ""}
            `}
          >
            {tasks.map((t, index) => {
              const uniqueKey = `${colKey}-${t.id}`;

              return (
                <Draggable
                  key={uniqueKey}
                  draggableId={uniqueKey}
                  index={index}
                  isDragDisabled={disableDrag}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className="keep-color bg-transparent"
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
        )}
      </Droppable>

      <div className="flex mt-2 gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Novo card..."
          className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAddTask(colKey, value);
            setValue("");
          }}
          className="text-sm px-3 py-1 rounded-xl border border-gray-300 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-800 keep-color"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const KANBAN_URL = `${serviceUrl("compras")}/compras/kanban`;
  const [board, setBoard] = useState<BoardState>(
    COLS.reduce((a, c) => ({ ...a, [c.key]: [] }), {} as BoardState)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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
  }, []);

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
      } catch {}
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

    // se estiver filtrado, não vamos mexer (drag já está desabilitado visualmente)
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
    if (!/^\d{2}:\d{2}$/.test(t)) {
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

  return (
    <div className="h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6 h-full flex flex-col overflow-hidden">
        {/* Header fixo do kanban dentro da página */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Kanban – Fluxo Operacional</h1>
            <p className="text-sm text-gray-500">
              Automatize e gerencie seu fluxo.
            </p>
          </div>

          {/* Filtro por Responsável */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">
              Responsável
            </label>
            <select
              value={filterResp}
              onChange={(e) => setFilterResp(e.target.value)}
              className="text-sm rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2"
              title="Filtrar por responsável"
            >
              <option value="">Todos</option>
              {responsaveis.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {filterResp && (
              <button
                onClick={() => setFilterResp("")}
                className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
                title="Limpar filtro"
              >
                Limpar
              </button>
            )}

            <button
              onClick={() => setShowModal(true)}
              className="ml-3 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              + Criar Automação
            </button>
          </div>
        </div>

        {/* Área do board ocupa o restante da tela, sem rolagem geral */}
        <div className="flex-1 min-h-0 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950/60 overflow-hidden">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="h-full overflow-x-auto">
              <div className="flex gap-4 min-w-max h-full pb-4 px-3">
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
            </div>
          </DragDropContext>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500 shrink-0">Erro: {error}</p>
        )}
      </div>

      {/* Modal: Detalhes/Edição do Card */}
      {showTaskModal && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[520px] shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Detalhes do Card</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm mb-1">Título</label>
                <input
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm mb-1">Descrição</label>
                <textarea
                  value={taskForm.desc}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, desc: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Responsável</label>
                <input
                  value={taskForm.responsavel}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      responsavel: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Prazo</label>
                <input
                  type="date"
                  value={taskForm.due}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, due: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm mb-1">Prioridade</label>
                <select
                  value={taskForm.prioridade}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      prioridade: e.target
                        .value as "baixa" | "media" | "alta",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveTaskModal}
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Automação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[420px] shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Criar Automação</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Título do card</label>
                <input
                  value={automation.title}
                  onChange={(e) =>
                    setAutomation({ ...automation, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Horário (HH:MM)</label>
                <input
                  value={automation.time}
                  onChange={(e) =>
                    setAutomation({ ...automation, time: e.target.value })
                  }
                  placeholder="08:30"
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Coluna</label>
                <select
                  value={automation.col}
                  onChange={(e) =>
                    setAutomation({
                      ...automation,
                      col: e.target.value as ColumnKey,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
                >
                  {COLS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                onClick={saveAutomation}
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
