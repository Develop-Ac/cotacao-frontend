"use client";
import { useEffect, useMemo, useState } from "react";

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
  // campos extras (editáveis no modal do card)
  desc?: string;
  responsavel?: string;
  due?: string; // YYYY-MM-DD
  prioridade?: "baixa" | "media" | "alta";
};

type DragData = { taskId: string; from: ColumnKey };
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

const STORAGE_KEY = "kanban_ac_board_v1";
const AUTOS_KEY = "kanban_automations";
const uid = () =>
  Math.random().toString(36).slice(2, 7) + "-" + Date.now().toString(36);

// --- Componentes ---
function Card({
  task,
  onDelete,
  onOpen,
}: {
  task: Task;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  return (
    <div
      onClick={() => onOpen && onOpen()}
      className="rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-900 hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 cursor-pointer"
      draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        const container = e.currentTarget.closest<HTMLElement>("[data-col]");
        const from = (container?.dataset.col || "") as ColumnKey;
        const payload = { taskId: task.id, from };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-5">{task.title}</h4>
        {onDelete && (
          <button
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              ev.stopPropagation();
              onDelete();
            }}
            className="text-xs text-red-500 hover:text-red-700"
            aria-label="Excluir"
            title="Excluir"
          >
            ✕
          </button>
        )}
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

      {(task.prioridade || task.due) && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {task.prioridade && (
            <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-neutral-700">
              {task.prioridade}
            </span>
          )}
          {task.due && (
            <span className="text-gray-500">
              vence {new Date(task.due).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Column({
  label,
  colKey,
  tasks,
  onDropTask,
  onAddTask,
  onDeleteTask,
  onOpenTask,
}: {
  label: string;
  colKey: ColumnKey;
  tasks: Task[];
  onDropTask: (data: DragData, to: ColumnKey) => void;
  onAddTask: (col: ColumnKey, title: string) => void;
  onDeleteTask: (col: ColumnKey, id: string) => void;
  onOpenTask: (col: ColumnKey, id: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload: DragData | null = null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "taskId" in (parsed as any) &&
        "from" in (parsed as any)
      ) {
        const p = parsed as any;
        payload = { taskId: String(p.taskId), from: p.from as ColumnKey };
      }
    } catch {}
    if (!payload) return;
    onDropTask(payload, colKey);
  }

  return (
    <div
      data-col={colKey}
      onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col gap-3 w-[320px] md:w-[360px] bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-3 min-h-[280px]"
    >
      <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur rounded-xl px-2 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>

      <div className="flex flex-col gap-2 mt-1 max-h-[70vh] overflow-y-auto pr-1">
        {tasks.map((t) => (
          <Card
            key={t.id}
            task={t}
            onDelete={() => onDeleteTask(colKey, t.id)}
            onOpen={() => onOpenTask(colKey, t.id)}
          />
        ))}
      </div>

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
          className="text-sm px-3 py-1 rounded-xl border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [board, setBoard] = useState<BoardState>(() => {
    if (typeof window === "undefined")
      return COLS.reduce((a, c) => ({ ...a, [c.key]: [] }), {} as BoardState);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return COLS.reduce((a, c) => ({ ...a, [c.key]: [] }), {} as BoardState);
  });

  // --- Filtro por Responsável ---
  const [filterResp, setFilterResp] = useState<string>("");

  // Lista única de responsáveis existentes no board (para o select)
  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    Object.values(board).forEach((list) =>
      list.forEach((t) => {
        if (t.responsavel && t.responsavel.trim()) set.add(t.responsavel.trim());
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
  const [selected, setSelected] = useState<{ col: ColumnKey; id: string } | null>(
    null
  );
  const [taskForm, setTaskForm] = useState<{
    title: string;
    desc: string;
    responsavel: string;
    due: string;
    prioridade: "baixa" | "media" | "alta";
  }>({ title: "", desc: "", responsavel: "", due: "", prioridade: "media" });

  // Persistência do board
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }, [board]);

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
  function moveTask(data: DragData, to: ColumnKey) {
    setBoard((prev) => {
      const src = [...prev[data.from]];
      const idx = src.findIndex((t) => t.id === data.taskId);
      if (idx === -1) return prev;
      const [task] = src.splice(idx, 1);
      const dest = [...prev[to]];
      dest.unshift(task);
      return { ...prev, [data.from]: src, [to]: dest };
    });
  }

  // --- Automação robusta: dispara no minuto exato e evita repetição por dia ---
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

    // roda já na montagem (caso a aba abra depois do horário)
    runCheck();

    // alinha para o início do próximo minuto
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
    // carrega dados do card para o form
    setBoard((prev) => {
      const t = prev[col].find((x) => x.id === id);
      setTaskForm({
        title: t?.title || "",
        desc: t?.desc || "",
        responsavel: t?.responsavel || "",
        due: t?.due || "",
        prioridade: (t?.prioridade as any) || "media",
      });
      return prev; // não altera o estado aqui
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

  // Board filtrado por responsável (aplicado na renderização)
  const filteredBoard: BoardState = useMemo(() => {
    if (!filterResp) return board;
    const out = {} as BoardState;
    for (const col of COLS) {
      out[col.key] = board[col.key].filter(
        (t) => (t.responsavel || "").toLowerCase() === filterResp.toLowerCase()
      );
    }
    return out;
  }, [board, filterResp]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Kanban – Fluxo Operacional</h1>
            <p className="text-sm text-gray-500">Automatize e gerencie seu fluxo.</p>
          </div>

          {/* Filtro por Responsável */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Responsável</label>
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

        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {COLS.map((c) => (
              <Column
                key={c.key}
                label={c.label}
                colKey={c.key}
                tasks={filteredBoard[c.key]}
                onDropTask={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onOpenTask={openTaskModal}
              />
            ))}
          </div>
        </div>

        {/* Modal: Nova Automação */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[400px] shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Nova Automação</h2>
              <label className="block text-sm mb-1">Título</label>
              <input
                value={automation.title}
                onChange={(e) => setAutomation({ ...automation, title: e.target.value })}
                className="w-full mb-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />

              <label className="block text-sm mb-1">Horário (HH:MM)</label>
              <input
                type="time"
                value={automation.time}
                onChange={(e) => setAutomation({ ...automation, time: e.target.value })}
                className="w-full mb-3 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              />

              <label className="block text-sm mb-1">Coluna destino</label>
              <select
                value={automation.col}
                onChange={(e) =>
                  setAutomation({ ...automation, col: e.target.value as ColumnKey })
                }
                className="w-full mb-4 rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              >
                {COLS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
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
                      setTaskForm({ ...taskForm, responsavel: e.target.value })
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
                        prioridade: e.target.value as "baixa" | "media" | "alta",
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
      </div>
    </div>
  );
}
