-- CHANAKYA · Migration 0300 · Shared intelligence corpus
-- Written only by back-end workers (service_role, bypasses RLS) and platform curators.
-- Tenants get read-only access via private.has_corpus_access().

-- ── Reference data ─────────────────────────────────────────────────────────────
create table public.jurisdictions (
  code         text primary key check (code ~ '^IN(-[A-Z0-9]{2,3})*$'),   -- ISO 3166-2:IN style
  name         text not null,
  kind         public.jurisdiction_kind not null,
  parent_code  text references public.jurisdictions (code),
  check ((kind = 'country') = (parent_code is null))
);

create table public.sectors (
  slug   text primary key check (slug ~ '^[a-z][a-z0-9_]{1,40}$'),
  label  text not null
);

-- ── Sources & ingestion ────────────────────────────────────────────────────────
create table public.sources (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{1,60}$'),
  name               text not null,
  publisher          text not null,
  base_url           text not null check (base_url ~ '^https?://'),
  kind               public.source_kind not null,
  jurisdiction_code  text not null references public.jurisdictions (code),
  license_status     public.license_status not null default 'unreviewed',
  license_notes      text,
  terms_url          text check (terms_url is null or terms_url ~ '^https?://'),
  license_reviewed_at timestamptz,
  is_active          boolean not null default false,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- A connector may only run once a human has recorded that reuse is permitted.
  constraint sources_active_requires_license check (
    not is_active or is_demo
    or (license_status in ('open_license', 'permitted_with_attribution') and license_reviewed_at is not null)
  )
);
create trigger sources_touch before update on public.sources
  for each row execute function private.touch_updated_at();

create table public.ingestion_runs (
  id               uuid primary key default gen_random_uuid(),
  source_id        uuid not null references public.sources (id) on delete cascade,
  status           public.run_status not null default 'queued',
  started_at       timestamptz,
  finished_at      timestamptz,
  items_discovered integer not null default 0 check (items_discovered >= 0),
  items_new        integer not null default 0 check (items_new >= 0),
  items_changed    integer not null default 0 check (items_changed >= 0),
  items_failed     integer not null default 0 check (items_failed >= 0),
  error_message    text,
  worker_version   text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);
create index ingestion_runs_source_created_idx on public.ingestion_runs (source_id, created_at desc);

-- ── Documents ──────────────────────────────────────────────────────────────────
create table public.documents (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid not null references public.sources (id) on delete restrict,
  external_id          text not null,                -- publisher's identifier (gazette no., bill no., …)
  title                text not null,
  doc_type             public.doc_type not null default 'other',
  jurisdiction_level   public.jurisdiction_level not null,
  state_code           text references public.jurisdictions (code),
  issuing_body         text,                          -- as printed on the document
  language             text not null default 'en',
  published_on         date,                          -- date printed by the publisher
  effective_on         date,                          -- only when stated in the document
  source_url           text not null check (source_url ~ '^https?://'),
  first_retrieved_at   timestamptz not null default now(),
  last_checked_at      timestamptz not null default now(),
  current_version_id   uuid,
  extraction_status    public.extraction_status not null default 'pending',
  verification_status  public.verification_status not null default 'unverified',
  license_note         text,
  sectors              text[] not null default '{}',
  summary              text,                          -- machine-generated; always labelled in UI
  summary_model        text,
  summary_generated_at timestamptz,
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  search_tsv           tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(issuing_body, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'C')
  ) stored,
  unique (source_id, external_id),
  check ((jurisdiction_level = 'central') = (state_code is null or state_code = 'IN')),
  check ((summary is null) = (summary_model is null))
);
create index documents_published_idx   on public.documents (published_on desc nulls last);
create index documents_retrieved_idx   on public.documents (first_retrieved_at desc);
create index documents_state_idx       on public.documents (state_code);
create index documents_type_idx        on public.documents (doc_type);
create index documents_sectors_idx     on public.documents using gin (sectors);
create index documents_search_idx      on public.documents using gin (search_tsv);
create index documents_title_trgm_idx  on public.documents using gin (title extensions.gin_trgm_ops);
create trigger documents_touch before update on public.documents
  for each row execute function private.touch_updated_at();

create table public.document_versions (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents (id) on delete cascade,
  version_no        integer not null check (version_no >= 1),
  content_sha256    text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path      text,                    -- private Storage bucket object key
  mime_type         text,
  byte_size         bigint check (byte_size is null or byte_size >= 0),
  retrieved_at      timestamptz not null default now(),
  fetched_url       text check (fetched_url is null or fetched_url ~ '^https?://'),
  extraction_status public.extraction_status not null default 'pending',
  text_content      text,
  page_count        integer check (page_count is null or page_count >= 0),
  change_summary    text,                    -- diff summary vs previous version (machine-generated)
  created_at        timestamptz not null default now(),
  unique (document_id, version_no),
  unique (document_id, content_sha256)
);

