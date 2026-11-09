"use client";
import { useActionState } from "react";
import { createWatchlist } from "@/lib/actions/watchlists";
import { initialActionState } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label, Select, Textarea } from "@/components/ui/input";

export function CreateWatchlistForm({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [state, action, pending] = useActionState(createWatchlist, initialActionState);
  return (
    <form action={action} className="space-y-3 p-3">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required maxLength={120} placeholder="e.g. Karnataka renewable energy" defaultValue={state.values?.name} />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="description">Purpose</Label>
        <Textarea id="description" name="description" maxLength={2000} defaultValue={state.values?.description} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="visibility">Visibility</Label>
          <Select id="visibility" name="visibility" defaultValue={state.values?.visibility ?? "organization"}>
            <option value="organization">Organisation</option>
            <option value="private">Only me</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="notifyFrequency">Digest</Label>
          <Select id="notifyFrequency" name="notifyFrequency" defaultValue={state.values?.notifyFrequency ?? "weekly"}>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="none">None</option>
          </Select>
        </div>
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" disabled={pending}>{pending ? "Creating…" : "Create watchlist"}</Button>
    </form>
  );
}
