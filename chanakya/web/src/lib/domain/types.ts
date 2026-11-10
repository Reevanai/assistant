/**
 * Row shapes returned by lib/data. Hand-maintained to match supabase/migrations.
 * When a Supabase project is linked, replace with `supabase gen types typescript`.
 */
import type { OrgRole } from "./roles";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  edition: "trial" | "research" | "professional" | "enterprise";
  created_at: string;
}

export interface OrgContext {
  org: Organization;
  role: OrgRole;
  userId: string;
  email: string | null;
}

export interface DocumentRow {
  id: string;
  source_id: string;
  external_id: string;
  title: string;
  doc_type: string;
  jurisdiction_level: "central" | "state" | "local";
  state_code: string | null;
  issuing_body: string | null;
  language: string;
  published_on: string | null;
  effective_on: string | null;
  source_url: string;
  first_retrieved_at: string;
  last_checked_at: string;
  current_version_id: string | null;
  extraction_status: string;
  verification_status: string;
  license_note: string | null;
  sectors: string[];
  summary: string | null;
  summary_model: string | null;
  summary_generated_at: string | null;
  is_demo: boolean;
}

export interface DocumentVersionRow {
  id: string;
  version_no: number;
  content_sha256: string;
  mime_type: string | null;
  byte_size: number | null;
  retrieved_at: string;
  fetched_url: string | null;
  extraction_status: string;
  page_count: number | null;
  change_summary: string | null;
}

export interface SourceStatusRow {
  id: string;
  slug: string;
  name: string;
  publisher: string;
  kind: string;
  jurisdiction_code: string;
  license_status: string;
  is_active: boolean;
  is_demo: boolean;
  last_run_status: string | null;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
  last_run_items_new: number | null;
  last_run_items_changed: number | null;
  last_run_items_failed: number | null;
  last_run_error: string | null;
  document_count: number;
}

export interface CorpusStats {
  documents: number;
  demo_documents: number;
  versions: number;
  entities: number;
  sources_total: number;
  sources_active: number;
  last_run_at: string | null;
  last_document_at: string | null;
}

export type WatchlistItemType = "entity" | "jurisdiction" | "sector" | "keyword" | "doc_type" | "source";

export interface WatchlistItemRow {
  id: string;
  watchlist_id: string;
  item_type: WatchlistItemType;
  entity_id: string | null;
  jurisdiction_code: string | null;
  sector: string | null;
  keyword: string | null;
  doc_type: string | null;
  source_id: string | null;
  created_at: string;
}

export interface WatchlistRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  visibility: "organization" | "private";
  notify_frequency: "none" | "daily" | "weekly";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MemberRow {
  user_id: string;
  role: OrgRole;
  created_at: string;
  full_name: string | null;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AuditRow {
  id: number;
  actor_id: string | null;
  action: "insert" | "update" | "delete";
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}
