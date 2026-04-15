"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm",
        accent && "bg-foreground text-background border-transparent"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className={cn("text-xs font-semibold tracking-wide uppercase", accent ? "text-background/70" : "text-muted")}>
            {label}
          </div>
          <div className={cn("mt-2 text-2xl font-semibold tracking-tight", accent ? "text-background" : "text-foreground")}>
            {value}
          </div>
          {hint ? (
            <div className={cn("mt-1 text-sm", accent ? "text-background/70" : "text-muted")}>{hint}</div>
          ) : null}
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center border border-border bg-surface-strong",
            accent && "bg-background/10 border-background/15"
          )}
        >
          <Icon className={cn("h-5 w-5", accent ? "text-background" : "text-foreground")} />
        </div>
      </div>
    </div>
  );
}

