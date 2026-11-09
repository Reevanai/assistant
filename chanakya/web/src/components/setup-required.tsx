export function SetupRequired() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="max-w-lg border border-border bg-panel p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">Configuration required</p>
        <h1 className="mt-1 text-[15px] font-semibold">Connect a Supabase project</h1>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[12px] text-muted">
          <li>Apply <code className="text-fg">chanakya/supabase/migrations</code> and <code className="text-fg">seed.sql</code> to your project (<code className="text-fg">supabase db push</code>).</li>
          <li>Copy <code className="text-fg">web/.env.example</code> to <code className="text-fg">web/.env.local</code> and set the project URL and anon key.</li>
          <li>Restart the dev server.</li>
        </ol>
        <p className="mt-3 text-[12px] text-muted">CHANAKYA never runs on invented data; until a database is connected there is nothing to show.</p>
      </div>
    </main>
  );
}
