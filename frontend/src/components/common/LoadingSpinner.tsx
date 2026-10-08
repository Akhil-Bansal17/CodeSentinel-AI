import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-6 gap-3", className)}>
      <Loader2 className={cn("animate-spin text-emerald-500", sizeMap[size])} />
      {message && <p className="text-xs font-mono text-slate-400">{message}</p>}
    </div>
  );
};
