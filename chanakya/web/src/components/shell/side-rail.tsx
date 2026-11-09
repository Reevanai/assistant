"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/domain/modules";
import { cn } from "@/lib/utils";
import { MODULE_ICON } from "./icons";

export function SideRail({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Modules" className="flex w-12 shrink-0 flex-col border-r border-border bg-panel lg:w-48">
      <ul className="flex flex-1 flex-col gap-px py-2">
        {MODULES.map((m) => {
          const href = `/o/${orgSlug}/${m.href}`;
          const section = m.href.split("/")[0];
          const active = pathname.startsWith(`/o/${orgSlug}/${section}`);
          const Icon = MODULE_ICON[m.id];
          return (
            <li key={m.id}>
              <Link
                href={href}
                title={`${m.label}  (g ${m.key})`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2.5 border-l-2 px-3.5 text-[12px] lg:px-3",
                  active ? "border-accent bg-panel-2 text-fg" : "border-transparent text-muted hover:bg-panel-2/60 hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden flex-1 truncate lg:inline">{m.label}</span>
                {m.milestone > 1 ? (
                  <span className="hidden font-mono text-[9px] text-muted/70 lg:inline" title={`Planned for milestone ${m.milestone}`}>M{m.milestone}</span>
                ) : (
                  <kbd className="hidden font-mono text-[9px] text-muted/60 group-hover:inline lg:group-hover:inline">g {m.key}</kbd>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
