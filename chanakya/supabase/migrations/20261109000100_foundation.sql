-- CHANAKYA · Migration 0100 · Foundation: extensions, private helper schema, shared enums
-- Targets Supabase Postgres 15+. Extensions live in the `extensions` schema (Supabase convention).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists vector   with schema extensions;

-- `private` holds SECURITY DEFINER helpers used by RLS policies. It is NOT exposed through
-- PostgREST (only `public` is), so these functions cannot be called as RPCs by clients.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ── Tenant enums ───────────────────────────────────────────────────────────────
create type public.org_role as enum ('owner', 'admin', 'analyst', 'researcher', 'viewer');
create type public.org_edition as enum ('trial', 'research', 'professional', 'enterprise');

-- ── Corpus enums ───────────────────────────────────────────────────────────────
create type public.doc_type as enum (
  'gazette_notification', 'act', 'bill', 'rule', 'policy', 'order', 'circular',
  'press_release', 'parliamentary_question', 'parliamentary_debate', 'committee_report',
  'budget_document', 'tender', 'report', 'other'
);
create type public.jurisdiction_level as enum ('central', 'state', 'local');
create type public.jurisdiction_kind as enum ('country', 'state', 'union_territory', 'district');
create type public.extraction_status as enum (
  'pending', 'extracted', 'ocr_extracted', 'needs_review', 'failed', 'not_applicable'
);
create type public.verification_status as enum (
  'unverified', 'auto_matched', 'verified', 'disputed', 'retracted'
);
create type public.license_status as enum (
  'unreviewed', 'open_license', 'permitted_with_attribution', 'restricted', 'prohibited'
);
create type public.source_kind as enum (
  'gazette', 'legislature', 'ministry_portal', 'state_portal', 'open_data_portal',
  'research_org', 'election_body', 'other'
);
create type public.run_status as enum ('queued', 'running', 'succeeded', 'partial', 'failed');

-- ── Generic updated_at trigger ─────────────────────────────────────────────────
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
