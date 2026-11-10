/** All user-facing dates are rendered in Indian Standard Time. */
export const IST = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

/** Format a Postgres `date` ("YYYY-MM-DD") without shifting it through a timezone. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
    return dateFmt.format(d);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : `${dateTimeFmt.format(d)} IST`;
}

export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 0) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(value);
}

export function formatCount(n: number | null | undefined): string {
  return typeof n === "number" ? new Intl.NumberFormat("en-IN").format(n) : "—";
}

/** "IN-KA" → "KA"; "IN" → "Central". */
export function shortJurisdiction(code: string | null | undefined): string {
  if (!code || code === "IN") return "Central";
  return code.replace(/^IN-/, "");
}
