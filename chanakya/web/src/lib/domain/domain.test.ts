import { describe, expect, it } from "vitest";
import { safeNextPath, isPublicPath } from "./routes";
import { assignableRoles, can, invitableRoles, isOrgRole } from "./roles";
import { formatDate, formatRelative, shortJurisdiction } from "./format";
import { isValidOrgSlug, slugify } from "./slug";
import { parseLayout, isPanelVisible } from "./layout";
import { describeAudit } from "./audit";
import { chordTarget } from "./modules";

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/o/acme/command?x=1")).toBe("/o/acme/command?x=1");
  });
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "o/acme", "/a\r\nSet-Cookie:x"])(
    "rejects %s", (v) => expect(safeNextPath(v, "/fallback")).toBe("/fallback"),
  );
  it("falls back on empty", () => expect(safeNextPath(null)).toBe("/"));
});

describe("isPublicPath", () => {
  it("treats auth pages as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/invite/abc")).toBe(true);
  });
  it("protects the workspace", () => {
    expect(isPublicPath("/o/acme/command")).toBe(false);
    expect(isPublicPath("/onboarding")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});

describe("roles (mirror of database rules)", () => {
  it("validates role strings", () => {
    expect(isOrgRole("analyst")).toBe(true);
    expect(isOrgRole("superuser")).toBe(false);
  });
  it("only owners can assign owner", () => {
    expect(assignableRoles("owner", "viewer")).toContain("owner");
    expect(assignableRoles("admin", "viewer")).not.toContain("owner");
  });
  it("admins cannot modify owners; analysts cannot modify anyone", () => {
    expect(assignableRoles("admin", "owner")).toEqual([]);
    expect(assignableRoles("analyst", "viewer")).toEqual([]);
  });
  it("never offers owner in invitations", () => {
    expect(invitableRoles("owner")).not.toContain("owner");
    expect(invitableRoles("viewer")).toEqual([]);
  });
  it("viewers are read-only", () => {
    expect(can.createWatchlist("viewer")).toBe(false);
    expect(can.createWatchlist("researcher")).toBe(true);
    expect(can.editOrgWatchlists("researcher")).toBe(false);
  });
});

describe("format", () => {
  it("formats Postgres dates without timezone drift", () => {
    expect(formatDate("2026-01-01")).toBe("01 Jan 2026");
    expect(formatDate(null)).toBe("—");
  });
  it("formats relative time", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    expect(formatRelative("2026-11-09T11:58:00Z", now)).toBe("2m ago");
    expect(formatRelative("2026-11-08T12:00:00Z", now)).toBe("1d ago");
    expect(formatRelative(null, now)).toBe("never");
  });
  it("abbreviates jurisdictions", () => {
    expect(shortJurisdiction("IN-KA")).toBe("KA");
    expect(shortJurisdiction(null)).toBe("Central");
    expect(shortJurisdiction("IN")).toBe("Central");
  });
});

describe("slug", () => {
  it("slugifies names to DB-valid slugs", () => {
    const s = slugify("Ācme Public Affairs (India) Pvt. Ltd.");
    expect(s).toBe("acme-public-affairs-india-pvt-ltd");
    expect(isValidOrgSlug(s)).toBe(true);
  });
  it("rejects invalid slugs", () => {
    expect(isValidOrgSlug("ab")).toBe(false);
    expect(isValidOrgSlug("-abc")).toBe(false);
    expect(isValidOrgSlug("Abc")).toBe(false);
  });
  it("keeps slugs within 48 chars without trailing hyphen", () => {
    const s = slugify("a".repeat(47) + " b c d");
    expect(s.length).toBeLessThanOrEqual(48);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("layout prefs", () => {
  it("ignores malformed or unknown values", () => {
    expect(parseLayout(null)).toEqual({ hidden: [] });
    expect(parseLayout({ hidden: "x" })).toEqual({ hidden: [] });
    expect(parseLayout({ hidden: ["activity", "bogus", 3, "activity"] })).toEqual({ hidden: ["activity"] });
  });
  it("reports visibility", () => {
    const l = parseLayout({ hidden: ["tracked"] });
    expect(isPanelVisible(l, "tracked")).toBe(false);
    expect(isPanelVisible(l, "developments")).toBe(true);
  });
});

describe("describeAudit", () => {
  it("describes role changes", () => {
    expect(describeAudit({ action: "update", table_name: "organization_members", old_data: { role: "analyst" }, new_data: { role: "admin" } }))
      .toBe("changed a member role analyst → admin");
  });
  it("describes named records", () => {
    expect(describeAudit({ action: "insert", table_name: "watchlists", old_data: null, new_data: { name: "KA energy" } }))
      .toBe("created watchlist “KA energy”");
  });
  it("describes invitations without secrets", () => {
    expect(describeAudit({ action: "insert", table_name: "organization_invitations", old_data: null, new_data: { email: "a@b.test", role: "viewer" } }))
      .toBe("invited a@b.test as viewer");
  });
});

describe("keyboard chords", () => {
  it("maps g-chords to module routes", () => {
    expect(chordTarget("c")).toBe("command");
    expect(chordTarget("W")).toBe("watchlists");
    expect(chordTarget("z")).toBeNull();
  });
});
