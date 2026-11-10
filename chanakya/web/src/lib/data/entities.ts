import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface EntityRow {
  id: string;
  entity_type: string;
  canonical_name: string;
  aliases: string[];
  description: string | null;
  state_code: string | null;
  attributes: Record<string, unknown>;
  verification_status: string;
  is_demo: boolean;
}

export async function getEntityTypeCounts(): Promise<{ entity_type: string; n: number }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("entities").select("entity_type");
  if (error) throw new Error(`entities: ${error.message}`);
  const counts = new Map<string, number>();
  for (const r of data ?? []) counts.set(r.entity_type as string, (counts.get(r.entity_type as string) ?? 0) + 1);
  return [...counts.entries()].map(([entity_type, n]) => ({ entity_type, n })).sort((a, b) => b.n - a.n);
}

export async function listEntities(opts: { type?: string; q?: string; limit?: number }): Promise<EntityRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("entities")
    .select("id, entity_type, canonical_name, aliases, description, state_code, attributes, verification_status, is_demo")
    .order("canonical_name")
    .limit(opts.limit ?? 300);
  if (opts.type) query = query.eq("entity_type", opts.type);
  if (opts.q) query = query.ilike("canonical_name", `%${opts.q.replace(/[%_]/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`entities: ${error.message}`);
  return (data ?? []) as EntityRow[];
}
