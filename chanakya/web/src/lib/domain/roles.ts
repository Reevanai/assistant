/**
 * Role model mirrored from Postgres (public.org_role). These helpers drive UI affordances only;
 * the database (RLS + SECURITY DEFINER RPCs) is the authority and rejects anything not allowed.
 */
export const ORG_ROLES = ["owner", "admin", "analyst", "researcher", "viewer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  analyst: "Analyst",
  researcher: "Researcher",
  viewer: "Viewer",
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export const can = {
  manageMembers: (r: OrgRole) => r === "owner" || r === "admin",
  readFullAudit: (r: OrgRole) => r === "owner" || r === "admin",
  createWatchlist: (r: OrgRole) => r !== "viewer",
  editOrgWatchlists: (r: OrgRole) => r === "owner" || r === "admin" || r === "analyst",
  renameOrg: (r: OrgRole) => r === "owner" || r === "admin",
};

/** Roles the caller may assign to someone else (mirrors public.set_member_role). */
export function assignableRoles(caller: OrgRole, targetCurrent: OrgRole): OrgRole[] {
  if (caller === "owner") return [...ORG_ROLES];
  if (caller === "admin" && targetCurrent !== "owner") return ["admin", "analyst", "researcher", "viewer"];
  return [];
}

/** Roles that can be offered in an invitation (owner is never invitable). */
export function invitableRoles(caller: OrgRole): OrgRole[] {
  return can.manageMembers(caller) ? ["admin", "analyst", "researcher", "viewer"] : [];
}
