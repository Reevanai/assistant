"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { COMMAND_PANELS, type PanelId } from "@/lib/domain/layout";
import { saveCommandLayout } from "@/lib/actions/prefs";
import { Button } from "@/components/ui/button";

export function CustomizeLayout({ orgId, orgSlug, hidden }: { orgId: string; orgSlug: string; hidden: PanelId[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<PanelId>>(new Set(hidden));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (id: PanelId) => setDraft((d) => { const n = new Set(d); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = () => start(async () => {
    const res = await saveCommandLayout({ orgId, orgSlug, hidden: [...draft] });
    if (!res.ok) { setError("Could not save layout."); return; }
    setError(null); setOpen(false); router.refresh();
  });

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <SlidersHorizontal className="size-3.5" /> Panels
      </Button>
      {open ? (
        <div className="absolute right-0 top-7 z-20 w-60 border border-border bg-panel p-2 shadow-xl">
          <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-muted">Visible panels</p>
          {COMMAND_PANELS.map((p) => (
            <label key={p.id} className="flex h-7 cursor-pointer items-center gap-2 px-1 text-[12px] hover:bg-panel-2">
              <input type="checkbox" className="accent-[var(--color-accent)]" checked={!draft.has(p.id)} onChange={() => toggle(p.id)} />
              {p.label}
            </label>
          ))}
          {error ? <p className="px-1 text-[11px] text-danger">{error}</p> : null}
          <div className="mt-2 flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
