import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseLayout, type CommandLayout } from "@/lib/domain/layout";
import type { AuditRow, CorpusStats, DocumentRow, SourceStatusRow, WatchlistItemRow, WatchlistRow } from "@/lib/domain/types";

/**
 * Command Centre reads. Every query runs as the signed-in user; RLS scopes results.
 * Each function throws on error so the panel's error boundary can render it.
 */

const DOC_LIST_COLUMNS =
  "id, title, doc_type, jurisdiction_level, state_code, issuing_body, published_on, source_url, first_retrieved_at, verification_status, extraction_status, sectors, is_demo";

export type DocumentListRow = Pick<
  DocumentRow,
  | "id" | "title" | "doc_type" | "jurisdiction_level" | "state_code" | "issuing_body" | "published_on"
  | "source_url" | "first_retrieved_at" | "verification_status" | "extraction_status" | "sectors" | "is_demo"
>;

export async function getCorpusStats(): Promise<CorpusStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("corpus_stats");
  if (error) throw new Error(`corpus_stats: ${error.message}`);
  return data as CorpusStats;
}

export async function getLatestDocuments(limit = 15): Promise<DocumentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(DOC_LIST_COLUMNS)
    .order("first_retrieved_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`documents: ${error.message}`);
  return (data ?? []) as DocumentListRow[];
}

export async function getRecentNotifications(days = 30, limit = 10): Promise<DocumentListRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("documents")
    .select(DOC_LIST_COLUMNS)
    .in("doc_type", ["gazette_notification", "order", "circular", "rule"])
    .gte("published_on", since)
    .order("published_on", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`notifications: ${error.message}`);
  return (data ?? []) as DocumentListRow[];
}

export async function getSourceStatus(): Promise<SourceStatusRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_status")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(`source_status: ${error.message}`);
  return (data ?? []) as SourceStatusRow[];
}

export interface WatchlistSummary extends WatchlistRow {
  item_count: number;
  match_count_7d: number;
}

export async function getWatchlistSummaries(orgId: string): Promise<WatchlistSummary[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [lists, counts] = await Promise.all([
    supabase
      .from("watchlists")
      .select("*, watchlist_items(count)")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false }),
    supabase.rpc("watchlist_match_counts", { p_org: orgId, p_since: since }),
  ]);
  if (lists.error) throw new Error(`watchlists: ${lists.error.message}`);
  if (counts.error) throw new Error(`watchlist_match_counts: ${counts.error.message}`);
  const byId = new Map<string, number>(
    ((counts.data ?? []) as { watchlist_id: string; match_count: number }[]).map((c) => [c.watchlist_id, Number(c.match_count)]),
  );
  return (lists.data ?? []).map((w) => {
    const { watchlist_items, ...rest } = w as WatchlistRow & { watchlist_items: { count: number }[] };
    return { ...rest, item_count: watchlist_items?.[0]?.count ?? 0, match_count_7d: byId.get(rest.id) ?? 0 };
  });
}

export interface TrackedTarget {
  kind: "jurisdiction" | "entity" | "sector";
  key: string;
  label: string;
  watchlists: number;
}

/** Ministries, departments, regions and sectors that appear across the org's watchlists. */
export async function getTrackedTargets(orgId: string): Promise<TrackedTarget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("watchlist_id, item_type, jurisdiction_code, sector, entity_id, jurisdictions(name), sectors(label), entities(canonical_name, entity_type)")
    .eq("org_id", orgId)
    .in("item_type", ["jurisdiction", "entity", "sector"]);
  if (error) throw new Error(`tracked: ${error.message}`);

  const agg = new Map<string, TrackedTarget & { lists: Set<string> }>();
  for (const raw of data ?? []) {
    const r = raw as unknown as WatchlistItemRow & {
      jurisdictions: { name: string } | null;
      sectors: { label: string } | null;
      entities: { canonical_name: string } | null;
    };
    const kind = r.item_type as TrackedTarget["kind"];
    const key = r.jurisdiction_code ?? r.sector ?? r.entity_id ?? "";
    const label = r.jurisdictions?.name ?? r.sectors?.label ?? r.entities?.canonical_name ?? key;
    const id = `${kind}:${key}`;
    const entry = agg.get(id) ?? { kind, key, label, watchlists: 0, lists: new Set<string>() };
    entry.lists.add(r.watchlist_id);
    entry.watchlists = entry.lists.size;
    agg.set(id, entry);
  }
  return [...agg.values()]
    .map(({ lists: _lists, ...t }) => t)
    .sort((a, b) => b.watchlists - a.watchlists || a.label.localeCompare(b.label));
}

export async function getRecentActivity(orgId: string, limit = 12): Promise<(AuditRow & { actor_name: string | null })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, table_name, record_id, old_data, new_data, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`audit_log: ${error.message}`);
  const rows = (data ?? []) as AuditRow[];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string | null>();
  if (actorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    (profiles ?? []).forEach((p) => names.set(p.id as string, (p.full_name as string | null) ?? null));
  }
  return rows.map((r) => ({ ...r, actor_name: r.actor_id ? names.get(r.actor_id) ?? null : null }));
}

export async function getCommandLayout(orgId: string, userId: string): Promise<CommandLayout> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_workspace_prefs")
    .select("layout")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return parseLayout(data?.layout);
}
