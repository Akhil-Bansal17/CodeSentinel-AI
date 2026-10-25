import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active border border-transparent shadow-xs focus-visible:ring-accent",
      secondary:
        "bg-surface-elevated text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong active:bg-surface-active focus-visible:ring-border-strong",
      outline:
        "bg-transparent text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong active:bg-surface-active focus-visible:ring-border-strong",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active border border-transparent focus-visible:ring-border-strong",
      danger:
        "bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:bg-red-950/70 hover:border-red-700/80 active:bg-red-950 focus-visible:ring-red-500",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "px-2.5 py-1 text-xs gap-1.5 rounded-sm",
      md: "px-3.5 py-1.5 text-sm gap-2 rounded-md",
      lg: "px-4.5 py-2 text-base gap-2.5 rounded-md",
    };

    const iconSizes: Record<ButtonSize, string> = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors select-none cursor-pointer",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn("animate-spin shrink-0", iconSizes[size])} aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
