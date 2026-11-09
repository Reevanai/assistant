-- Corpus read-only access, provenance constraints, watchlists and matching.
-- Depends on actors/orgs from 10_tenancy_rls_test.sql and the demo seed.
\set ON_ERROR_STOP 1

select set_config('test.org1', (select id::text from public.organizations where slug = 'acme'), false);
select set_config('test.org2', (select id::text from public.organizations where slug = 'other-org'), false);

-- Constraint checks (as superuser / service role) ------------------------------
select public.t_expect_error($$
  insert into public.relationships (source_entity_id, target_entity_id, relationship_type,
    assertion_kind, evidence_quality, confidence, verification_status, verified_at)
  values ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000e002',
    'related_to', 'inferred', 'inferred', 0.4, 'verified', now()) $$,
  'inferred relationship cannot be verified');
select public.t_expect_error($$
  insert into public.relationships (source_entity_id, target_entity_id, relationship_type,
    assertion_kind, evidence_quality, confidence)
  values ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000e002',
    'related_to', 'documented', 'primary_official', 0.9) $$,
  'documented relationship requires evidence');
select public.t_expect_error($$
  insert into public.relationships (source_entity_id, target_entity_id, relationship_type,
    assertion_kind, evidence_quality, confidence)
  values ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000e002',
    'related_to', 'documented', 'inferred', 0.9) $$,
  'inferred evidence quality must be an inferred assertion');
insert into public.relationships (source_entity_id, target_entity_id, relationship_type,
  assertion_kind, evidence_quality, confidence, evidence_document_id, is_demo)
values ('00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000e002',
  'related_to', 'documented', 'primary_official', 0.9, '00000000-0000-4000-8000-00000000a001', true);
select public.t_expect_error($$
  insert into public.entities (entity_type, canonical_name) values ('person', 'Someone') $$,
  'person entity requires a documented public capacity');
select public.t_expect_error($$
  update public.sources set is_active = true where slug = 'egazette-india' $$,
  'source cannot be activated before licence review');
select public.t_expect_error($$
  insert into public.document_versions (document_id, version_no, content_sha256)
  select document_id, 2, content_sha256 from public.document_versions limit 1 $$,
  'identical content never creates a new version');

-- Corpus visibility ----------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);  -- eve: no org
select public.t_eq((select count(*) from public.documents), 0, 'user without org sees no corpus');
select public.t_eq((select count(*) from public.jurisdictions), 37, 'reference jurisdictions readable');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);  -- bob
select public.t_eq((select count(*) from public.documents where is_demo), 6, 'member sees demo corpus');
select public.t_eq((select (public.corpus_stats() ->> 'documents')::bigint), 6, 'corpus_stats counts');
select public.t_eq((select count(*) from public.source_status), 8, 'source_status view lists sources');
select public.t_expect_error($$ insert into public.documents (source_id, external_id, title, jurisdiction_level, source_url)
  values ('00000000-0000-4000-8000-00000000d001', 'X', 'Injected', 'central', 'https://x.invalid') $$, 'tenant cannot write corpus');
select public.t_expect_error($$ update public.documents set title = 'Tampered' $$, 'tenant cannot edit corpus');
select public.t_expect_error($$ delete from public.relationships $$, 'tenant cannot delete corpus');

-- Watchlists -----------------------------------------------------------------
insert into public.watchlists (org_id, name) values (current_setting('test.org1')::uuid, 'Karnataka renewables');
insert into public.watchlists (org_id, name, visibility) values (current_setting('test.org1')::uuid, 'Bob private', 'private');
select set_config('test.wl', (select id::text from public.watchlists where name = 'Karnataka renewables'), false);
insert into public.watchlist_items (watchlist_id, org_id, item_type, sector)
  values (current_setting('test.wl')::uuid, current_setting('test.org1')::uuid, 'sector', 'renewable_energy');
insert into public.watchlist_items (watchlist_id, org_id, item_type, keyword)
  values (current_setting('test.wl')::uuid, current_setting('test.org1')::uuid, 'keyword', 'setback');
