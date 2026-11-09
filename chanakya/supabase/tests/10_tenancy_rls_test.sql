-- Tenancy, roles, invitations and tenant isolation.
-- Runs as superuser and switches into `authenticated` with a JWT subject per actor.
\set ON_ERROR_STOP 1

-- Helpers -------------------------------------------------------------------
create or replace function public.t_expect_error(p_sql text, p_label text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok (rejected as expected): % — %', p_label, sqlerrm;
    return;
  end;
  raise exception 'EXPECTED FAILURE DID NOT HAPPEN: %', p_label;
end $$;
grant execute on function public.t_expect_error(text, text) to authenticated, anon;

create or replace function public.t_eq(p_actual bigint, p_expected bigint, p_label text)
returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok: %', p_label;
end $$;
grant execute on function public.t_eq(bigint, bigint, text) to authenticated, anon;

-- Actors --------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-4111-8111-111111111111', 'alice@acme.test', now(), '{"full_name":"Alice Owner"}'),
  ('22222222-2222-4222-8222-222222222222', 'bob@acme.test',   now(), '{"full_name":"Bob Analyst"}'),
  ('33333333-3333-4333-8333-333333333333', 'carol@other.test', now(), '{"full_name":"Carol Outsider"}'),
  ('44444444-4444-4444-8444-444444444444', 'dave@acme.test',  now(), '{"full_name":"Dave Viewer"}'),
  ('55555555-5555-4555-8555-555555555555', 'eve@nowhere.test', now(), '{}'),
  ('66666666-6666-4666-8666-666666666666', 'unconfirmed@acme.test', null, '{}');

select public.t_eq((select count(*) from public.profiles), 6, 'profile auto-created for each user');

-- Alice creates Acme ---------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select set_config('test.org1', (public.create_organization('Acme Public Affairs', 'acme')).id::text, false);
select public.t_eq((select count(*) from public.organization_members where role = 'owner'), 1, 'alice is owner');
select public.t_eq((select count(*) from public.profiles where default_org_id is not null and id = auth.uid()), 1, 'default org set');
select public.t_expect_error($$ select public.create_organization('Bad', 'Has Spaces') $$, 'invalid slug');
select public.t_expect_error($$ select public.create_organization('Dup', 'acme') $$, 'duplicate slug');

-- Invite Bob (analyst), Dave (viewer), and an unconfirmed user
select token as bob_token from public.create_invitation(current_setting('test.org1')::uuid, 'Bob@Acme.test', 'analyst') \gset
select token as dave_token from public.create_invitation(current_setting('test.org1')::uuid, 'dave@acme.test', 'viewer') \gset
select token as unconf_token from public.create_invitation(current_setting('test.org1')::uuid, 'unconfirmed@acme.test', 'viewer') \gset
select public.t_expect_error($$ select public.create_invitation(current_setting('test.org1')::uuid, 'x@acme.test', 'owner') $$, 'cannot invite as owner');
select public.t_eq((select count(*) from public.organization_invitations), 3, 'admin sees invitations');

-- Carol creates Other --------------------------------------------------------
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
select set_config('test.org2', (public.create_organization('Other Org', 'other-org')).id::text, false);
select public.t_eq((select count(*) from public.organizations), 1, 'carol sees only her org');
select public.t_eq((select count(*) from public.organization_members where org_id = current_setting('test.org1')::uuid), 0, 'carol cannot see acme members');
select public.t_eq((select count(*) from public.organization_invitations), 0, 'carol cannot see acme invitations');
select public.t_eq((select count(*) from public.profiles), 1, 'carol sees only own profile');
-- Carol tries to use Bob's token
select public.t_expect_error(format($$ select public.accept_invitation(%L) $$, :'bob_token'), 'token bound to invited email');
-- Carol tries to join Acme directly
select public.t_expect_error(format($$ insert into public.organization_members (org_id, user_id, role) values (%L, auth.uid(), 'owner') $$, current_setting('test.org1')), 'direct membership insert blocked');
select public.t_expect_error(format($$ select public.create_invitation(%L, 'carol2@other.test', 'admin') $$, current_setting('test.org1')), 'non-member cannot invite');
select public.t_expect_error(format($$ select public.set_member_role(%L, '11111111-1111-4111-8111-111111111111', 'viewer') $$, current_setting('test.org1')), 'non-member cannot change roles');

-- Bob & Dave accept --------------------------------------------------------
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.t_eq((select count(*) from public.organizations), 0, 'bob sees nothing before joining');
select public.accept_invitation(:'bob_token');
select public.t_expect_error(format($$ select public.accept_invitation(%L) $$, :'bob_token'), 'invitation is single-use');
select public.t_eq((select count(*) from public.organizations), 1, 'bob sees acme after joining');
select public.t_eq((select count(*) from public.organization_members where user_id = auth.uid() and role = 'analyst'), 1, 'bob is analyst');
select public.t_eq((select count(*) from public.profiles), 2, 'bob sees co-member profiles (alice + self)');
select public.t_eq((select count(*) from public.organization_invitations), 0, 'analyst cannot read invitations');
select public.t_expect_error(format($$ select public.create_invitation(%L, 'x@acme.test', 'viewer') $$, current_setting('test.org1')), 'analyst cannot invite');
select public.t_expect_error(format($$ select public.set_member_role(%L, auth.uid(), 'admin') $$, current_setting('test.org1')), 'analyst cannot self-promote');
select public.t_expect_error(format($$ update public.organization_members set role = 'owner' where user_id = auth.uid() $$), 'direct role update blocked');
update public.organizations set name = 'Hijacked' where id = current_setting('test.org1')::uuid;  -- 0 rows under RLS
select public.t_eq((select count(*) from public.organizations where name = 'Hijacked'), 0, 'analyst cannot rename org');

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);
select public.accept_invitation(:'dave_token');

