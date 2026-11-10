/** Uniform result type for server actions consumed by useActionState. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, string>;
  /** Submitted non-secret values, echoed back so forms keep input after React 19's auto-reset. */
  values?: Record<string, string>;
};

/** Pick string fields from a FormData for echoing back. Never include secrets. */
export function echo(form: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = form.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export const initialActionState: ActionState = { ok: false };

/** Map Postgres / PostgREST errors to safe user-facing messages (never leak SQL). */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Unexpected error";
  switch (error.code) {
    case "23505":
      return "That already exists.";
    case "23514":
    case "22P02":
      return "Some values are not valid.";
    case "42501":
      return error.message && /privilege|owner|email/i.test(error.message)
        ? capitalise(error.message)
        : "You do not have permission to do that.";
    case "P0001":
    case "P0002":
      return capitalise(error.message ?? "Request could not be completed.");
    case "28000":
      return "Please sign in again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1) + (s.endsWith(".") ? "" : ".");
