import { z } from "zod";
import { ORG_ROLES } from "@/lib/domain/roles";
import { ORG_SLUG_RE } from "@/lib/domain/slug";
import { DOC_TYPES } from "@/lib/domain/labels";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
  next: z.string().optional(),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  slug: z.string().trim().toLowerCase().regex(ORG_SLUG_RE, "3–48 chars: lowercase letters, digits and hyphens"),
});

export const inviteSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(ORG_ROLES).refine((r) => r !== "owner", "Invite as admin, then promote to owner"),
});

export const setRoleSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string(),
  userId: z.string().uuid(),
  role: z.enum(ORG_ROLES),
});

export const removeMemberSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string(),
  userId: z.string().uuid(),
});

export const createWatchlistSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string(),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  visibility: z.enum(["organization", "private"]),
  notifyFrequency: z.enum(["none", "daily", "weekly"]),
});

const base = { watchlistId: z.string().uuid(), orgId: z.string().uuid(), orgSlug: z.string() };
export const watchlistItemSchema = z.discriminatedUnion("itemType", [
  z.object({ ...base, itemType: z.literal("jurisdiction"), value: z.string().regex(/^IN(-[A-Z0-9]{2,3})?$/) }),
  z.object({ ...base, itemType: z.literal("sector"), value: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/) }),
  z.object({ ...base, itemType: z.literal("keyword"), value: z.string().trim().min(2).max(200) }),
  z.object({ ...base, itemType: z.literal("doc_type"), value: z.enum(DOC_TYPES as [string, ...string[]]) }),
  z.object({ ...base, itemType: z.literal("source"), value: z.string().uuid() }),
  z.object({ ...base, itemType: z.literal("entity"), value: z.string().uuid() }),
]);
export type WatchlistItemInput = z.infer<typeof watchlistItemSchema>;

/** Map validated input onto the single populated column the DB CHECK constraint expects. */
export function watchlistItemColumns(input: WatchlistItemInput) {
  const column = {
    jurisdiction: "jurisdiction_code",
    sector: "sector",
    keyword: "keyword",
    doc_type: "doc_type",
    source: "source_id",
    entity: "entity_id",
  }[input.itemType];
  return {
    watchlist_id: input.watchlistId,
    org_id: input.orgId,
    item_type: input.itemType,
    [column]: input.value,
  };
}

export const layoutSchema = z.object({
  orgId: z.string().uuid(),
  hidden: z.array(z.string()).max(20),
});

/** Turn a zod error into { field: message } for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export const correctionSchema = z.object({
  orgId: z.string().uuid(),
  orgSlug: z.string(),
  targetId: z.string().uuid(),
  description: z.string().trim().min(10, "Describe the problem (at least 10 characters)").max(4000),
  evidenceUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/\S+$/.test(v), "Must be an http(s) URL"),
});
