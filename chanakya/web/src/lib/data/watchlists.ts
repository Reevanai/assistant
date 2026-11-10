import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WatchlistItemRow, WatchlistRow } from "@/lib/domain/types";
import type { DocumentListRow } from "./command";

export async function getWatchlist(orgId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null; // malformed uuid
    throw new Error(`watchlist: ${error.message}`);
  }
  return data as WatchlistRow | null;
}

export interface WatchlistItemView extends WatchlistItemRow {
  label: string;
}

export async function getWatchlistItems(watchlistId: string): Promise<WatchlistItemView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("*, jurisdictions(name), sectors(label), entities(canonical_name), sources(name)")
    .eq("watchlist_id", watchlistId)
    .order("created_at");
  if (error) throw new Error(`watchlist_items: ${error.message}`);
  return (data ?? []).map((raw) => {
    const r = raw as WatchlistItemRow & {
      jurisdictions: { name: string } | null; sectors: { label: string } | null;
      entities: { canonical_name: string } | null; sources: { name: string } | null;
    };
    const label =
      r.jurisdictions?.name ?? r.sectors?.label ?? r.entities?.canonical_name ?? r.sources?.name ??
      r.keyword ?? r.doc_type ?? "—";
    const { jurisdictions: _j, sectors: _s, entities: _e, sources: _src, ...item } = r;
    return { ...item, label };
  });
}

export async function getWatchlistMatches(watchlistId: string, days = 30): Promise<DocumentListRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase.rpc("watchlist_matches", { p_watchlist: watchlistId, p_since: since, p_limit: 100 });
  if (error) throw new Error(`watchlist_matches: ${error.message}`);
  return (data ?? []) as DocumentListRow[];
}

/** Options for the "add item" form: reference data the DB will accept. */
export async function getWatchlistOptions() {
  const supabase = await createClient();
  const [j, s, src] = await Promise.all([
    supabase.from("jurisdictions").select("code, name, kind").order("kind").order("name"),
    supabase.from("sectors").select("slug, label").order("label"),
    supabase.from("sources").select("id, name, is_demo").order("name"),
  ]);
  for (const r of [j, s, src]) if (r.error) throw new Error(r.error.message);
  return {
    jurisdictions: (j.data ?? []) as { code: string; name: string; kind: string }[],
    sectors: (s.data ?? []) as { slug: string; label: string }[],
    sources: (src.data ?? []) as { id: string; name: string; is_demo: boolean }[],
  };
}
