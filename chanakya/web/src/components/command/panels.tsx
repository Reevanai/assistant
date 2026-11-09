import Link from "next/link";
import {
  getCorpusStats, getLatestDocuments, getRecentActivity, getRecentNotifications, getSourceStatus,
  getTrackedTargets, getWatchlistSummaries,
} from "@/lib/data/command";
import { formatCount, formatDateTime, formatRelative } from "@/lib/domain/format";
import { LICENSE, RUN_STATUS } from "@/lib/domain/labels";
import { describeAudit } from "@/lib/domain/audit";
import { can, type OrgRole } from "@/lib/domain/roles";
import { DocumentTable } from "@/components/documents/document-table";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState, Panel, PanelError } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";

/** Run a loader; on failure return the message so the panel can show an inline error. */
async function load<T>(fn: () => Promise<T>): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    console.error("[command-centre]", e);
    return { data: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function StatusStrip() {
  const res = await load(getCorpusStats);
  if (res.error !== null) return <PanelError message={res.error} />;
  const s = res.data;
  const cells: [string, React.ReactNode][] = [
    ["Documents", formatCount(s.documents)],
    ["Versions", formatCount(s.versions)],
    ["Entities", formatCount(s.entities)],
    ["Active sources", `${formatCount(s.sources_active)} / ${formatCount(s.sources_total)}`],
    ["Last ingestion", formatRelative(s.last_run_at)],
    ["Latest document", formatRelative(s.last_document_at)],
  ];
  return (
    <div className="flex flex-wrap items-stretch border border-border bg-panel">
      {cells.map(([k, v]) => (
        <div key={k} className="min-w-[120px] flex-1 border-r border-border px-3 py-2 last:border-r-0">
          <p className="text-[10px] uppercase tracking-wider text-muted">{k}</p>
          <p className="font-mono text-[15px] tabular-nums text-fg">{v}</p>
        </div>
      ))}
      {s.demo_documents > 0 ? (
        <div className="flex items-center gap-2 border-l border-accent/40 bg-accent/5 px-3 py-2 text-[11px] text-accent">
          <DemoBadge /> {formatCount(s.demo_documents)} synthetic demo documents loaded
        </div>
      ) : null}
    </div>
  );
}

export async function DevelopmentsPanel({ orgSlug }: { orgSlug: string }) {
  const res = await load(() => getLatestDocuments(15));
  return (
    <Panel title="Latest developments" meta={res.data ? `${res.data.length} most recently ingested` : undefined}>
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="No documents in the corpus yet">
          Documents appear here once an ingestion connector has run against a licence-reviewed source.
          Connectors arrive in Milestone 2; see Settings → Sources for their status.
        </EmptyState>
      ) : <DocumentTable rows={res.data} orgSlug={orgSlug} />}
    </Panel>
  );
}

export async function NotificationsPanel({ orgSlug }: { orgSlug: string }) {
  const res = await load(() => getRecentNotifications(30, 10));
  return (
    <Panel title="Gazette & notifications" meta="last 30 days · notifications, orders, circulars, rules">
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="No notifications published in the last 30 days" />
      ) : <DocumentTable rows={res.data} orgSlug={orgSlug} compact />}
    </Panel>
  );
}

export async function WatchlistsPanel({ orgId, orgSlug, role }: { orgId: string; orgSlug: string; role: OrgRole }) {
  const res = await load(() => getWatchlistSummaries(orgId));
  return (
    <Panel
      title="Watchlists"
      meta="matches · 7d"
      actions={<Link href={`/o/${orgSlug}/watchlists`} className="text-[11px] text-muted hover:text-accent">All →</Link>}
    >
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="No watchlists">
          {can.createWatchlist(role)
            ? <Link href={`/o/${orgSlug}/watchlists`} className="text-accent hover:underline">Create a watchlist</Link>
            : "Ask an analyst to create one."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-border/60">
          {res.data.slice(0, 8).map((w) => (
            <li key={w.id}>
              <Link href={`/o/${orgSlug}/watchlists/${w.id}`} className="flex h-8 items-center gap-2 px-3 hover:bg-panel-2/60">
                <span className="flex-1 truncate text-[12px]">{w.name}</span>
                {w.visibility === "private" ? <Badge>Private</Badge> : null}
                <span className="font-mono text-[10px] text-muted">{w.item_count} items</span>
                <span className={`w-8 text-right font-mono text-[12px] tabular-nums ${w.match_count_7d ? "text-accent" : "text-muted"}`}>{w.match_count_7d}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export async function TrackedPanel({ orgId }: { orgId: string }) {
  const res = await load(() => getTrackedTargets(orgId));
  const KIND: Record<string, string> = { jurisdiction: "Region", entity: "Body", sector: "Sector" };
  return (
    <Panel title="Tracked bodies & regions" meta="across watchlists">
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="Nothing tracked yet">Add states, sectors or ministries to a watchlist to track them here.</EmptyState>
      ) : (
        <ul className="divide-y divide-border/60">
          {res.data.slice(0, 12).map((t) => (
            <li key={`${t.kind}:${t.key}`} className="flex h-7 items-center gap-2 px-3">
              <span className="w-14 font-mono text-[10px] uppercase text-muted">{KIND[t.kind]}</span>
              <span className="flex-1 truncate text-[12px]">{t.label}</span>
              <span className="font-mono text-[10px] text-muted">{t.watchlists} list{t.watchlists === 1 ? "" : "s"}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export async function IngestionPanel({ orgSlug }: { orgSlug: string }) {
  const res = await load(getSourceStatus);
  return (
    <Panel
      title="Ingestion status"
      actions={<Link href={`/o/${orgSlug}/settings/sources`} className="text-[11px] text-muted hover:text-accent">Sources →</Link>}
    >
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="No sources registered" />
      ) : (
        <Table>
          <thead><tr><Th>Source</Th><Th className="w-20">State</Th><Th className="hidden w-40 lg:table-cell">Licence</Th><Th className="w-28">Last run</Th><Th className="w-20 text-right">Docs</Th></tr></thead>
          <tbody>
            {res.data.map((s) => (
              <Tr key={s.id}>
                <Td className="max-w-0"><div className="flex items-center gap-2">{s.is_demo ? <DemoBadge /> : null}<span className="truncate" title={s.publisher}>{s.name}</span></div></Td>
                <Td>{s.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="hidden lg:table-cell"><StatusBadge table={LICENSE} value={s.license_status} /></Td>
                <Td title={s.last_run_error ?? formatDateTime(s.last_run_finished_at ?? s.last_run_started_at)}>
                  {s.last_run_status ? <StatusBadge table={RUN_STATUS} value={s.last_run_status} /> : <span className="text-[11px] text-muted">Never run</span>}
                </Td>
                <Td className="text-right font-mono tabular-nums">{formatCount(s.document_count)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

export async function ActivityPanel({ orgId, role }: { orgId: string; role: OrgRole }) {
  const res = await load(() => getRecentActivity(orgId, 14));
  return (
    <Panel title="Research activity" meta={can.readFullAudit(role) ? "organisation audit log" : "your actions"}>
      {res.error !== null ? <PanelError message={res.error} /> : res.data.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <ul className="divide-y divide-border/60">
          {res.data.map((a) => (
            <li key={a.id} className="px-3 py-1.5">
              <p className="truncate text-[12px]"><span className="text-fg">{a.actor_name ?? (a.actor_id ? "A member" : "System")}</span> <span className="text-muted">{describeAudit(a)}</span></p>
              <p className="font-mono text-[10px] text-muted" title={formatDateTime(a.created_at)}>{formatRelative(a.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
