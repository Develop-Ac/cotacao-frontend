'use client';

import { ReactNode } from "react";

const baseClass =
  "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

const solidClass = "bg-primary text-white hover:bg-opacity-90";
const ghostClass =
  "border border-primary text-primary hover:bg-primary/10 dark:border-strokedark dark:text-white dark:hover:bg-meta-4";

const shapes: Record<"pill" | "rounded" | "square", string> = {
  pill: "px-4 py-1.5 text-sm",
  rounded: "px-3 py-1.5 text-sm",
  square: "w-8 h-8",
};

export interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "solid" | "ghost";
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
  shape?: keyof typeof shapes;
  className?: string;
  iconOnly?: boolean;
}

export const ActionButton = ({
  label,
  onClick,
  icon,
  variant = "solid",
  type = "button",
  loading = false,
  disabled = false,
  shape = "rounded",
  className = "",
  iconOnly = false,
}: ActionButtonProps) => {
  const classes = [
    baseClass,
    variant === "solid" ? solidClass : ghostClass,
    iconOnly ? "w-8 h-8 xl:w-auto xl:h-auto xl:px-3 xl:py-1.5 xl:text-sm" : (shapes[shape] ?? shapes.pill),
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading} aria-busy={loading} title={label}>
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          <span className={iconOnly ? "hidden xl:inline" : ""}>{label}</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {icon}
          <span className={iconOnly ? "hidden xl:inline" : ""}>{label}</span>
        </span>
      )}
    </button>
  );
};
