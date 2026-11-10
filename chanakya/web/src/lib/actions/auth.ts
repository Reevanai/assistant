"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/domain/routes";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { echo, type ActionState } from "./result";

export async function signIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["email"]);
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    // Do not distinguish "no such user" from "wrong password".
    return { ok: false, values, message: error.code === "email_not_confirmed" ? "Confirm your email address first." : "Invalid email or password." };
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["fullName", "email"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const { siteUrl } = getPublicEnv();
  const next = safeNextPath(parsed.data.next, "/onboarding");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, values, message: error.code === "weak_password" ? error.message : "Could not create account. Try again or sign in." };
  if (data.session) redirect(next); // email confirmation disabled in this project
  return { ok: true, message: "Check your inbox to confirm your email address, then sign in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
