"use client";
import { useActionState } from "react";
import { inviteMember, removeMember, setMemberRole } from "@/lib/actions/org";
import { initialActionState } from "@/lib/actions/result";
import { ROLE_LABEL, type OrgRole } from "@/lib/domain/roles";
import { Button } from "@/components/ui/button";
import { FieldError, FormMessage, Input, Label, Select } from "@/components/ui/input";

export function InviteForm({ orgId, orgSlug, roles }: { orgId: string; orgSlug: string; roles: OrgRole[] }) {
  const [state, action, pending] = useActionState(inviteMember, initialActionState);
  return (
    <form action={action} className="space-y-2 p-3">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue={state.ok ? undefined : state.values?.email} />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue={state.values?.role ?? "analyst"}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <FieldError message={state.fieldErrors?.role} />
      </div>
      <FormMessage ok={state.ok} message={state.message} />
      {state.ok && state.data?.link ? (
        <Input readOnly value={state.data.link} className="font-mono text-[11px]" onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      ) : null}
      <Button type="submit" size="sm" variant="primary" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</Button>
    </form>
  );
}

export function MemberActions({ orgId, orgSlug, userId, currentRole, roles, isSelf, canRemove }: {
  orgId: string; orgSlug: string; userId: string; currentRole: OrgRole; roles: OrgRole[]; isSelf: boolean; canRemove: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState(setMemberRole, initialActionState);
  const [removeState, removeAction, removePending] = useActionState(removeMember, initialActionState);
  const message = (!roleState.ok && roleState.message) || (!removeState.ok && removeState.message) || undefined;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {roles.length ? (
        <form action={roleAction} className="flex items-center gap-1">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="userId" value={userId} />
          <Select name="role" defaultValue={currentRole} className="h-6 w-28 text-[11px]" aria-label="Role">
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
          <Button type="submit" size="sm" disabled={rolePending}>Set</Button>
        </form>
      ) : null}
      {canRemove ? (
        <form action={removeAction} onSubmit={(e) => { if (!confirm(isSelf ? "Leave this organisation?" : "Remove this member?")) e.preventDefault(); }}>
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" size="sm" variant="danger" disabled={removePending}>{isSelf ? "Leave" : "Remove"}</Button>
        </form>
      ) : null}
      {message ? <div className="basis-full"><FormMessage message={message} /></div> : null}
    </div>
  );
}
