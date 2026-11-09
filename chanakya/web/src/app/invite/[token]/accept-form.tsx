"use client";
import { useActionState } from "react";
import { acceptInvitation } from "@/lib/actions/org";
import { initialActionState } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/input";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, initialActionState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </form>
  );
}
