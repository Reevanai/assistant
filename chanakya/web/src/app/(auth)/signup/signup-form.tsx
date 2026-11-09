"use client";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/result";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label } from "@/components/ui/input";

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUp, initialActionState);
  if (state.ok) return <div className="mt-4"><FormMessage ok message={state.message} /></div>;
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName} />
        <FieldError message={state.fieldErrors?.fullName} />
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <FieldError message={state.fieldErrors?.password} />
        <p className="mt-1 text-[11px] text-muted">At least 12 characters, including a letter and a number.</p>
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
