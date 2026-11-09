import { getOrgContext } from "@/lib/data/session";
import { getMembers, getPendingInvitations } from "@/lib/data/members";
import { assignableRoles, can, invitableRoles, ROLE_LABEL } from "@/lib/domain/roles";
import { formatDate, formatDateTime } from "@/lib/domain/format";
import { revokeInvitation } from "@/lib/actions/org";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { InviteForm, MemberActions } from "./member-forms";

export const metadata = { title: "Members" };

export default async function MembersPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, role, userId } = await getOrgContext(slug);
  const manage = can.manageMembers(role);
  const [members, invitations] = await Promise.all([getMembers(org.id), manage ? getPendingInvitations(org.id) : Promise.resolve([])]);

  return (
    <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      <div className="flex flex-col gap-2 xl:col-span-8">
        <Panel title="Members" meta={`${members.length}`}>
          <Table>
            <thead><tr><Th>Name</Th><Th className="w-32">Role</Th><Th className="hidden w-28 md:table-cell">Joined</Th><Th className="w-64">Actions</Th></tr></thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.user_id === userId;
                const roles = assignableRoles(role, m.role);
                return (
                  <Tr key={m.user_id}>
                    <Td>{m.full_name ?? <span className="text-muted">Unnamed member</span>} {isSelf ? <Badge tone="accent">You</Badge> : null}</Td>
                    <Td><Badge tone={m.role === "owner" ? "accent" : "neutral"}>{ROLE_LABEL[m.role]}</Badge></Td>
                    <Td className="hidden font-mono text-[11px] text-muted md:table-cell">{formatDate(m.created_at)}</Td>
                    <Td><MemberActions orgId={org.id} orgSlug={slug} userId={m.user_id} currentRole={m.role} roles={roles} isSelf={isSelf} canRemove={isSelf || (manage && (m.role !== "owner" || role === "owner"))} /></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
        {manage ? (
          <Panel title="Pending invitations" meta={`${invitations.length}`}>
            {invitations.length === 0 ? <EmptyState title="No pending invitations" /> : (
              <Table>
                <thead><tr><Th>Email</Th><Th className="w-28">Role</Th><Th className="w-40">Expires</Th><Th className="w-20" /></tr></thead>
                <tbody>
                  {invitations.map((i) => {
                    const expired = new Date(i.expires_at) < new Date();
                    return (
                      <Tr key={i.id}>
                        <Td className="font-mono text-[11px]">{i.email}</Td>
                        <Td>{ROLE_LABEL[i.role]}</Td>
                        <Td className="font-mono text-[11px]">{expired ? <Badge tone="danger">Expired</Badge> : formatDateTime(i.expires_at)}</Td>
                        <Td>
                          <form action={revokeInvitation}>
                            <input type="hidden" name="invitationId" value={i.id} />
                            <input type="hidden" name="orgSlug" value={slug} />
                            <Button type="submit" size="sm" variant="ghost">Revoke</Button>
                          </form>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 xl:col-span-4">
        {manage ? (
          <Panel title="Invite a colleague">
            <InviteForm orgId={org.id} orgSlug={slug} roles={invitableRoles(role)} />
          </Panel>
        ) : null}
        <Panel title="Role permissions">
          <ul className="space-y-1 p-3 text-[12px] text-muted">
            <li><span className="text-fg">Owner</span> — everything, including granting ownership.</li>
            <li><span className="text-fg">Administrator</span> — manage members and invitations; read the full audit log.</li>
            <li><span className="text-fg">Analyst</span> — create and edit organisation watchlists and research.</li>
            <li><span className="text-fg">Researcher</span> — create own watchlists and research.</li>
            <li><span className="text-fg">Viewer</span> — read-only.</li>
          </ul>
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted">Enforced by Postgres row-level security, not just this interface.</p>
        </Panel>
      </div>
    </div>
  );
}
