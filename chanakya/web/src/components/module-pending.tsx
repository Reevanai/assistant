import { ROADMAP } from "@/lib/domain/roadmap";

export function ModulePending({ id }: { id: keyof typeof ROADMAP }) {
  const m = ROADMAP[id];
  if (!m) return null;
  return (
    <div className="p-2">
      <section className="max-w-3xl border border-border bg-panel">
        <header className="flex h-8 items-center gap-2 border-b border-border px-3">
          <h1 className="text-[11px] font-semibold uppercase tracking-[0.08em]">{m.title}</h1>
          <span className="ml-auto font-mono text-[10px] text-accent">PLANNED · MILESTONE {m.milestone}</span>
        </header>
        <div className="space-y-3 p-3 text-[12px]">
          <p className="text-muted">This module is not built yet. Nothing on this page is simulated.</p>
          <p>{m.summary}</p>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">Depends on</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">{m.dependsOn.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        </div>
      </section>
    </div>
  );
}
