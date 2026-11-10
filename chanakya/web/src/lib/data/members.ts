import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvitationRow, MemberRow } from "@/lib/domain/types";

export async function getMembers(orgId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("org_id", orgId)
    .order("created_at");
  if (error) throw new Error(`members: ${error.message}`);
  const ids = (data ?? []).map((m) => m.user_id as string);
  const { data: profiles, error: pErr } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [], error: null };
  if (pErr) throw new Error(`profiles: ${pErr.message}`);
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  return (data ?? []).map((m) => ({ ...(m as Omit<MemberRow, "full_name">), full_name: names.get(m.user_id as string) ?? null }));
}

/** Returns [] for non-admins (RLS hides invitations from them). */
export async function getPendingInvitations(orgId: string): Promise<InvitationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, email, role, expires_at, accepted_at, created_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`invitations: ${error.message}`);
  return (data ?? []) as InvitationRow[];
}
