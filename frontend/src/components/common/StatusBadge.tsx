import React from "react";
import { Badge, BadgeVariant } from "./Badge";

export type { BadgeVariant };

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

/**
 * StatusBadge maintains backward compatibility across all legacy phase views
 * while wrapping the standardized Obsidian Sentinel Badge primitive.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = "neutral",
  dot = false,
  className,
}) => {
  return (
    <Badge
      label={label}
      variant={variant}
      dot={dot}
      className={className}
    />
  );
};
