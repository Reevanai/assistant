"use client";
import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label } from "@/components/ui/input";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initialActionState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError message={state.fieldErrors?.password} />
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
