import React, { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      id,
      className,
      disabled,
      required,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-text-secondary select-none"
          >
            {label}
            {required && <span className="text-status-danger ml-0.5" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              "w-full rounded-md border bg-surface-input text-text-primary text-sm px-3 py-2 pr-9 transition-colors appearance-none cursor-pointer",
              "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-elevated",
              error
                ? "border-status-danger text-status-danger-text focus-visible:ring-status-danger"
                : "border-border-default hover:border-border-strong",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-surface-card text-text-primary"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 flex items-center pointer-events-none text-text-muted">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-xs text-status-danger font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
