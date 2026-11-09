"use client";
import { useRouter } from "next/navigation";

export function OrgSwitcher({ current, orgs }: { current: string; orgs: { slug: string; name: string }[] }) {
  const router = useRouter();
  return (
    <select
      aria-label="Switch organisation"
      value={current}
      onChange={(e) => (e.target.value === "__new" ? router.push("/onboarding") : router.push(`/o/${e.target.value}/command`))}
      className="h-7 max-w-52 truncate rounded-[var(--radius-md)] border border-transparent bg-transparent px-1 text-[12px] font-medium text-fg hover:border-border focus:border-accent focus:outline-none"
    >
      {orgs.map((o) => (
        <option key={o.slug} value={o.slug} className="bg-panel">{o.name}</option>
      ))}
      <option value="__new" className="bg-panel">+ New organisation…</option>
    </select>
  );
}
