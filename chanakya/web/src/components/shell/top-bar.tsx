import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABEL, type OrgRole } from "@/lib/domain/roles";
import type { Organization } from "@/lib/domain/types";
import { IstClock } from "./ist-clock";
import { OrgSwitcher } from "./org-switcher";
import { PaletteTrigger } from "./command-palette";

export function TopBar({ org, role, orgs, userLabel }: {
  org: Organization; role: OrgRole; orgs: { slug: string; name: string }[]; userLabel: string;
}) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-panel px-3">
      <Link href={`/o/${org.slug}/command`} className="flex items-center gap-2" aria-label="CHANAKYA home">
        <span className="grid size-5 place-items-center border border-accent font-mono text-[11px] font-bold text-accent">च</span>
        <span className="hidden text-[12px] font-semibold tracking-[0.2em] text-fg sm:inline">CHANAKYA</span>
      </Link>
      <span className="h-4 w-px bg-border" />
      <OrgSwitcher current={org.slug} orgs={orgs} />
      <span className="hidden font-mono text-[10px] uppercase text-muted md:inline">{org.edition} · {ROLE_LABEL[role]}</span>
      <div className="ml-auto flex items-center gap-3">
        <PaletteTrigger />
        <span className="hidden md:inline"><IstClock /></span>
        <span className="hidden max-w-40 truncate text-[12px] text-muted sm:inline" title={userLabel}>{userLabel}</span>
        <form action={signOut}>
          <button type="submit" className="grid size-7 place-items-center text-muted hover:text-fg" title="Sign out" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
