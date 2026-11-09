import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/labels";

const TONES: Record<Tone, string> = {
  neutral: "border-border text-muted",
  accent: "border-accent/50 text-accent",
  success: "border-success/50 text-success",
  warning: "border-warning/50 text-warning",
  danger: "border-danger/50 text-danger",
  info: "border-info/50 text-info",
};

export function Badge({ tone = "neutral", className, children, title }: { tone?: Tone; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex h-[18px] items-center rounded-[var(--radius-sm)] border px-1.5 font-mono text-[10px] uppercase tracking-wide", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Mandatory marker for synthetic records. */
export function DemoBadge() {
  return <Badge tone="accent" title="Synthetic demo record — not real intelligence">Demo</Badge>;
}
