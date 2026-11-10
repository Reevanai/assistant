"use server";
import { createClient } from "@/lib/supabase/server";
import { correctionSchema, fieldErrors } from "@/lib/validation/schemas";
import { dbErrorMessage, echo, type ActionState } from "./result";

/** Tenants can flag corpus records as inaccurate; platform curators resolve them (M2 curation UI). */
export async function submitDocumentCorrection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const values = echo(form, ["description", "evidenceUrl"]);
  const parsed = correctionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { error } = await supabase.from("record_corrections").insert({
    org_id: parsed.data.orgId,
    target_table: "documents",
    target_id: parsed.data.targetId,
    description: parsed.data.description,
    evidence_url: parsed.data.evidenceUrl,
  });
  if (error) return { ok: false, message: dbErrorMessage(error), values };
  return { ok: true, message: "Correction request recorded. A curator will review it against the source." };
}
