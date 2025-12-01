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

        // Dark mode adjustments for circle style (simplified for now, can be expanded)
        const circleClass = useCurrentColor || isCompleted
          ? ""
          : "dark:bg-meta-4 dark:border-strokedark dark:text-gray-400";

        const labelClass =
          useCurrentColor || isCompleted
            ? "text-gray-900 dark:text-white font-semibold"
            : isSkipped
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-500 dark:text-gray-400";

        return (
          <div key={status.code} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelect?.(status.code)}
              className="keep-color flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              <span
                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${circleClass}`}
                style={useCurrentColor || isCompleted ? circleStyle : {}}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${useCurrentColor || isCompleted ? "bg-white" : "bg-gray-400 dark:bg-gray-500"}`} />
              </span>
              <span className={`text-left text-xs ${labelClass}`}>{status.label}</span>
            </button>
            {index < statuses.length - 1 && <div className="w-8 h-[2px] bg-gray-200 dark:bg-strokedark" />}
          </div>
        );
      })}
    </div>
  );
};
