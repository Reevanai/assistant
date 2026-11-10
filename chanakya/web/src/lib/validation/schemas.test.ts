import { describe, expect, it } from "vitest";
import { createOrgSchema, inviteSchema, signUpSchema, watchlistItemColumns, watchlistItemSchema } from "./schemas";

const ids = { watchlistId: "8f9c6f0e-6a7e-4b8a-9a43-0d4d6a3e5f10", orgId: "1d2c3b4a-5e6f-4a7b-8c9d-0e1f2a3b4c5d", orgSlug: "acme" };

describe("watchlist item validation", () => {
  it("maps each type onto exactly one column (mirrors DB CHECK)", () => {
    const parsed = watchlistItemSchema.parse({ ...ids, itemType: "jurisdiction", value: "IN-KA" });
    expect(watchlistItemColumns(parsed)).toEqual({ watchlist_id: ids.watchlistId, org_id: ids.orgId, item_type: "jurisdiction", jurisdiction_code: "IN-KA" });
    expect(watchlistItemColumns(watchlistItemSchema.parse({ ...ids, itemType: "keyword", value: "  net metering " })))
      .toMatchObject({ keyword: "net metering" });
  });
  it("rejects malformed values", () => {
    expect(watchlistItemSchema.safeParse({ ...ids, itemType: "jurisdiction", value: "Karnataka" }).success).toBe(false);
    expect(watchlistItemSchema.safeParse({ ...ids, itemType: "doc_type", value: "tweet" }).success).toBe(false);
    expect(watchlistItemSchema.safeParse({ ...ids, itemType: "source", value: "not-a-uuid" }).success).toBe(false);
    expect(watchlistItemSchema.safeParse({ ...ids, itemType: "bogus", value: "x" }).success).toBe(false);
  });
});

describe("account and org validation", () => {
  it("requires strong passwords", () => {
    expect(signUpSchema.safeParse({ fullName: "A B", email: "a@b.test", password: "short1" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A B", email: "a@b.test", password: "longenoughpassword" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A B", email: "a@b.test", password: "longenough123" }).success).toBe(true);
  });
  it("normalises org slugs", () => {
    expect(createOrgSchema.parse({ name: "Acme", slug: " Acme-IN " }).slug).toBe("acme-in");
    expect(createOrgSchema.safeParse({ name: "Acme", slug: "a" }).success).toBe(false);
  });
  it("never allows inviting an owner", () => {
    expect(inviteSchema.safeParse({ orgId: ids.orgId, orgSlug: "acme", email: "x@y.test", role: "owner" }).success).toBe(false);
    expect(inviteSchema.safeParse({ orgId: ids.orgId, orgSlug: "acme", email: "x@y.test", role: "admin" }).success).toBe(true);
  });
});
