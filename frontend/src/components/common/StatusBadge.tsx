import React from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info" | "purple";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "neutral",
  dot = false,
  className,
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
    success: {
      bg: "bg-emerald-950/40",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      border: "border-emerald-800/60",
    },
    warning: {
      bg: "bg-amber-950/40",
      text: "text-amber-400",
      dot: "bg-amber-400",
      border: "border-amber-800/60",
    },
    danger: {
      bg: "bg-rose-950/40",
      text: "text-rose-400",
      dot: "bg-rose-400",
      border: "border-rose-800/60",
    },
    info: {
      bg: "bg-sky-950/40",
      text: "text-sky-400",
      dot: "bg-sky-400",
      border: "border-sky-800/60",
    },
    purple: {
      bg: "bg-purple-950/40",
      text: "text-purple-400",
      dot: "bg-purple-400",
      border: "border-purple-800/60",
    },
    neutral: {
      bg: "bg-[#21262d]",
      text: "text-slate-300",
      dot: "bg-slate-400",
      border: "border-[#30363d]",
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />}
      {label}
    </span>
  );
};
