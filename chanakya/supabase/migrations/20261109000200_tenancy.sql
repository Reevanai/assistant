-- CHANAKYA · Migration 0200 · Multi-tenant foundation
-- Organisations, memberships, roles, invitations, teams, profiles.
-- All membership mutations go through SECURITY DEFINER RPCs that enforce role rules;
-- clients have no direct INSERT/UPDATE/DELETE on organizations / organization_members.

-- ── Tables ─────────────────────────────────────────────────────────────────────
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  name        text not null check (char_length(name) between 2 and 120),
  edition     public.org_edition not null default 'trial',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organization_members (
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.org_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  full_name       text check (full_name is null or char_length(full_name) <= 120),
  default_org_id  uuid references public.organizations (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.organization_invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  email        text not null check (email = lower(email) and email like '%_@_%'),
  role         public.org_role not null default 'analyst' check (role <> 'owner'),
  token_hash   text not null unique,          -- sha256(hex) of the raw token; raw token never stored
  invited_by   uuid references auth.users (id) on delete set null,
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index organization_invitations_org_idx on public.organization_invitations (org_id);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (org_id, name),
  unique (id, org_id)
);

create table public.team_members (
  team_id  uuid not null,
  org_id   uuid not null,
  user_id  uuid not null,
  primary key (team_id, user_id),
  foreign key (team_id, org_id) references public.teams (id, org_id) on delete cascade,
  foreign key (org_id, user_id) references public.organization_members (org_id, user_id) on delete cascade
);

create trigger organizations_touch before update on public.organizations
  for each row execute function private.touch_updated_at();
create trigger organization_members_touch before update on public.organization_members
  for each row execute function private.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- ── RLS helper functions ───────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on organization_members can call them without recursion.
create or replace function private.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(p_org uuid, p_roles public.org_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = any (p_roles)
  );
$$;

create or replace function private.shares_org_with(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  );
$$;

-- Access to the shared corpus. M1: any member of any organisation.
-- M4 replaces this with per-source entitlements (organization_source_access).
create or replace function private.has_corpus_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m where m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.org_role[]) from public;
revoke all on function private.shares_org_with(uuid) from public;
revoke all on function private.has_corpus_access() from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.org_role[]) to authenticated;
grant execute on function private.shares_org_with(uuid) to authenticated;
grant execute on function private.has_corpus_access() to authenticated;

-- ── Profile bootstrap on sign-up ───────────────────────────────────────────────
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.organizations            enable row level security;
alter table public.organization_members     enable row level security;
alter table public.profiles                 enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.teams                    enable row level security;
alter table public.team_members             enable row level security;

revoke all on public.organizations, public.organization_members, public.profiles,
  public.organization_invitations, public.teams, public.team_members from anon;
-- Supabase's default privileges grant ALL to `authenticated`; start from zero and grant back
-- only what policies are written for (defence in depth on top of RLS).
revoke all on public.organizations, public.organization_members, public.profiles,
  public.organization_invitations, public.teams, public.team_members from authenticated;

grant select on public.organizations, public.organization_members, public.teams,
  public.team_members to authenticated;
grant select, update on public.profiles to authenticated;
grant select, delete on public.organization_invitations to authenticated;
grant update (name) on public.organizations to authenticated;
grant insert, delete on public.teams, public.team_members to authenticated;

create policy "members read their organisations" on public.organizations
  for select to authenticated using (private.is_org_member(id));

create policy "owners and admins rename organisation" on public.organizations
  for update to authenticated
  using (private.has_org_role(id, array['owner', 'admin']::public.org_role[]))
  with check (private.has_org_role(id, array['owner', 'admin']::public.org_role[]));

create policy "members read co-members" on public.organization_members
  for select to authenticated using (private.is_org_member(org_id));

create policy "read own and co-member profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_org_with(id));

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid())
              and (default_org_id is null or private.is_org_member(default_org_id)));

create policy "admins read invitations" on public.organization_invitations
  for select to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "admins revoke invitations" on public.organization_invitations
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "members read teams" on public.teams
  for select to authenticated using (private.is_org_member(org_id));
create policy "admins manage teams" on public.teams
  for insert to authenticated
  with check (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));
create policy "admins delete teams" on public.teams
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "members read team membership" on public.team_members
  for select to authenticated using (private.is_org_member(org_id));
create policy "admins add team members" on public.team_members
  for insert to authenticated
  with check (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));
