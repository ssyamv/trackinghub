import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeTone = "success" | "warning" | "danger" | "neutral";

const toneClassName: Record<StatusBadgeTone, string> = {
  success: "border-transparent bg-chart-2/20 text-foreground",
  warning: "border-transparent bg-chart-4/20 text-foreground",
  danger: "border-transparent bg-destructive text-destructive-foreground",
  neutral: "border-transparent bg-secondary text-secondary-foreground",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusBadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(toneClassName[tone], className)}>
      {children}
    </Badge>
  );
}
