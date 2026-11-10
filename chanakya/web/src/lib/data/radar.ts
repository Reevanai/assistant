import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocumentListRow } from "./command";

export interface RadarFilters {
  q?: string;
  type?: string;
  sector?: string;
  source?: string;
  state?: string;
  page?: number;
}

const COLUMNS =
  "id, title, doc_type, jurisdiction_level, state_code, issuing_body, published_on, source_url, first_retrieved_at, verification_status, extraction_status, sectors, is_demo";
export const RADAR_PAGE_SIZE = 50;

/** Filtered, paginated corpus query. Full-text search uses the generated tsvector (websearch syntax). */
export async function searchDocuments(f: RadarFilters): Promise<{ rows: DocumentListRow[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let q = supabase.from("documents").select(COLUMNS, { count: "exact" });
  if (f.q) q = q.textSearch("search_tsv", f.q, { type: "websearch", config: "simple" });
  if (f.type) q = q.eq("doc_type", f.type);
  if (f.sector) q = q.contains("sectors", [f.sector]);
  if (f.source) q = q.eq("source_id", f.source);
  if (f.state === "IN") q = q.eq("jurisdiction_level", "central");
  else if (f.state) q = q.eq("state_code", f.state);
  const { data, error, count } = await q
    .order("published_on", { ascending: false, nullsFirst: false })
    .order("first_retrieved_at", { ascending: false })
    .range((page - 1) * RADAR_PAGE_SIZE, page * RADAR_PAGE_SIZE - 1);
  if (error) throw new Error(`radar: ${error.message}`);
  return { rows: (data ?? []) as DocumentListRow[], total: count ?? 0 };
}

export async function getRadarFacets() {
  const supabase = await createClient();
  const [sectors, sources, docs] = await Promise.all([
    supabase.from("sectors").select("slug, label").order("label"),
    supabase.from("source_status").select("id, name, document_count").order("name"),
    supabase.from("documents").select("doc_type, sectors"),
  ]);
  for (const r of [sectors, sources, docs]) if (r.error) throw new Error(r.error.message);
  const typeCounts = new Map<string, number>();
  const sectorCounts = new Map<string, number>();
  for (const d of docs.data ?? []) {
    typeCounts.set(d.doc_type as string, (typeCounts.get(d.doc_type as string) ?? 0) + 1);
    for (const s of (d.sectors as string[]) ?? []) sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
  }
  return {
    sectors: ((sectors.data ?? []) as { slug: string; label: string }[]).map((s) => ({ ...s, n: sectorCounts.get(s.slug) ?? 0 })),
    sources: ((sources.data ?? []) as { id: string; name: string; document_count: number }[]).filter((s) => s.document_count > 0),
    types: [...typeCounts.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n),
  };
}
