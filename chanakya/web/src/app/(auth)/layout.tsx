import { isConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/setup-required";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <SetupRequired />;
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-6 place-items-center border border-accent font-mono text-[12px] font-bold text-accent">च</span>
          <span className="text-[13px] font-semibold tracking-[0.25em]">CHANAKYA</span>
        </div>
        <div className="border border-border bg-panel p-5">{children}</div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Public-affairs intelligence from official and appropriately licensed sources. Access is logged.
        </p>
      </div>
    </main>
  );
}
