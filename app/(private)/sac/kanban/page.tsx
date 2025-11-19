
"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";

// --- Types ---
// ...existing code...

type Task = {
  id: string;
  title: string;
  createdAt: number;
  // campos extras (editáveis no modal do card)
  desc?: string;
  responsavel?: string;
  due?: string; // YYYY-MM-DD
  prioridade?: "baixa" | "media" | "alta";
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
};

type DragData = { taskId: string; from: ColumnKey };
type BoardState = Record<ColumnKey, Task[]>;

type ColumnKey = "aguardando_atendimento" | "em_analise" | "finalizado";

const COLS: { key: ColumnKey; label: string }[] = [
  { key: "aguardando_atendimento", label: "Aguardando atendimento" },
  { key: "em_analise", label: "Em análise" },
  { key: "finalizado", label: "Finalizado" },
];

const STORAGE_KEY = "kanban_ac_board_v1";
const AUTOS_KEY = "kanban_automations";
const uid = () =>
  Math.random().toString(36).slice(2, 7) + "-" + Date.now().toString(36);

// --- Componentes ---
interface CardProps {
  task: Task;
  onDelete?: () => void;
  onOpen?: () => void;
  colKey: ColumnKey;
  userSetor: string;
}
function Card({ task, onDelete, onOpen, colKey, userSetor }: CardProps) {
  // Permissão de edição
  const canEdit =
    (userSetor === "Atacado" || userSetor === "Varejo")
      ? colKey === "aguardando_atendimento"
      : true;
  return (
    <div
      onClick={() => canEdit && onOpen && onOpen()}
      className={`rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-700 p-3 dark:bg-neutral-900 hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 ${canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
      draggable={canEdit}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        if (!canEdit) {
          e.preventDefault();
          return;
        }
        const container = e.currentTarget.closest<HTMLElement>("[data-col]");
        const from = (container?.dataset.col || "") as ColumnKey;
        const payload = { taskId: task.id, from };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-5">{task.title}</h4>
        {onDelete && canEdit && (
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

interface ColumnProps {
  label: string;
  colKey: ColumnKey;
  tasks: Task[];
  board: BoardState;
  onDropTask: (data: DragData, to: ColumnKey) => void;
  onAddTask: (col: ColumnKey, title: string) => void;
  onDeleteTask: (col: ColumnKey, id: string) => void;
  onOpenTask: (col: ColumnKey, id: string) => void;
  userSetor: string;
}
function Column({ label, colKey, tasks = [], onDropTask, onAddTask, onDeleteTask, onOpenTask, board, userSetor }: ColumnProps) {
  const [value, setValue] = useState("");
  const canCreate = (userSetor === "Atacado" || userSetor === "Varejo") ? colKey === "aguardando_atendimento" : true;

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
    const canMove = (userSetor === "Atacado" || userSetor === "Varejo") ? colKey === "aguardando_atendimento" : true;
    if (!payload || !canMove) return;
    onDropTask(payload, colKey);
  }

  return (
    <div
      data-col={colKey}
      onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col gap-3 w-[320px] md:w-[360px] dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-3 min-h-[280px]"
    >
      <div className="sticky top-0 dark:bg-neutral-950/80 backdrop-blur rounded-xl px-2 py-2 flex items-center justify-between">
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
            colKey={colKey}
            userSetor={userSetor}
          />
        ))}
      </div>
      {/* Define canCreate for this scope */}
      {(() => {
        const canCreate = true; // or set your logic here
        return (
          <div className="flex mt-2 gap-1">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Novo card..."
              className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
              disabled={!canCreate}
            />
            <button
              onClick={() => {
                let title = value.trim();
                if (!title) {
                  // Busca o maior número global entre todas as colunas
                  const prefix = "garantia #";
                  const allTasks = Object.values(board).flat() as Task[];
                  const nums = allTasks
                    .map((t: Task) => t.title)
                    .filter(t => t.startsWith(prefix))
                    .map(t => {
                      const m = t.match(/garantia #(\d{3})/);
                      return m ? parseInt(m[1], 10) : null;
                    })
                    .filter(n => n !== null);
                  const nextNum = nums.length ? Math.max(...nums as number[]) + 1 : 0;
                  title = `${prefix}${nextNum.toString().padStart(3, "0")}`;
                }
                if (canCreate) {
                  onAddTask(colKey, title);
                  setValue("");
                }
              }}
              className="text-sm px-3 py-1 rounded-xl border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
              disabled={!canCreate}
            >
              +
            </button>
          </div>
        );
      })()}
    </div>
  );
}
// ...existing code...
        // (Remove this duplicated block entirely, as the input and button logic already exists inside the Column component)

export default function Page() {
  // Pega setor do usuário do localStorage
  let userSetor = "";
  if (typeof window !== "undefined") {
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      userSetor = userData.setor || "";
    } catch {}
  }
  const [board, setBoard] = useState<BoardState>({
    aguardando_atendimento: [],
    em_analise: [],
    finalizado: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Carrega o board via GET ao montar
  useEffect(() => {
    async function fetchBoard() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://sac-service.acacessorios.local/kanban");
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
  }>({
    data: "",
    venda: "",
    cliente: "",
    itemReclamado: "",
    reclamacao: "",
    solucao: "",
    dataSolucao: "",
    custo: "",
    dptoResponsavel: "",
    tipo: "",
    vendedor: ""
  });

  // Persistência do board via PUT
  useEffect(() => {
    if (loading) return; // não envia enquanto carrega
    async function putBoard() {
      try {
        await fetch("http://sac-service.acacessorios.local/kanban", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(board),
        });
      } catch {}
    }
    putBoard();
  }, [board]);

  function addTask(col: ColumnKey, title: string) {
    setBoard((prev) => ({
      ...prev,
      [col]: [{ id: uid(), title, createdAt: Date.now() }, ...(prev[col] ?? [])],
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
      const src = [...(prev[data.from] ?? [])];
      const idx = src.findIndex((t) => t.id === data.taskId);
      if (idx === -1) return prev;
      const [task] = src.splice(idx, 1);
      const dest = [...(prev[to] ?? [])];
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
        data: t?.data || "",
        venda: t?.venda || "",
        cliente: t?.cliente || "",
        itemReclamado: t?.itemReclamado || "",
        reclamacao: t?.reclamacao || "",
        solucao: t?.solucao || "",
        dataSolucao: t?.dataSolucao || "",
        custo: t?.custo || "",
        dptoResponsavel: t?.dptoResponsavel || "",
        tipo: t?.tipo || "",
        vendedor: t?.vendedor || ""
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

  // --- Scroll horizontal por arraste ---
  const boardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  // handlers para mouse/touch
  function handleBoardMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = boardRef.current?.scrollLeft || 0;
    document.body.style.cursor = "grabbing";
  }
  function handleBoardMouseMove(e: MouseEvent) {
    if (!isDragging.current) return;
    if (!boardRef.current) return;
    const dx = e.clientX - dragStartX.current;
    boardRef.current.scrollLeft = scrollStartX.current - dx;
  }
  function handleBoardMouseUp() {
    isDragging.current = false;
    document.body.style.cursor = "";
  }
  useEffect(() => {
    const move = (e: MouseEvent) => handleBoardMouseMove(e);
    const up = () => handleBoardMouseUp();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-[1400px] px-6 py-8">
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

        <div
          className="overflow-x-auto cursor-grab"
          ref={boardRef}
          onMouseDown={handleBoardMouseDown}
        >
          <div className="flex gap-4 min-w-max pb-2">
            {COLS.map((c) => (
              <Column
                key={c.key}
                label={c.label}
                colKey={c.key}
                tasks={filteredBoard[c.key]}
                board={board}
                onDropTask={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onOpenTask={openTaskModal}
                userSetor={userSetor}
              />
            ))}

        {/* Modal: Detalhes/Edição do Card */}
        {showTaskModal && selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-[520px] shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Detalhes do Card</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">DATA</label>
                  <input type="date" value={taskForm.data} onChange={e => setTaskForm({ ...taskForm, data: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">VENDA</label>
                  <input value={taskForm.venda} onChange={e => setTaskForm({ ...taskForm, venda: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">CLIENTE</label>
                  <input value={taskForm.cliente} onChange={e => setTaskForm({ ...taskForm, cliente: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">ITEM RECLAMADO</label>
                  <input value={taskForm.itemReclamado} onChange={e => setTaskForm({ ...taskForm, itemReclamado: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-1">RECLAMAÇÃO</label>
                  <textarea value={taskForm.reclamacao} onChange={e => setTaskForm({ ...taskForm, reclamacao: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm mb-1">SOLUÇÃO</label>
                  <textarea value={taskForm.solucao} onChange={e => setTaskForm({ ...taskForm, solucao: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">DATA SOLUÇÃO</label>
                  <input type="date" value={taskForm.dataSolucao} onChange={e => setTaskForm({ ...taskForm, dataSolucao: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">CUSTO</label>
                  <input value={taskForm.custo} onChange={e => setTaskForm({ ...taskForm, custo: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">DPTO RESPONSAVEL</label>
                  <input value={taskForm.dptoResponsavel} onChange={e => setTaskForm({ ...taskForm, dptoResponsavel: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">TIPO</label>
                  <input value={taskForm.tipo} onChange={e => setTaskForm({ ...taskForm, tipo: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm mb-1">VENDEDOR</label>
                  <input value={taskForm.vendedor} onChange={e => setTaskForm({ ...taskForm, vendedor: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-transparent px-3 py-2" />
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
    </div>
    </div>
  );
}
