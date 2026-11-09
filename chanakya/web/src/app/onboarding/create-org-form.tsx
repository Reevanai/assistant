"use client";
import { useActionState, useState } from "react";
import { createOrganization } from "@/lib/actions/org";
import { initialActionState } from "@/lib/actions/result";
import { slugify } from "@/lib/domain/slug";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label } from "@/components/ui/input";

export function CreateOrgForm() {
  const [state, action, pending] = useActionState(createOrganization, initialActionState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="name">Organisation name</Label>
        <Input id="name" name="name" value={name} required maxLength={120}
          onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="slug">Workspace URL</Label>
        <div className="flex items-center gap-1">
          <span className="font-mono text-[12px] text-muted">/o/</span>
          <Input id="slug" name="slug" value={slug} required pattern="[a-z0-9][a-z0-9\-]{1,46}[a-z0-9]"
            onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} className="font-mono" />
        </div>
        <FieldError message={state.fieldErrors?.slug} />
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
      </Button>
    </form>
  );
}
