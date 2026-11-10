import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOrgRole } from "@/lib/domain/roles";
import type { Organization, OrgContext } from "@/lib/domain/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Organisations the user belongs to, with their role. RLS limits rows to own memberships. */
export const getMyOrganizations = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations!inner(id, slug, name, edition, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load organisations: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const org = row.organizations as unknown as Organization | null;
    return org && isOrgRole(row.role) ? [{ org, role: row.role }] : [];
  });
});

/** Resolve the org from the URL slug and the caller's role. 404s if not a member. */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext> => {
  const user = await requireUser();
  const memberships = await getMyOrganizations();
  const match = memberships.find((m) => m.org.slug === slug);
  if (!match) notFound();
  return { org: match.org, role: match.role, userId: user.id, email: user.email ?? null };
});

export async function getDefaultOrgSlug(): Promise<string | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, memberships] = await Promise.all([
    supabase.from("profiles").select("default_org_id").eq("id", user.id).maybeSingle(),
    getMyOrganizations(),
  ]);
  const preferred = memberships.find((m) => m.org.id === profile?.default_org_id);
  return (preferred ?? memberships[0])?.org.slug ?? null;
}