select set_config('request.jwt.claim.sub', '66666666-6666-4666-8666-666666666666', false);
select public.t_expect_error(format($$ select public.accept_invitation(%L) $$, :'unconf_token'), 'unconfirmed email cannot accept');

-- Owner rules ----------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.t_expect_error(format($$ select public.set_member_role(%L, auth.uid(), 'admin') $$, current_setting('test.org1')), 'sole owner cannot demote self');
select public.t_expect_error(format($$ select public.remove_member(%L, auth.uid()) $$, current_setting('test.org1')), 'sole owner cannot leave');
select public.set_member_role(current_setting('test.org1')::uuid, '22222222-2222-4222-8222-222222222222', 'admin');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select public.t_expect_error(format($$ select public.set_member_role(%L, auth.uid(), 'owner') $$, current_setting('test.org1')), 'admin cannot grant owner');
select public.t_expect_error(format($$ select public.remove_member(%L, '11111111-1111-4111-8111-111111111111') $$, current_setting('test.org1')), 'admin cannot remove owner');
select public.t_eq((select count(*) from public.organization_invitations), 3, 'admin can now read invitations');
update public.organizations set name = 'Acme Public Affairs Ltd' where id = current_setting('test.org1')::uuid;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.set_member_role(current_setting('test.org1')::uuid, '22222222-2222-4222-8222-222222222222', 'analyst');
select public.t_eq((select count(*) from public.organization_members where org_id = current_setting('test.org1')::uuid), 3, 'acme has 3 members');

-- Audit ----------------------------------------------------------------------
select public.t_eq((select count(*) from public.audit_log where table_name = 'organization_members' and action = 'update'), 2, 'owner sees role-change audit');
select public.t_eq((select count(*) from public.audit_log where new_data ? 'token_hash' or old_data ? 'token_hash'), 0, 'token hash redacted from audit');
select public.t_expect_error($$ delete from public.audit_log $$, 'audit log not deletable');
select public.t_expect_error($$ update public.audit_log set action = 'insert' $$, 'audit log not updatable');

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
select public.t_eq((select count(*) from public.audit_log where org_id = current_setting('test.org1')::uuid), 0, 'outsider sees no acme audit');

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', false);
select public.t_eq((select count(*) from public.audit_log where actor_id <> auth.uid()), 0, 'viewer sees only own audit rows');

-- Anonymous ------------------------------------------------------------------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.t_expect_error($$ select count(*) from public.organizations $$, 'anon cannot read organizations');
select public.t_expect_error($$ select public.create_organization('Anon', 'anon-org') $$, 'anon cannot create org');
reset role;