alter table public.documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references public.document_versions (id)
  on delete set null deferrable initially deferred;

create table public.document_chunks (
  id               uuid primary key default gen_random_uuid(),
  version_id       uuid not null references public.document_versions (id) on delete cascade,
  document_id      uuid not null references public.documents (id) on delete cascade,
  chunk_index      integer not null check (chunk_index >= 0),
  content          text not null,
  page_from        integer,
  page_to          integer,
  token_count      integer,
  embedding        extensions.vector(1536),
  embedding_model  text,
  tsv              tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at       timestamptz not null default now(),
  unique (version_id, chunk_index),
  check (page_to is null or page_from is null or page_to >= page_from),
  check ((embedding is null) = (embedding_model is null))
);
create index document_chunks_document_idx on public.document_chunks (document_id);
create index document_chunks_tsv_idx      on public.document_chunks using gin (tsv);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- ── Entities & relationships ───────────────────────────────────────────────────
create type public.entity_type as enum (
  'person', 'political_party', 'ministry', 'department', 'public_institution', 'company',
  'public_project', 'policy', 'legislative_instrument', 'constituency', 'legislature'
);
create type public.document_link_type as enum ('issued_by', 'mentions', 'about', 'amends', 'supersedes');
create type public.relationship_type as enum (
  'member_of', 'represents', 'minister_of', 'heads', 'part_of', 'administers', 'issued',
  'implements', 'awarded_contract', 'executes', 'located_in', 'amends', 'supersedes', 'related_to'
);
create type public.assertion_kind as enum ('documented', 'inferred');
create type public.evidence_quality as enum (
  'primary_official',      -- the official record itself (gazette, Lok Sabha record, ECI affidavit)
  'secondary_reputable',   -- e.g. PRS analysis citing the primary
  'derived',               -- computed from primary data by a documented method
  'inferred'               -- analytical hypothesis; never presented as fact
);

create table public.entities (
  id                   uuid primary key default gen_random_uuid(),
  entity_type          public.entity_type not null,
  canonical_name       text not null,
  aliases              text[] not null default '{}',
  description          text,
  -- People are profiled ONLY in a documented public capacity (MP, MLA, minister, official).
  public_capacity      text,
  state_code           text references public.jurisdictions (code),
  attributes           jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  verification_status  public.verification_status not null default 'unverified',
  last_verified_at     timestamptz,
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (entity_type <> 'person' or public_capacity is not null),
  check (verification_status <> 'verified' or last_verified_at is not null)
);
create index entities_type_idx on public.entities (entity_type);
create index entities_name_trgm_idx on public.entities using gin (canonical_name extensions.gin_trgm_ops);
create trigger entities_touch before update on public.entities
  for each row execute function private.touch_updated_at();

create table public.entity_sources (
  id           uuid primary key default gen_random_uuid(),
  entity_id    uuid not null references public.entities (id) on delete cascade,
  document_id  uuid references public.documents (id) on delete set null,
  source_url   text check (source_url is null or source_url ~ '^https?://'),
  claim        text not null,                -- which attribute this evidences
  retrieved_at timestamptz not null default now(),
  check (document_id is not null or source_url is not null)
);

create table public.document_entities (
  document_id          uuid not null references public.documents (id) on delete cascade,
  entity_id            uuid not null references public.entities (id) on delete cascade,
  link_type            public.document_link_type not null,
  verification_status  public.verification_status not null default 'unverified',
  created_at           timestamptz not null default now(),
  primary key (document_id, entity_id, link_type)
);
create index document_entities_entity_idx on public.document_entities (entity_id);

