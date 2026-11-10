import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getOrgContext } from "@/lib/data/session";
import { getEntityTypeCounts, listEntities } from "@/lib/data/entities";
import { VERIFICATION } from "@/lib/domain/labels";
import { DemoBadge } from "@/components/ui/badge";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata = { title: "Entities" };

const TYPE_LABEL: Record<string, string> = {
  ministry: "Ministries", department: "Departments", political_party: "Political parties",
  public_project: "Public projects", public_institution: "Institutions", company: "Companies",
  person: "Public-office holders", policy: "Policies", legislative_instrument: "Legislative instruments",
  constituency: "Constituencies", legislature: "Legislatures",
};

export default async function EntitiesPage({ params, searchParams }: {
  params: Promise<{ org: string }>; searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { org: slug } = await params;
  const { type, q } = await searchParams;
  await getOrgContext(slug);
  const [counts, rows] = await Promise.all([getEntityTypeCounts(), listEntities({ type, q })]);
  const base = `/o/${slug}/entities`;
  const href = (t?: string) => `${base}${t || q ? "?" : ""}${t ? `type=${t}` : ""}${t && q ? "&" : ""}${q ? `q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid grid-cols-1 gap-2 p-2 xl:grid-cols-12">
      <Panel title="Entity types" className="xl:col-span-3">
        <ul className="py-1">
          <li><Link href={href()} className={cn("flex h-7 items-center px-3 text-[12px] hover:bg-panel-2", !type && "text-accent")}>All<span className="ml-auto font-mono text-muted">{counts.reduce((a, c) => a + c.n, 0)}</span></Link></li>
          {counts.map((c) => (
            <li key={c.entity_type}>
              <Link href={href(c.entity_type)} className={cn("flex h-7 items-center px-3 text-[12px] hover:bg-panel-2", type === c.entity_type && "text-accent")}>
                {TYPE_LABEL[c.entity_type] ?? c.entity_type}<span className="ml-auto font-mono text-muted">{c.n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
          Identity facts come from Wikidata (CC0) and are marked auto-matched until a curator verifies them against an official source.
        </p>
      </Panel>
      <Panel title={type ? TYPE_LABEL[type] ?? type : "All entities"} meta={`${rows.length} shown`} className="xl:col-span-9"
        actions={<form action={base} className="flex items-center gap-1">{type ? <input type="hidden" name="type" value={type} /> : null}<Input name="q" defaultValue={q} placeholder="Filter by name…" className="h-6 w-48 text-[12px]" /></form>}>
        {rows.length === 0 ? <EmptyState title="No entities match">Entities are loaded by the ingestion collector (see docs/DATA_SOURCES.md).</EmptyState> : (
          <Table>
            <thead><tr><Th>Name</Th><Th className="hidden lg:table-cell">Description</Th><Th className="w-40">Details</Th><Th className="w-28">Status</Th><Th className="w-8" /></tr></thead>
            <tbody>
              {rows.map((e) => {
                const a = e.attributes as Record<string, string | number | undefined>;
                const details = [a.abbr, a.plant_type, a.capacity_mw ? `${a.capacity_mw} MW` : null, a.inception ? `est. ${String(a.inception).slice(0, 4)}` : null].filter(Boolean).join(" · ");
                const qid = typeof a.wikidata_qid === "string" ? a.wikidata_qid : null;
                return (
                  <Tr key={e.id}>
                    <Td className="max-w-0"><div className="flex items-center gap-2">{e.is_demo ? <DemoBadge /> : null}<span className="truncate" title={e.canonical_name}>{e.canonical_name}</span></div></Td>
                    <Td className="hidden max-w-0 lg:table-cell"><span className="block truncate text-muted" title={e.description ?? ""}>{e.description ?? "—"}</span></Td>
                    <Td className="font-mono text-[11px] text-muted">{details || "—"}</Td>
                    <Td><StatusBadge table={VERIFICATION} value={e.verification_status} /></Td>
                    <Td>{qid ? <a href={`https://www.wikidata.org/wiki/${qid}`} target="_blank" rel="noopener noreferrer" title={`Source: Wikidata ${qid}`} className="text-muted hover:text-accent"><ExternalLink className="size-3.5" /></a> : null}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
