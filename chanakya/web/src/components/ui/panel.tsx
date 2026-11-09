import { cn } from "@/lib/utils";

export function Panel({ title, meta, actions, className, bodyClassName, children }: {
  title: string; meta?: React.ReactNode; actions?: React.ReactNode; className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col border border-border bg-panel", className)} aria-label={title}>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg">{title}</h2>
        {meta ? <span className="font-mono text-[10px] text-muted">{meta}</span> : null}
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-3 py-6 text-center">
      <p className="text-[12px] font-medium text-fg">{title}</p>
      {children ? <div className="mx-auto mt-1 max-w-md text-[12px] text-muted">{children}</div> : null}
    </div>
  );
}

export function PanelError({ message }: { message: string }) {
  return (
    <div role="alert" className="m-3 border border-danger/40 bg-danger/10 px-3 py-2 text-[12px] text-danger">
      Could not load this panel. <span className="text-muted">{message}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-px p-1" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-6 animate-pulse bg-panel-2/70" />
      ))}
    </div>
  );
}