create table public.relationships (
  id                    uuid primary key default gen_random_uuid(),
  source_entity_id      uuid not null references public.entities (id) on delete cascade,
  target_entity_id      uuid not null references public.entities (id) on delete cascade,
  relationship_type     public.relationship_type not null,
  valid_from            date,
  valid_to              date,
  assertion_kind        public.assertion_kind not null default 'documented',
  evidence_quality      public.evidence_quality not null,
  confidence            numeric(3, 2) not null check (confidence between 0 and 1),
  evidence_document_id  uuid references public.documents (id) on delete set null,
  evidence_url          text check (evidence_url is null or evidence_url ~ '^https?://'),
  evidence_excerpt      text,
  verification_status   public.verification_status not null default 'unverified',
  verified_at           timestamptz,
  is_demo               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (source_entity_id <> target_entity_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  -- Never present an inference as an established fact:
  check ((assertion_kind = 'inferred') = (evidence_quality = 'inferred')),
  check (verification_status <> 'verified' or (
    assertion_kind = 'documented'
    and (evidence_document_id is not null or evidence_url is not null)
    and verified_at is not null
  )),
  check (assertion_kind = 'inferred' or evidence_document_id is not null or evidence_url is not null)
);
create index relationships_source_idx on public.relationships (source_entity_id);
create index relationships_target_idx on public.relationships (target_entity_id);
create trigger relationships_touch before update on public.relationships
  for each row execute function private.touch_updated_at();

-- ── Curation ───────────────────────────────────────────────────────────────────
create table public.platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create type public.correction_status as enum ('open', 'accepted', 'rejected');
create table public.record_corrections (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  submitted_by     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_table     text not null check (target_table in ('documents', 'entities', 'relationships', 'document_entities')),
  target_id        uuid not null,
  description      text not null check (char_length(description) between 10 and 4000),
  evidence_url     text check (evidence_url is null or evidence_url ~ '^https?://'),
  status           public.correction_status not null default 'open',
  resolution_note  text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index record_corrections_org_idx on public.record_corrections (org_id, created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.jurisdictions      enable row level security;
alter table public.sectors            enable row level security;
alter table public.sources            enable row level security;
alter table public.ingestion_runs     enable row level security;
alter table public.documents          enable row level security;
alter table public.document_versions  enable row level security;
alter table public.document_chunks    enable row level security;
alter table public.entities           enable row level security;
alter table public.entity_sources     enable row level security;
alter table public.document_entities  enable row level security;
alter table public.relationships      enable row level security;
alter table public.platform_admins    enable row level security;
alter table public.record_corrections enable row level security;

revoke all on public.jurisdictions, public.sectors, public.sources, public.ingestion_runs,
  public.documents, public.document_versions, public.document_chunks, public.entities,
  public.entity_sources, public.document_entities, public.relationships,
  public.platform_admins, public.record_corrections from anon;

-- Read-only corpus for entitled tenants. Note: no INSERT/UPDATE/DELETE grants or policies.
revoke insert, update, delete, truncate on public.jurisdictions, public.sectors, public.sources,
  public.ingestion_runs, public.documents, public.document_versions, public.document_chunks,
  public.entities, public.entity_sources, public.document_entities, public.relationships,
  public.platform_admins from authenticated;
revoke all on public.record_corrections from authenticated;
grant select on public.jurisdictions, public.sectors, public.sources, public.ingestion_runs,
  public.documents, public.document_versions, public.document_chunks, public.entities,
  public.entity_sources, public.document_entities, public.relationships to authenticated;

create policy "reference data readable" on public.jurisdictions for select to authenticated using (true);
create policy "reference data readable" on public.sectors       for select to authenticated using (true);

create policy "corpus readable" on public.sources           for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.ingestion_runs    for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.documents         for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.document_versions for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.document_chunks   for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.entities          for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.entity_sources    for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.document_entities for select to authenticated using (private.has_corpus_access());
create policy "corpus readable" on public.relationships     for select to authenticated using (private.has_corpus_access());

grant select, insert on public.record_corrections to authenticated;
create policy "members read org corrections" on public.record_corrections
  for select to authenticated using (private.is_org_member(org_id));
create policy "members submit corrections" on public.record_corrections
  for insert to authenticated
  with check (private.is_org_member(org_id) and submitted_by = (select auth.uid())
              and status = 'open' and resolved_at is null and resolution_note is null);

-- ── Read RPCs (SECURITY INVOKER ⇒ RLS applies) ─────────────────────────────────
create or replace function public.corpus_stats()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'documents',        (select count(*) from public.documents),
    'demo_documents',   (select count(*) from public.documents where is_demo),
    'versions',         (select count(*) from public.document_versions),
    'entities',         (select count(*) from public.entities),
    'sources_total',    (select count(*) from public.sources),
    'sources_active',   (select count(*) from public.sources where is_active),
    'last_run_at',      (select max(coalesce(finished_at, started_at, created_at)) from public.ingestion_runs),
    'last_document_at', (select max(first_retrieved_at) from public.documents)
  );
$$;
revoke all on function public.corpus_stats() from public, anon;
grant execute on function public.corpus_stats() to authenticated;

-- Latest run per source, for the ingestion-status panel.
create or replace view public.source_status
with (security_invoker = true) as
select s.id, s.slug, s.name, s.publisher, s.kind, s.jurisdiction_code, s.license_status,
       s.is_active, s.is_demo,
       r.status as last_run_status, r.started_at as last_run_started_at,
       r.finished_at as last_run_finished_at, r.items_new as last_run_items_new,
       r.items_changed as last_run_items_changed, r.items_failed as last_run_items_failed,
       r.error_message as last_run_error,
       (select count(*) from public.documents d where d.source_id = s.id) as document_count
from public.sources s
left join lateral (
  select * from public.ingestion_runs ir where ir.source_id = s.id
  order by ir.created_at desc limit 1
) r on true;
revoke all on public.source_status from anon;
grant select on public.source_status to authenticated;
