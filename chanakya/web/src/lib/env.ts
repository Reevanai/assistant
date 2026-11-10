/**
 * Public runtime configuration. Only NEXT_PUBLIC_* values are read here; the anon key is
 * designed to be public because Postgres Row Level Security is the access boundary.
 * The service-role key must never be referenced anywhere in the web app.
 */
export interface PublicEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
}

export class MissingConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `CHANAKYA is not configured: missing ${missing.join(", ")}. ` +
        "Copy web/.env.example to web/.env.local and fill in your Supabase project values.",
    );
    this.name = "MissingConfigError";
  }
}

export function getPublicEnv(): PublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length) throw new MissingConfigError(missing);
  return { supabaseUrl, supabaseAnonKey, siteUrl };
}

export function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
