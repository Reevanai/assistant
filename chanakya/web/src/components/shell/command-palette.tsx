"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { MODULES, chordTarget } from "@/lib/domain/modules";
import { MODULE_ICON } from "./icons";

const OPEN_EVENT = "chanakya:open-palette";

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function PaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex h-7 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-bg px-2 text-[12px] text-muted hover:border-muted sm:w-56"
    >
      <Search className="size-3.5" />
      <span className="hidden flex-1 text-left sm:inline">Go to…</span>
      <kbd className="hidden font-mono text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}

/** ⌘K / Ctrl-K palette plus vim-style "g <key>" chords for module navigation. */
export function CommandPalette({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const chord = useRef<number | null>(null);

  const go = useCallback((href: string) => {
    setOpen(false);
    router.push(`/o/${orgSlug}/${href}`);
  }, [orgSlug, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (open || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (chord.current !== null) {
        window.clearTimeout(chord.current);
        chord.current = null;
        const target = chordTarget(e.key);
        if (target) { e.preventDefault(); go(target); }
        return;
      }
      if (e.key === "g") chord.current = window.setTimeout(() => (chord.current = null), 900);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_EVENT, onOpen); };
  }, [go, open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-40 bg-black/50"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 border border-border bg-panel shadow-2xl"
    >
      <Command.Input
        autoFocus
        placeholder="Jump to module…"
        className="h-10 w-full border-b border-border bg-transparent px-3 text-[13px] text-fg placeholder:text-muted focus:outline-none"
      />
      <Command.List className="max-h-80 overflow-auto p-1">
        <Command.Empty className="px-3 py-4 text-[12px] text-muted">No matches.</Command.Empty>
        <Command.Group heading="Modules" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted">
          {MODULES.map((m) => {
            const Icon = MODULE_ICON[m.id];
            return (
              <Command.Item
                key={m.id}
                value={`${m.label} ${m.id}`}
                onSelect={() => go(m.href)}
                className="flex h-8 cursor-pointer items-center gap-2 px-2 text-[12px] text-muted data-[selected=true]:bg-panel-2 data-[selected=true]:text-fg"
              >
                <Icon className="size-4" />
                <span className="flex-1">{m.label}</span>
                {m.milestone > 1 ? <span className="font-mono text-[10px] text-muted/70">planned · M{m.milestone}</span> : null}
                <kbd className="font-mono text-[10px] text-muted/70">g {m.key}</kbd>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
