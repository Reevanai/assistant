import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, DocumentVersionRow } from "@/lib/domain/types";

export interface DocumentDetail {
  document: DocumentRow;
  source: { id: string; name: string; publisher: string; base_url: string; license_status: string; license_notes: string | null; terms_url: string | null; is_demo: boolean } | null;
  versions: DocumentVersionRow[];
  entities: { entity_id: string; link_type: string; verification_status: string; canonical_name: string; entity_type: string; is_demo: boolean }[];
  jurisdictionName: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDocumentDetail(id: string): Promise<DocumentDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`document: ${error.message}`);
  if (!document) return null;
  const doc = document as DocumentRow & { search_tsv?: unknown };
  delete doc.search_tsv;

  const [source, versions, links, jurisdiction] = await Promise.all([
    supabase.from("sources").select("id, name, publisher, base_url, license_status, license_notes, terms_url, is_demo").eq("id", doc.source_id).maybeSingle(),
    supabase
      .from("document_versions")
      .select("id, version_no, content_sha256, mime_type, byte_size, retrieved_at, fetched_url, extraction_status, page_count, change_summary")
      .eq("document_id", id)
      .order("version_no", { ascending: false }),
    supabase
      .from("document_entities")
      .select("entity_id, link_type, verification_status, entities(canonical_name, entity_type, is_demo)")
      .eq("document_id", id),
    doc.state_code
      ? supabase.from("jurisdictions").select("name").eq("code", doc.state_code).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const r of [source, versions, links]) if (r.error) throw new Error(r.error.message);

  return {
    document: doc,
    source: source.data as DocumentDetail["source"],
    versions: (versions.data ?? []) as DocumentVersionRow[],
    entities: (links.data ?? []).map((l) => {
      const e = l.entities as unknown as { canonical_name: string; entity_type: string; is_demo: boolean } | null;
      return {
        entity_id: l.entity_id as string,
        link_type: l.link_type as string,
        verification_status: l.verification_status as string,
        canonical_name: e?.canonical_name ?? "Unknown entity",
        entity_type: e?.entity_type ?? "unknown",
        is_demo: e?.is_demo ?? false,
      };
    }),
    jurisdictionName: (jurisdiction.data as { name: string } | null)?.name ?? null,
  };
}
