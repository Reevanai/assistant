import Link from "next/link";
import { requireUser, getMyOrganizations } from "@/lib/data/session";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/setup-required";
import { CreateOrgForm } from "./create-org-form";

export const metadata = { title: "Create organisation" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isConfigured()) return <SetupRequired />;
  await requireUser();
  const orgs = await getMyOrganizations();
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-md border border-border bg-panel p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">Workspace setup</p>
        <h1 className="mt-1 text-[15px] font-semibold">Create your organisation</h1>
        <p className="mt-1 text-[12px] text-muted">
          An organisation is an isolated workspace: its members, watchlists and research are invisible to every other
          organisation. You will be its owner. Joining an existing team? Ask an administrator for an invitation link.
        </p>
        <CreateOrgForm />
        {orgs.length ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Your organisations</p>
            <ul className="mt-2 space-y-1">
              {orgs.map(({ org }) => (
                <li key={org.id}><Link className="text-[12px] text-accent hover:underline" href={`/o/${org.slug}/command`}>{org.name}</Link></li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
