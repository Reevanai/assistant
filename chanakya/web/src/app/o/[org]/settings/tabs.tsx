"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [{ href: "members", label: "Members" }, { href: "sources", label: "Sources" }];

export function SettingsTabs({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex self-stretch">
      {TABS.map((t) => {
        const href = `/o/${orgSlug}/settings/${t.href}`;
        const active = pathname.startsWith(href);
        return (
          <Link key={t.href} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex items-center border-b-2 px-3 text-[12px]", active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg")}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
