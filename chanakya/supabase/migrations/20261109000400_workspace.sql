-- CHANAKYA · Migration 0400 · Analyst workspace (tenant plane): watchlists, layout prefs

create type public.watchlist_visibility as enum ('organization', 'private');
create type public.notify_frequency as enum ('none', 'daily', 'weekly');
create type public.watchlist_item_type as enum ('entity', 'jurisdiction', 'sector', 'keyword', 'doc_type', 'source');

create table public.watchlists (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 120),
  description       text check (description is null or char_length(description) <= 2000),
  visibility        public.watchlist_visibility not null default 'organization',
  notify_frequency  public.notify_frequency not null default 'weekly',
  created_by        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, org_id)
);
create index watchlists_org_idx on public.watchlists (org_id);
create trigger watchlists_touch before update on public.watchlists
  for each row execute function private.touch_updated_at();

create table public.watchlist_items (
  id                 uuid primary key default gen_random_uuid(),
  watchlist_id       uuid not null,
  org_id             uuid not null,
  item_type          public.watchlist_item_type not null,
  entity_id          uuid references public.entities (id) on delete cascade,
  jurisdiction_code  text references public.jurisdictions (code),
  sector             text references public.sectors (slug),
  keyword            text check (keyword is null or char_length(keyword) between 2 and 200),
  doc_type           public.doc_type,
  source_id          uuid references public.sources (id) on delete cascade,
  created_by         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at         timestamptz not null default now(),
  foreign key (watchlist_id, org_id) references public.watchlists (id, org_id) on delete cascade,
  -- exactly the column for item_type is populated
  check (
    (item_type = 'entity')       = (entity_id is not null) and
    (item_type = 'jurisdiction') = (jurisdiction_code is not null) and
    (item_type = 'sector')       = (sector is not null) and
    (item_type = 'keyword')      = (keyword is not null) and
    (item_type = 'doc_type')     = (doc_type is not null) and
    (item_type = 'source')       = (source_id is not null)
  )
);
create index watchlist_items_watchlist_idx on public.watchlist_items (watchlist_id);

create table public.user_workspace_prefs (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_id      uuid not null references public.organizations (id) on delete cascade,
  layout      jsonb not null default '{}'::jsonb check (jsonb_typeof(layout) = 'object'),
  updated_at  timestamptz not null default now(),
  primary key (user_id, org_id)
);
create trigger user_workspace_prefs_touch before update on public.user_workspace_prefs
  for each row execute function private.touch_updated_at();

-- ── Helpers ────────────────────────────────────────────────────────────────────
-- Who may edit a watchlist: its creator (if still a contributing member), or
-- owners/admins/analysts for organisation-visible watchlists.
create or replace function private.can_edit_watchlist(p_watchlist uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.watchlists w
    where w.id = p_watchlist and (
      (w.created_by = (select auth.uid())
        and private.has_org_role(w.org_id, array['owner','admin','analyst','researcher']::public.org_role[]))
      or (w.visibility = 'organization'
        and private.has_org_role(w.org_id, array['owner','admin','analyst']::public.org_role[]))
    )
  );
$$;
revoke all on function private.can_edit_watchlist(uuid) from public;
grant execute on function private.can_edit_watchlist(uuid) to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.watchlists           enable row level security;
alter table public.watchlist_items      enable row level security;
alter table public.user_workspace_prefs enable row level security;

revoke all on public.watchlists, public.watchlist_items, public.user_workspace_prefs from anon, authenticated;
grant select, insert, delete on public.watchlists, public.watchlist_items to authenticated;
grant update (name, description, visibility, notify_frequency) on public.watchlists to authenticated;
grant select, insert, update, delete on public.user_workspace_prefs to authenticated;

create policy "read visible watchlists" on public.watchlists
  for select to authenticated
  using (private.is_org_member(org_id)
         and (visibility = 'organization' or created_by = (select auth.uid())));

create policy "contributors create watchlists" on public.watchlists
  for insert to authenticated
  with check (created_by = (select auth.uid())
              and private.has_org_role(org_id, array['owner','admin','analyst','researcher']::public.org_role[]));

create policy "editors update watchlists" on public.watchlists
  for update to authenticated
  using (private.can_edit_watchlist(id))
  with check (private.has_org_role(org_id, array['owner','admin','analyst','researcher']::public.org_role[]));

create policy "editors delete watchlists" on public.watchlists
  for delete to authenticated using (private.can_edit_watchlist(id));

create policy "read items of visible watchlists" on public.watchlist_items
  for select to authenticated
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id));  -- RLS-filtered subquery

create policy "editors add items" on public.watchlist_items
  for insert to authenticated
  with check (created_by = (select auth.uid()) and private.can_edit_watchlist(watchlist_id));

create policy "editors remove items" on public.watchlist_items
  for delete to authenticated using (private.can_edit_watchlist(watchlist_id));

create policy "own layout prefs" on public.user_workspace_prefs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and private.is_org_member(org_id));

-- ── Matching (SECURITY INVOKER ⇒ caller's RLS applies to both watchlists and corpus) ─
-- A document matches a watchlist if it matches ANY of its items.
create or replace function public.watchlist_matches(p_watchlist uuid, p_since timestamptz, p_limit int default 50)
returns setof public.documents
language sql stable security invoker set search_path = '' as $$
  select d.*
  from public.documents d
  where d.first_retrieved_at >= p_since
    and exists (
      select 1 from public.watchlist_items i
      where i.watchlist_id = p_watchlist and (
           (i.item_type = 'jurisdiction' and (d.state_code = i.jurisdiction_code
              or (i.jurisdiction_code = 'IN' and d.jurisdiction_level = 'central')))
        or (i.item_type = 'sector'   and i.sector = any (d.sectors))
        or (i.item_type = 'doc_type' and d.doc_type = i.doc_type)
        or (i.item_type = 'source'   and d.source_id = i.source_id)
        or (i.item_type = 'keyword'  and d.search_tsv @@ websearch_to_tsquery('simple', i.keyword))
        or (i.item_type = 'entity'   and exists (
              select 1 from public.document_entities de
              where de.document_id = d.id and de.entity_id = i.entity_id))
      )
    )
  order by d.published_on desc nulls last, d.first_retrieved_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.watchlist_match_counts(p_org uuid, p_since timestamptz)
returns table (watchlist_id uuid, match_count bigint)
language sql stable security invoker set search_path = '' as $$
  select w.id, (select count(*) from public.watchlist_matches(w.id, p_since, 500))
  from public.watchlists w
  where w.org_id = p_org;
$$;

revoke all on function public.watchlist_matches(uuid, timestamptz, int) from public, anon;
revoke all on function public.watchlist_match_counts(uuid, timestamptz) from public, anon;
grant execute on function public.watchlist_matches(uuid, timestamptz, int) to authenticated;
grant execute on function public.watchlist_match_counts(uuid, timestamptz) to authenticated;