select public.t_expect_error(format($$ insert into public.watchlist_items (watchlist_id, org_id, item_type, sector, keyword)
  values (%L, %L, 'sector', 'energy', 'extra') $$, current_setting('test.wl'), current_setting('test.org1')), 'item must populate exactly one target');
select public.t_expect_error(format($$ insert into public.watchlist_items (watchlist_id, org_id, item_type, sector)
  values (%L, %L, 'sector', 'energy') $$, current_setting('test.wl'), current_setting('test.org2')), 'item org must match watchlist org');

-- sector renewable_energy → a001, a004 ; keyword setback → a002
select public.t_eq((select count(*) from public.watchlist_matches(current_setting('test.wl')::uuid, now() - interval '30 days')), 3, 'watchlist matches (sector OR keyword)');
select public.t_eq((select count(*) from public.watchlist_matches(current_setting('test.wl')::uuid, now() - interval '5 days')), 1, 'watchlist matches respect since');
select public.t_eq((select match_count from public.watchlist_match_counts(current_setting('test.org1')::uuid, now() - interval '30 days') where watchlist_id = current_setting('test.wl')::uuid), 3, 'match counts');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);  -- alice (owner)
select public.t_eq((select count(*) from public.watchlists), 1, 'owner does not see others'' private watchlists');
update public.watchlists set description = 'Edited by owner' where id = current_setting('test.wl')::uuid;
select public.t_eq((select count(*) from public.watchlists where description = 'Edited by owner'), 1, 'owner edits org watchlist');

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);  -- dave (viewer)
select public.t_eq((select count(*) from public.watchlists), 1, 'viewer reads org watchlists');
select public.t_eq((select count(*) from public.watchlist_items), 2, 'viewer reads items');
select public.t_expect_error(format($$ insert into public.watchlists (org_id, name) values (%L, 'nope') $$, current_setting('test.org1')), 'viewer cannot create watchlist');
update public.watchlists set name = 'viewer edit' where id = current_setting('test.wl')::uuid;   -- silently 0 rows under RLS
select public.t_eq((select count(*) from public.watchlists where name = 'viewer edit'), 0, 'viewer cannot edit watchlist');
delete from public.watchlist_items;
select public.t_eq((select count(*) from public.watchlist_items), 2, 'viewer cannot delete items');

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);  -- carol (other org)
select public.t_eq((select count(*) from public.watchlists), 0, 'outsider sees no acme watchlists');
select public.t_eq((select count(*) from public.watchlist_items), 0, 'outsider sees no acme items');
select public.t_eq((select count(*) from public.watchlist_matches(current_setting('test.wl')::uuid, now() - interval '30 days')), 0, 'outsider gets no matches via RPC');
select public.t_expect_error(format($$ insert into public.watchlist_items (watchlist_id, org_id, item_type, sector)
  values (%L, %L, 'sector', 'energy') $$, current_setting('test.wl'), current_setting('test.org1')), 'outsider cannot add items');
select public.t_expect_error(format($$ insert into public.user_workspace_prefs (org_id, layout) values (%L, '{}') $$, current_setting('test.org1')), 'cannot store prefs for foreign org');
insert into public.user_workspace_prefs (org_id, layout) values (current_setting('test.org2')::uuid, '{"hidden":["activity"]}');
select public.t_eq((select count(*) from public.user_workspace_prefs), 1, 'own prefs stored');

-- Corrections ---------------------------------------------------------------
insert into public.record_corrections (org_id, target_table, target_id, description)
  values (current_setting('test.org2')::uuid, 'documents', '00000000-0000-4000-8000-00000000a001', 'Publication date appears wrong.');
select public.t_expect_error(format($$ insert into public.record_corrections (org_id, target_table, target_id, description, status)
  values (%L, 'documents', '00000000-0000-4000-8000-00000000a001', 'Self-accepting correction', 'accepted') $$, current_setting('test.org2')), 'cannot self-resolve correction');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.t_eq((select count(*) from public.record_corrections), 0, 'corrections are org-scoped');

reset role;