create policy "admins remove team members" on public.team_members
  for delete to authenticated
  using (private.has_org_role(org_id, array['owner', 'admin']::public.org_role[]));

-- ── RPCs (exposed via PostgREST as /rpc/*) ─────────────────────────────────────

-- Create an organisation; caller becomes its owner.
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org public.organizations;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if (select count(*) from public.organization_members where user_id = v_uid and role = 'owner') >= 5 then
    raise exception 'organisation limit reached' using errcode = 'P0001';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (btrim(p_name), lower(btrim(p_slug)), v_uid)
  returning * into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org.id, v_uid, 'owner');

  update public.profiles set default_org_id = v_org.id
  where id = v_uid and default_org_id is null;

  return v_org;
end $$;

-- Change a member's role. Rules:
--  * only owners/admins may change roles;
--  * only owners may grant or revoke 'owner';
--  * admins cannot modify owners;
--  * an organisation must always keep at least one owner.
create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role public.org_role)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_caller_role public.org_role;
  v_target_role public.org_role;
begin
  select role into v_caller_role from public.organization_members
   where org_id = p_org and user_id = auth.uid();
  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  select role into v_target_role from public.organization_members
   where org_id = p_org and user_id = p_user for update;
  if v_target_role is null then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if (p_role = 'owner' or v_target_role = 'owner') and v_caller_role <> 'owner' then
    raise exception 'only owners can grant or change the owner role' using errcode = '42501';
  end if;

  if v_target_role = 'owner' and p_role <> 'owner' and
     (select count(*) from public.organization_members where org_id = p_org and role = 'owner') <= 1 then
    raise exception 'organisation must keep at least one owner' using errcode = 'P0001';
  end if;

  update public.organization_members set role = p_role where org_id = p_org and user_id = p_user;
end $$;

-- Remove a member (or leave, when p_user = caller).
create or replace function public.remove_member(p_org uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_caller_role public.org_role;
  v_target_role public.org_role;
begin
  select role into v_caller_role from public.organization_members
   where org_id = p_org and user_id = auth.uid();
  if v_caller_role is null then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;

  select role into v_target_role from public.organization_members
   where org_id = p_org and user_id = p_user for update;
  if v_target_role is null then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  if p_user <> auth.uid() then
    if v_caller_role not in ('owner', 'admin') then
      raise exception 'insufficient privileges' using errcode = '42501';
    end if;
    if v_target_role = 'owner' and v_caller_role <> 'owner' then
      raise exception 'only owners can remove owners' using errcode = '42501';
    end if;
  end if;

  if v_target_role = 'owner' and
     (select count(*) from public.organization_members where org_id = p_org and role = 'owner') <= 1 then
    raise exception 'organisation must keep at least one owner' using errcode = 'P0001';
  end if;

  delete from public.organization_members where org_id = p_org and user_id = p_user;
end $$;

-- Create an invitation. Returns the RAW token exactly once; only its hash is stored.
create or replace function public.create_invitation(p_org uuid, p_email text, p_role public.org_role)
returns table (invitation_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_id uuid;
begin
  if not private.has_org_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'insufficient privileges' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'invitations cannot grant owner; promote after joining' using errcode = 'P0001';
  end if;

  insert into public.organization_invitations (org_id, email, role, token_hash, invited_by)
  values (p_org, lower(btrim(p_email)), p_role,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid())
  returning id into v_id;

  return query select v_id, v_token;
end $$;

-- Accept an invitation. The signed-in user's confirmed email must match the invited email.
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.organization_invitations;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select lower(u.email) into v_email from auth.users u
   where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'a confirmed email address is required' using errcode = '42501';
  end if;

  select * into v_inv from public.organization_invitations
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;

  if v_inv.id is null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'invitation is invalid or expired' using errcode = 'P0002';
  end if;
  if v_inv.email <> v_email then
    raise exception 'invitation was issued to a different email address' using errcode = '42501';
  end if;

  insert into public.organization_members (org_id, user_id, role)
  values (v_inv.org_id, v_uid, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.organization_invitations
     set accepted_at = now(), accepted_by = v_uid
   where id = v_inv.id;

  update public.profiles set default_org_id = v_inv.org_id
   where id = v_uid and default_org_id is null;

  return v_inv.org_id;
end $$;

revoke all on function public.create_organization(text, text) from public, anon;
revoke all on function public.set_member_role(uuid, uuid, public.org_role) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
revoke all on function public.create_invitation(uuid, text, public.org_role) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, public.org_role) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.org_role) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
