-- CHANAKYA · Migration 0500 · Audit log (append-only for clients)

create table public.audit_log (
  id          bigint generated always as identity primary key,
  org_id      uuid references public.organizations (id) on delete cascade,
  actor_id    uuid,                      -- auth.uid() at time of change; null = system/service
  action      text not null check (action in ('insert', 'update', 'delete')),
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (org_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

-- Generic row-audit trigger. TG_ARGV lists keys to redact (e.g. secrets).
create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb;
  v_org uuid;
  k text;
begin
  if tg_nargs > 0 then
    foreach k in array tg_argv loop
      v_old := v_old - k;
      v_new := v_new - k;
    end loop;
  end if;
  v_row := coalesce(v_new, v_old);
  v_org := case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid
                else (v_row ->> 'org_id')::uuid end;

  -- When an organisation itself is deleted, its audit rows cascade away; skip writing.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations where id = v_org) then
    return old;
  end if;

  insert into public.audit_log (org_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (v_org, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'user_id'), v_old, v_new);
  return coalesce(new, old);
end $$;

create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function private.audit_row();
create trigger audit_organization_members after insert or update or delete on public.organization_members
  for each row execute function private.audit_row();
create trigger audit_organization_invitations after insert or update or delete on public.organization_invitations
  for each row execute function private.audit_row('token_hash');
create trigger audit_watchlists after insert or update or delete on public.watchlists
  for each row execute function private.audit_row();
create trigger audit_watchlist_items after insert or update or delete on public.watchlist_items
  for each row execute function private.audit_row();
create trigger audit_record_corrections after insert or update or delete on public.record_corrections
  for each row execute function private.audit_row();

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

create policy "admins read org audit; users read own actions" on public.audit_log
  for select to authenticated
  using (
    org_id is not null and (
      private.has_org_role(org_id, array['owner', 'admin']::public.org_role[])
      or (actor_id = (select auth.uid()) and private.is_org_member(org_id))
    )
  );
