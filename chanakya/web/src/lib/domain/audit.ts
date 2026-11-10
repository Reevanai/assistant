import type { AuditRow } from "./types";

const TABLE_NOUN: Record<string, string> = {
  organizations: "organisation",
  organization_members: "member",
  organization_invitations: "invitation",
  watchlists: "watchlist",
  watchlist_items: "watchlist item",
  record_corrections: "correction request",
};

/** Human-readable one-line description of an audit event. Pure; unit tested. */
export function describeAudit(row: Pick<AuditRow, "action" | "table_name" | "old_data" | "new_data">): string {
  const noun = TABLE_NOUN[row.table_name] ?? row.table_name;
  const data = row.new_data ?? row.old_data ?? {};
  const name = typeof data.name === "string" ? ` “${data.name}”` : "";
  if (row.table_name === "organization_members" && row.action === "update") {
    const from = row.old_data?.role, to = row.new_data?.role;
    if (from !== to) return `changed a member role ${String(from)} → ${String(to)}`;
  }
  if (row.table_name === "organization_invitations" && row.action === "insert") {
    return `invited ${String(data.email ?? "a user")} as ${String(data.role ?? "member")}`;
  }
  const verb = row.action === "insert" ? "created" : row.action === "update" ? "updated" : "deleted";
  if (row.table_name === "organization_members" && row.action === "insert") return "added a member";
  if (row.table_name === "organization_members" && row.action === "delete") return "removed a member";
  return `${verb} ${noun}${name}`;
}
