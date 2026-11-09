import { getMyOrganizations, getOrgContext, getCurrentUser } from "@/lib/data/session";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/setup-required";
import { SideRail } from "@/components/shell/side-rail";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";

export const dynamic = "force-dynamic";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  if (!isConfigured()) return <SetupRequired />;
  const { org: slug } = await params;
  const [ctx, orgs, user] = await Promise.all([getOrgContext(slug), getMyOrganizations(), getCurrentUser()]);
  const userLabel = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Signed in";
  return (
    <div className="flex h-dvh flex-col">
      <TopBar org={ctx.org} role={ctx.role} orgs={orgs.map((o) => ({ slug: o.org.slug, name: o.org.name }))} userLabel={userLabel} />
      <div className="flex min-h-0 flex-1">
        <SideRail orgSlug={ctx.org.slug} />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <CommandPalette orgSlug={ctx.org.slug} />
    </div>
  );
}
