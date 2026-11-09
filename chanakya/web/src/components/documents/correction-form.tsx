"use client";
import { useActionState, useState } from "react";
import { submitDocumentCorrection } from "@/lib/actions/corrections";
import { initialActionState } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label, Textarea } from "@/components/ui/input";

export function CorrectionForm({ orgId, orgSlug, documentId }: { orgId: string; orgSlug: string; documentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitDocumentCorrection, initialActionState);
  if (state.ok) return <div className="p-3"><FormMessage ok message={state.message} /></div>;
  if (!open) {
    return (
      <div className="p-3">
        <p className="text-[12px] text-muted">If any metadata here is inaccurate, flag it for curator review.</p>
        <Button size="sm" className="mt-2" onClick={() => setOpen(true)}>Report an inaccuracy</Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-2 p-3">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="targetId" value={documentId} />
      <div>
        <Label htmlFor="description">What is wrong?</Label>
        <Textarea id="description" name="description" required minLength={10} maxLength={4000} defaultValue={state.values?.description} />
        <FieldError message={state.fieldErrors?.description} />
      </div>
      <div>
        <Label htmlFor="evidenceUrl">Evidence URL (optional)</Label>
        <Input id="evidenceUrl" name="evidenceUrl" type="url" placeholder="https://" defaultValue={state.values?.evidenceUrl} />
        <FieldError message={state.fieldErrors?.evidenceUrl} />
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <div className="flex gap-1">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>{pending ? "Sending…" : "Submit"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
