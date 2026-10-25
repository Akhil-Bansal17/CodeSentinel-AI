import React from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "purple";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  isMono?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "sm",
  dot = false,
  icon,
  isMono = true,
  children,
  className,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string; border: string }> = {
    neutral: {
      bg: "bg-surface-elevated",
      text: "text-text-secondary",
      dot: "bg-zinc-400",
      border: "border-border-default",
    },
    success: {
      bg: "bg-status-success-bg",
      text: "text-status-success-text",
      dot: "bg-emerald-400",
      border: "border-status-success-border",
    },
    warning: {
      bg: "bg-status-warning-bg",
      text: "text-status-warning-text",
      dot: "bg-amber-400",
      border: "border-status-warning-border",
    },
    danger: {
      bg: "bg-status-danger-bg",
      text: "text-status-danger-text",
      dot: "bg-rose-400",
      border: "border-status-danger-border",
    },
    info: {
      bg: "bg-status-info-bg",
      text: "text-status-info-text",
      dot: "bg-sky-400",
      border: "border-status-info-border",
    },
    accent: {
      bg: "bg-accent-subtle",
      text: "text-indigo-300",
      dot: "bg-indigo-400",
      border: "border-accent-border",
    },
    purple: {
      bg: "bg-purple-950/30",
      text: "text-purple-300",
      dot: "bg-purple-400",
      border: "border-purple-800/40",
    },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const style = variantStyles[variant];
  const content = label || children;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border shrink-0 transition-colors",
        isMono ? "font-mono" : "font-sans",
        sizeStyles[size],
        style.bg,
        style.text,
        style.border,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", style.dot)}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {content}
    </span>
  );
};
