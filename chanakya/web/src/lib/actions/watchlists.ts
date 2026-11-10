"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { orgPath } from "@/lib/domain/routes";
import { createWatchlistSchema, fieldErrors, watchlistItemColumns, watchlistItemSchema } from "@/lib/validation/schemas";
import { dbErrorMessage, echo, type ActionState } from "./result";

export async function createWatchlist(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["name", "description", "visibility", "notifyFrequency"]);
  const parsed = createWatchlistSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .insert({
      org_id: parsed.data.orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      notify_frequency: parsed.data.notifyFrequency,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: dbErrorMessage(error), values };
  redirect(orgPath(parsed.data.orgSlug, `watchlists/${data.id}`));
}

export async function deleteWatchlist(form: FormData) {
  const id = String(form.get("watchlistId") ?? "");
  const slug = String(form.get("orgSlug") ?? "");
  const supabase = await createClient();
  const { error, count } = await supabase.from("watchlists").delete({ count: "exact" }).eq("id", id);
  if (error || !count) throw new Error(error ? dbErrorMessage(error) : "You cannot delete this watchlist.");
  revalidatePath(orgPath(slug, "watchlists"));
  redirect(orgPath(slug, "watchlists"));
}

export async function addWatchlistItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = watchlistItemSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.from("watchlist_items").insert(watchlistItemColumns(parsed.data));
  if (error) return { ok: false, message: dbErrorMessage(error) };
  revalidatePath(orgPath(parsed.data.orgSlug, `watchlists/${parsed.data.watchlistId}`));
  return { ok: true, message: "Item added." };
}

export async function removeWatchlistItem(form: FormData) {
  const id = String(form.get("itemId") ?? "");
  const slug = String(form.get("orgSlug") ?? "");
  const watchlistId = String(form.get("watchlistId") ?? "");
  const supabase = await createClient();
  await supabase.from("watchlist_items").delete().eq("id", id);
  revalidatePath(orgPath(slug, `watchlists/${watchlistId}`));
}
