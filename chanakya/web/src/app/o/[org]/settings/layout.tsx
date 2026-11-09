import { SettingsTabs } from "./tabs";

export default async function SettingsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org } = await params;
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-3 border border-border bg-panel px-3">
        <h1 className="py-2 text-[12px] font-semibold uppercase tracking-[0.12em]">Settings</h1>
        <SettingsTabs orgSlug={org} />
      </div>
      {children}
    </div>
  );
}
