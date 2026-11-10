"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseLayout } from "@/lib/domain/layout";
import { layoutSchema } from "@/lib/validation/schemas";

export async function saveCommandLayout(input: { orgId: string; orgSlug: string; hidden: string[] }) {
  const parsed = layoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const layout = parseLayout({ hidden: parsed.data.hidden }); // drop unknown panel ids
  const { error } = await supabase
    .from("user_workspace_prefs")
    .upsert({ user_id: user.id, org_id: parsed.data.orgId, layout }, { onConflict: "user_id,org_id" });
  if (!error) revalidatePath(`/o/${input.orgSlug}/command`);
  return { ok: !error };
}
