import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="max-w-sm border border-border bg-panel p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">404</p>
        <h1 className="mt-1 text-[14px] font-semibold">Not found, or you do not have access.</h1>
        <Link href="/" className="mt-4 inline-block text-[12px] text-accent hover:underline">Return to workspace</Link>
      </div>
    </main>
  );
}
