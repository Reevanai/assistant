import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { getOrgContext } from "@/lib/data/session";
import { getWatchlist, getWatchlistItems, getWatchlistMatches, getWatchlistOptions } from "@/lib/data/watchlists";
import { deleteWatchlist, removeWatchlistItem } from "@/lib/actions/watchlists";
import { can } from "@/lib/domain/roles";
import { DOC_TYPE_LABEL } from "@/lib/domain/labels";
import { DocumentTable } from "@/components/documents/document-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/ui/panel";
import { AddItemForm } from "./add-item-form";

export const metadata = { title: "Watchlist" };

const TYPE_LABEL: Record<string, string> = {
  jurisdiction: "Region", sector: "Sector", keyword: "Keyword", doc_type: "Doc type", source: "Source", entity: "Entity",
};

export default async function WatchlistPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const { org, role, userId } = await getOrgContext(slug);
  const watchlist = await getWatchlist(org.id, id);
  if (!watchlist) notFound();
  const [items, matches, options] = await Promise.all([getWatchlistItems(id), getWatchlistMatches(id, 30), getWatchlistOptions()]);
  // UI hint only — mirrors private.can_edit_watchlist; the database enforces it.
  const editable =
    (watchlist.created_by === userId && can.createWatchlist(role)) ||
    (watchlist.visibility === "organization" && can.editOrgWatchlists(role));

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap items-center gap-2 border border-border bg-panel px-3 py-2">
        <Link href={`/o/${slug}/watchlists`} className="text-[11px] text-muted hover:text-accent">Watchlists /</Link>
        <h1 className="text-[14px] font-semibold">{watchlist.name}</h1>
        <Badge>{watchlist.visibility === "private" ? "Private" : "Organisation"}</Badge>
        <Badge>Digest: {watchlist.notify_frequency}</Badge>
        {editable ? (
          <form action={deleteWatchlist} className="ml-auto">
            <input type="hidden" name="watchlistId" value={watchlist.id} />
            <input type="hidden" name="orgSlug" value={slug} />
            <Button type="submit" size="sm" variant="danger">Delete</Button>
          </form>
        ) : null}
        {watchlist.description ? <p className="basis-full text-[12px] text-muted">{watchlist.description}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
        <Panel title="Matching documents" meta="last 30 days · matches ANY item" className="xl:col-span-8">
          {items.length === 0 ? <EmptyState title="Add items to start matching" /> :
            matches.length === 0 ? <EmptyState title="No documents matched in the last 30 days" /> :
            <DocumentTable rows={matches} orgSlug={slug} />}
        </Panel>
        <div className="flex flex-col gap-2 xl:col-span-4">
          <Panel title="Tracking" meta={`${items.length} items`}>
            {items.length === 0 ? <EmptyState title="No items" /> : (
              <ul className="divide-y divide-border/60">
                {items.map((i) => (
                  <li key={i.id} className="flex h-8 items-center gap-2 px-3">
                    <span className="w-16 font-mono text-[10px] uppercase text-muted">{TYPE_LABEL[i.item_type]}</span>
                    <span className="flex-1 truncate text-[12px]">{i.item_type === "doc_type" ? DOC_TYPE_LABEL[i.label] ?? i.label : i.label}</span>
                    {editable ? (
                      <form action={removeWatchlistItem}>
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="watchlistId" value={watchlist.id} />
                        <input type="hidden" name="orgSlug" value={slug} />
                        <button type="submit" className="grid size-6 place-items-center text-muted hover:text-danger" aria-label={`Remove ${i.label}`}><X className="size-3.5" /></button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {editable ? (
            <Panel title="Add item">
              <AddItemForm watchlistId={watchlist.id} orgId={org.id} orgSlug={slug} options={options} />
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
