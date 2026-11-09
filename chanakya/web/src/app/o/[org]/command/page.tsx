import { Suspense } from "react";
import { getOrgContext } from "@/lib/data/session";
import { getCommandLayout } from "@/lib/data/command";
import { isPanelVisible, type PanelId } from "@/lib/domain/layout";
import { cn } from "@/lib/utils";
import {
  ActivityPanel, DevelopmentsPanel, IngestionPanel, NotificationsPanel, StatusStrip, TrackedPanel, WatchlistsPanel,
} from "@/components/command/panels";
import { CustomizeLayout } from "@/components/command/customize";
import { Panel, SkeletonRows } from "@/components/ui/panel";

export const metadata = { title: "Command Centre" };

const fallback = (title: string) => <Panel title={title}><SkeletonRows /></Panel>;

export default async function CommandCentre({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, role, userId } = await getOrgContext(slug);
  const layout = await getCommandLayout(org.id, userId);
  const show = (id: PanelId) => isPanelVisible(layout, id);

  // Left column (8/12) and right column (4/12) on wide screens; single column on small screens.
  const left: [PanelId, React.ReactNode][] = [
    ["developments", <Suspense key="d" fallback={fallback("Latest developments")}><DevelopmentsPanel orgSlug={slug} /></Suspense>],
    ["notifications", <Suspense key="n" fallback={fallback("Gazette & notifications")}><NotificationsPanel orgSlug={slug} /></Suspense>],
    ["ingestion", <Suspense key="i" fallback={fallback("Ingestion status")}><IngestionPanel orgSlug={slug} /></Suspense>],
  ];
  const right: [PanelId, React.ReactNode][] = [
    ["watchlists", <Suspense key="w" fallback={fallback("Watchlists")}><WatchlistsPanel orgId={org.id} orgSlug={slug} role={role} /></Suspense>],
    ["tracked", <Suspense key="t" fallback={fallback("Tracked bodies & regions")}><TrackedPanel orgId={org.id} /></Suspense>],
    ["activity", <Suspense key="a" fallback={fallback("Research activity")}><ActivityPanel orgId={org.id} role={role} /></Suspense>],
  ];
  const visLeft = left.filter(([id]) => show(id));
  const visRight = right.filter(([id]) => show(id));

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-center gap-2 px-1">
        <h1 className="text-[12px] font-semibold uppercase tracking-[0.12em]">Command Centre</h1>
        <span className="text-[11px] text-muted">{org.name}</span>
        <div className="ml-auto"><CustomizeLayout orgId={org.id} orgSlug={slug} hidden={layout.hidden} /></div>
      </div>
      <Suspense fallback={<div className="h-14 animate-pulse border border-border bg-panel" />}><StatusStrip /></Suspense>
      <div className={cn("grid grid-cols-1 gap-2", visLeft.length && visRight.length && "xl:grid-cols-12")}>
        {visLeft.length ? <div className={cn("flex min-w-0 flex-col gap-2", visRight.length && "xl:col-span-8")}>{visLeft.map(([, n]) => n)}</div> : null}
        {visRight.length ? <div className={cn("flex min-w-0 flex-col gap-2", visLeft.length && "xl:col-span-4")}>{visRight.map(([, n]) => n)}</div> : null}
      </div>
      {!visLeft.length && !visRight.length ? (
        <p className="px-1 text-[12px] text-muted">All panels are hidden. Use “Panels” to show them again.</p>
      ) : null}
    </div>
  );
}
