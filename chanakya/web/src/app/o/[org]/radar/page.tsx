import Link from "next/link";
import { getOrgContext } from "@/lib/data/session";
import { getRadarFacets, RADAR_PAGE_SIZE, searchDocuments } from "@/lib/data/radar";
import { DOC_TYPE_LABEL } from "@/lib/domain/labels";
import { formatCount } from "@/lib/domain/format";
import { DocumentTable } from "@/components/documents/document-table";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export const metadata = { title: "Policy Radar" };

type SP = { q?: string; type?: string; sector?: string; source?: string; state?: string; page?: string };

export default async function RadarPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<SP> }) {
  const { org: slug } = await params;
  const sp = await searchParams;
  await getOrgContext(slug);
  const page = Math.max(1, Number(sp.page) || 1);
  const [facets, result] = await Promise.all([getRadarFacets(), searchDocuments({ ...sp, page })]);
  const pages = Math.max(1, Math.ceil(result.total / RADAR_PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/o/${slug}/radar${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-2 p-2 xl:grid-cols-12">
      <Panel title="Filters" className="xl:col-span-3">
        <form action={`/o/${slug}/radar`} className="space-y-3 p-3">
          <div>
            <Label htmlFor="q">Search titles & issuing bodies</Label>
            <Input id="q" name="q" defaultValue={sp.q} placeholder='e.g. electricity -amendment' />
            <p className="mt-1 text-[11px] text-muted">Web-search syntax: "phrase", -exclude, or.</p>
          </div>
          <div>
            <Label htmlFor="type">Document type</Label>
            <Select id="type" name="type" defaultValue={sp.type ?? ""}>
              <option value="">All types</option>
              {facets.types.map((t) => <option key={t.type} value={t.type}>{DOC_TYPE_LABEL[t.type] ?? t.type} ({t.n})</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="sector">Sector</Label>
            <Select id="sector" name="sector" defaultValue={sp.sector ?? ""}>
              <option value="">All sectors</option>
              {facets.sectors.filter((s) => s.n > 0).map((s) => <option key={s.slug} value={s.slug}>{s.label} ({s.n})</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="source">Source</Label>
            <Select id="source" name="source" defaultValue={sp.source ?? ""}>
              <option value="">All sources</option>
              {facets.sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.document_count})</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="state">Jurisdiction</Label>
            <Select id="state" name="state" defaultValue={sp.state ?? ""}>
              <option value="">All</option>
              <option value="IN">Central</option>
              <option value="IN-KA">Karnataka</option>
              <option value="IN-MH">Maharashtra</option>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button type="submit" variant="primary">Apply</Button>
            <Link href={`/o/${slug}/radar`} className="inline-flex h-7 items-center px-3 text-[12px] text-muted hover:text-fg">Reset</Link>
          </div>
        </form>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
          Sectors are assigned by transparent keyword rules on titles (see ingest/collect.mjs), not by an AI model. Treat them as a starting filter.
        </p>
      </Panel>
      <Panel title="Policy Radar" meta={`${formatCount(result.total)} documents · page ${page}/${pages}`} className="xl:col-span-9"
        actions={
          <div className="flex items-center gap-1">
            {page > 1 ? <Link href={qs(page - 1)} className="text-[11px] text-muted hover:text-accent">← Prev</Link> : null}
            {page < pages ? <Link href={qs(page + 1)} className="ml-2 text-[11px] text-muted hover:text-accent">Next →</Link> : null}
          </div>
        }>
        {result.rows.length === 0 ? <EmptyState title="No documents match these filters" /> : <DocumentTable rows={result.rows} orgSlug={slug} />}
      </Panel>
    </div>
  );
}
