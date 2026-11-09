"use client";
import { useActionState, useState } from "react";
import { addWatchlistItem } from "@/lib/actions/watchlists";
import { initialActionState } from "@/lib/actions/result";
import { DOC_TYPE_LABEL } from "@/lib/domain/labels";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label, Select } from "@/components/ui/input";

type Options = {
  jurisdictions: { code: string; name: string; kind: string }[];
  sectors: { slug: string; label: string }[];
  sources: { id: string; name: string; is_demo: boolean }[];
};

export function AddItemForm({ watchlistId, orgId, orgSlug, options }: { watchlistId: string; orgId: string; orgSlug: string; options: Options }) {
  const [state, action, pending] = useActionState(addWatchlistItem, initialActionState);
  const [type, setType] = useState("jurisdiction");

  return (
    <form action={action} className="space-y-2 p-3" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="watchlistId" value={watchlistId} />
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div>
        <Label htmlFor="itemType">Type</Label>
        <Select id="itemType" name="itemType" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="jurisdiction">State / UT / Central</option>
          <option value="sector">Sector</option>
          <option value="doc_type">Document type</option>
          <option value="source">Source</option>
          <option value="keyword">Keyword / phrase</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="value">Value</Label>
        {type === "jurisdiction" ? (
          <Select id="value" name="value" defaultValue="IN-KA">
            {options.jurisdictions.map((j) => <option key={j.code} value={j.code}>{j.kind === "country" ? "Central (Government of India)" : j.name}</option>)}
          </Select>
        ) : type === "sector" ? (
          <Select id="value" name="value">{options.sectors.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}</Select>
        ) : type === "doc_type" ? (
          <Select id="value" name="value">{Object.entries(DOC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        ) : type === "source" ? (
          <Select id="value" name="value">{options.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        ) : (
          <Input id="value" name="value" required minLength={2} maxLength={200} placeholder='e.g. "net metering" or solar -wind' />
        )}
        <FieldError message={state.fieldErrors?.value} />
        {type === "keyword" ? <p className="mt-1 text-[11px] text-muted">Web-search syntax: quotes for phrases, - to exclude.</p> : null}
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" size="sm" variant="primary" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
      <p className="text-[11px] text-muted">Entity tracking becomes available with entity profiles (Milestone 3).</p>
    </form>
  );
}
