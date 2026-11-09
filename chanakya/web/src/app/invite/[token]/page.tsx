import Link from "next/link";
import { getCurrentUser } from "@/lib/data/session";
import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/setup-required";
import { AcceptInviteForm } from "./accept-form";

export const metadata = { title: "Accept invitation" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  if (!isConfigured()) return <SetupRequired />;
  const { token } = await params;
  const user = await getCurrentUser();
  const here = `/invite/${encodeURIComponent(token)}`;
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm border border-border bg-panel p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">Invitation</p>
        <h1 className="mt-1 text-[15px] font-semibold">Join an organisation on CHANAKYA</h1>
        {user ? (
          <>
            <p className="mt-2 text-[12px] text-muted">
              Signed in as <span className="text-fg">{user.email}</span>. The invitation must have been issued to this address.
            </p>
            <AcceptInviteForm token={token} />
          </>
        ) : (
          <p className="mt-3 text-[12px] text-muted">
            <Link className="text-accent hover:underline" href={`/login?next=${encodeURIComponent(here)}`}>Sign in</Link> or{" "}
            <Link className="text-accent hover:underline" href={`/signup?next=${encodeURIComponent(here)}`}>create an account</Link>{" "}
            with the email address the invitation was sent to.
          </p>
        )}
      </div>
    </main>
  );
}
