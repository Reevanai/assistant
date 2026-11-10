"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { orgPath } from "@/lib/domain/routes";
import { createOrgSchema, fieldErrors, inviteSchema, removeMemberSchema, setRoleSchema } from "@/lib/validation/schemas";
import { dbErrorMessage, echo, type ActionState } from "./result";

export async function createOrganization(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["name", "slug"]);
  const parsed = createOrgSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: parsed.data.name, p_slug: parsed.data.slug });
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: "That workspace URL is taken" }, values };
    return { ok: false, message: dbErrorMessage(error), values };
  }
  redirect(orgPath((data as { slug: string }).slug));
}

export async function inviteMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["email", "role"]);
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation", {
    p_org: parsed.data.orgId, p_email: parsed.data.email, p_role: parsed.data.role,
  });
  if (error) return { ok: false, message: dbErrorMessage(error), values };
  const row = (Array.isArray(data) ? data[0] : data) as { token: string } | undefined;
  if (!row?.token) return { ok: false, message: "Invitation could not be created." };
  revalidatePath(orgPath(parsed.data.orgSlug, "settings/members"));
  // Email delivery is a Milestone 4 dependency (transactional email provider). Until then the
  // admin shares this single-use link; only its hash is stored in the database.
  return {
    ok: true,
    message: `Invitation created for ${parsed.data.email}. Share this single-use link (shown once, valid 7 days):`,
    data: { link: `${getPublicEnv().siteUrl}/invite/${row.token}` },
  };
}

export async function revokeInvitation(form: FormData) {
  const id = String(form.get("invitationId") ?? "");
  const slug = String(form.get("orgSlug") ?? "");
  const supabase = await createClient();
  await supabase.from("organization_invitations").delete().eq("id", id);
  revalidatePath(orgPath(slug, "settings/members"));
}

export async function setMemberRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = setRoleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { p_org: parsed.data.orgId, p_user: parsed.data.userId, p_role: parsed.data.role });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath(orgPath(parsed.data.orgSlug, "settings/members"));
  return { ok: true, message: "Role updated." };
}

export async function removeMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = removeMemberSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_org: parsed.data.orgId, p_user: parsed.data.userId });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === parsed.data.userId) redirect("/");
  revalidatePath(orgPath(parsed.data.orgSlug, "settings/members"));
  return { ok: true, message: "Member removed." };
}

export async function acceptInvitation(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok: false, message: "This invitation link is malformed." };
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { ok: false, message: dbErrorMessage(error) };
  const { data: org } = await supabase.from("organizations").select("slug").eq("id", orgId as string).maybeSingle();
  redirect(org?.slug ? orgPath(org.slug) : "/");
}
