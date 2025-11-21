'use client';

import { STATUS_FLOW } from "@/lib/qualidade/status";

const COMPLETED_COLOR = "#00529B";
const DEFAULT_BG = "#EFF2FA";
const DEFAULT_BORDER = "#D5D9E5";
const DEFAULT_TEXT = "#99A0B8";
const SKIPPED_BG = "#F5F6FB";
const SKIPPED_BORDER = "#E1E5F3";
const SKIPPED_TEXT = "#B7BED6";

interface Props {
  current?: number;
  completed?: number[];
  onSelect?: (code: number) => void;
}

export const StatusStepper = ({ current, completed, onSelect }: Props) => {
  const completedSet = new Set<number>(completed ?? []);
  const hasCustomCompleted = Array.isArray(completed);
  const statuses = STATUS_FLOW.filter(
    (status) => status.code === current || completedSet.has(status.code) || (!hasCustomCompleted && current == null),
  );

  return (
    <div className="flex items-center gap-4 py-2 min-w-max">
      {statuses.map((status, index) => {
        const isCurrent = current != null && status.code === current;
        const currentIndex = statuses.findIndex((item) => item.code === current);
        const isCompleted = hasCustomCompleted
          ? completedSet.has(status.code)
          : currentIndex > -1 && index < currentIndex;
        const isSkipped = hasCustomCompleted && !isCompleted && currentIndex > -1 && index < currentIndex;
        const useCurrentColor = isCurrent && (!hasCustomCompleted || !completedSet.has(status.code));

        const circleStyle = useCurrentColor
          ? { backgroundColor: status.color, borderColor: status.color, color: "white" }
          : isCompleted
            ? { backgroundColor: COMPLETED_COLOR, borderColor: COMPLETED_COLOR, color: "white" }
            : isSkipped
              ? { backgroundColor: SKIPPED_BG, borderColor: SKIPPED_BORDER, color: SKIPPED_TEXT }
              : { backgroundColor: DEFAULT_BG, borderColor: DEFAULT_BORDER, color: DEFAULT_TEXT };

        const labelClass =
          useCurrentColor || isCompleted ? "text-slate-900 font-semibold" : isSkipped ? "text-slate-400" : "text-slate-500";

        return (
          <div key={status.code} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelect?.(status.code)}
              className="keep-color flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <span
                className="h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold text-sm"
                style={circleStyle}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current" />
              </span>
              <span className={`text-left text-xs ${labelClass}`}>{status.label}</span>
            </button>
            {index < statuses.length - 1 && <div className="w-8 h-[2px] bg-slate-200" />}
          </div>
        );
      })}
    </div>
  );
};
