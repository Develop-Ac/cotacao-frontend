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
};

type BoardState = Record<ColumnKey, Task[]>;

// --- Helpers ---
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

const emptyBoard = (): BoardState =>
  COLS.reduce((acc, c) => ({ ...acc, [c.key]: [] }), {} as BoardState);

const uid = () =>
  Math.random().toString(36).slice(2, 7) + "-" + Date.now().toString(36);

const STORAGE_KEY = "kanban_ac_board_v1";

// --- Drag & Drop shape ---
type DragData = {
  taskId: string;
  from: ColumnKey;
};

// --- Chip for column labels ---
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700">
      {children}
    </span>
  );
}

// --- Task Card ---
function Card({ task, onDelete }: { task: Task; onDelete?: () => void }) {
  return (
    <div
      className="group rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-900 hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 ease-out hover:-translate-y-0.5"
      draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        const container = e.currentTarget.closest<HTMLElement>("[data-col]");
        const from = (container?.dataset.col || "") as ColumnKey;
        const payload: DragData = { taskId: task.id, from };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
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
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
            title="Excluir"
          >
            excluir
          </button>
        )}
      </div>
      <div className="mt-2 text-[11px] text-gray-500">
        {new Date(task.createdAt).toLocaleString("pt-BR")}
      </div>
    </div>
  );
}

// --- Column ---
function Column({
  label,
  colKey,
  tasks,
  onDropTask,
  onAddTask,
  onDeleteTask,
}: {
  label: string;
  colKey: ColumnKey;
  tasks: Task[];
  onDropTask: (data: DragData, to: ColumnKey, index?: number) => void;
  onAddTask: (col: ColumnKey, title: string) => void;
  onDeleteTask: (col: ColumnKey, id: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload: DragData | null = null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null && "taskId" in (parsed as any) && "from" in (parsed as any)) {
        payload = parsed as DragData;
      }
    } catch {}
    if (!payload) return;
    onDropTask(payload, colKey);
  }

  return (
    <div
      data-col={colKey}
      onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={handleDrop}
      className="flex flex-col gap-3 w-[320px] md:w-[360px] 2xl:w-[380px] bg-white dark:bg-neutral-950 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm p-3 min-h-[280px]"
    >
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur rounded-xl px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <Pill>{tasks.length} itens</Pill>
        </div>
        <button
          className="text-xs px-2 py-1 rounded-lg border border-gray-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800"
          onClick={() => {
            const title = value.trim();
            if (!title) return;
            onAddTask(colKey, title);
            setValue("");
          }}
          title="Adicionar card"
        >
          + adicionar
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Novo card..."
          className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/40"
        />
      </div>

      <div className="flex flex-col gap-2 mt-1 max-h-[70vh] overflow-y-auto pr-1">
        
          {tasks.map((t) => (
            <Card key={t.id} task={t} onDelete={() => onDeleteTask(colKey, t.id)} />
          ))}
        
      </div>

      {tasks.length === 0 && (
        <div className="text-xs text-gray-400 italic mt-2 select-none">Arraste itens aqui…</div>
      )}
    </div>
  );
}

export default function Page() {
  const [board, setBoard] = useState<BoardState>(() => {
    if (typeof window === "undefined") return emptyBoard();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as BoardState;
    } catch {}
    return emptyBoard();
  });

  const [filter, setFilter] = useState("");

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {}
  }, [board]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return board;
    const clone: BoardState = emptyBoard();
    (Object.keys(board) as ColumnKey[]).forEach((k) => {
      clone[k] = board[k].filter((t) => t.title.toLowerCase().includes(f));
    });
    return clone;
  }, [board, filter]);

  function addTask(col: ColumnKey, title: string) {
    setBoard((prev) => ({
      ...prev,
      [col]: [{ id: uid(), title, createdAt: Date.now() }, ...prev[col]],
    }));
  }

  function deleteTask(col: ColumnKey, id: string) {
    setBoard((prev) => ({ ...prev, [col]: prev[col].filter((t) => t.id !== id) }));
  }

  function moveTask(data: DragData, to: ColumnKey) {
    setBoard((prev) => {
      if (!prev[data.from]) return prev;
      const source = [...prev[data.from]];
      const idx = source.findIndex((t) => t.id === data.taskId);
      if (idx === -1) return prev;
      const [task] = source.splice(idx, 1);
      const target = [...prev[to]];
      target.unshift(task);
      return { ...prev, [data.from]: source, [to]: target } as BoardState;
    });
  }

  function resetBoard() {
    if (confirm("Limpar todo o board?")) setBoard(emptyBoard());
  }

  // Quick seeds
  function seedDemo() {
    const demo: BoardState = emptyBoard();
    demo.cadastro_produto = [
      { id: uid(), title: "Criar produto ABC-123", createdAt: Date.now() - 400000 },
    ];
    demo.criacao_pedido = [
      { id: uid(), title: "Pedido 789 – João", createdAt: Date.now() - 350000 },
    ];
    demo.conferencia_pedido = [
      { id: uid(), title: "Conferir NF 5561", createdAt: Date.now() - 300000 },
    ];
    demo.digitacao_pedido = [
      { id: uid(), title: "Digitar pedido 1020", createdAt: Date.now() - 250000 },
    ];
    demo.acompanhamento_pedido = [
      { id: uid(), title: "Acompanhar entrega 334", createdAt: Date.now() - 200000 },
    ];
    demo.conciliacao_pedido = [
      { id: uid(), title: "Conciliar pedido 1020", createdAt: Date.now() - 150000 },
    ];
    demo.recebimento = [
      { id: uid(), title: "Receber carga 45", createdAt: Date.now() - 110000 },
    ];
    demo.checkin = [
      { id: uid(), title: "Check-in motorista Luis", createdAt: Date.now() - 100000 },
    ];
    demo.codificacao = [
      { id: uid(), title: "Codificar lote L-99", createdAt: Date.now() - 90000 },
    ];
    demo.impressao_mapa = [
      { id: uid(), title: "Imprimir mapa 12/10", createdAt: Date.now() - 80000 },
    ];
    demo.arquivo = [
      { id: uid(), title: "Arquivar pedido 789", createdAt: Date.now() - 70000 },
    ];
    setBoard(demo);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-neutral-950 dark:to-neutral-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Kanban – Fluxo Operacional</h1>
            <p className="text-sm text-gray-500 mt-1">
              Colunas definidas a partir das mensagens de 18/10/2025.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar cards..."
              className="text-sm rounded-xl border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400/40 w-56"
            />
            <button
              onClick={seedDemo}
              className="text-sm px-3 py-2 rounded-xl border border-gray-300 dark:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800"
            >
              popular demo
            </button>
            <button
              onClick={resetBoard}
              className="text-sm px-3 py-2 rounded-xl border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50/60 dark:hover:bg-red-950/40"
            >
              limpar
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="hscroll overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {COLS.map((c) => (
              <Column
                key={c.key}
                label={c.label}
                colKey={c.key}
                tasks={filtered[c.key]}
                onDropTask={moveTask}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-[11px] text-gray-400">
          Dica: arraste um card para mudar de coluna. Os dados ficam no seu navegador (localStorage).
        </div>
      </div>
    </div>
  );
}
