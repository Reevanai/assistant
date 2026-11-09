# ADR-0001: Postgres RLS is the security boundary

**Status:** accepted (M1)

**Context:** Tenant isolation must hold even if a UI or API bug exposes a query path.

**Decision:** The web tier talks to Supabase only as the signed-in user (anon key + user JWT). Every
table has RLS enabled. Default Supabase grants are revoked and only the needed privileges are granted back.
Membership changes go through SECURITY DEFINER RPCs that encode role rules (last owner, owner-only promotion).
Policy helpers live in a non-exposed `private` schema. The service-role key is for back-end workers only.

**Consequences:** Authorisation logic sits in SQL and is covered by `supabase/tests`. The UI's role
checks (`lib/domain/roles.ts`) only hide affordances; they are not trusted.
