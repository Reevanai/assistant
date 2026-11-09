import Link from "next/link";
import { getOrgContext } from "@/lib/data/session";
import { getWatchlistSummaries } from "@/lib/data/command";
import { can } from "@/lib/domain/roles";
import { formatRelative } from "@/lib/domain/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { CreateWatchlistForm } from "./create-form";

export const metadata = { title: "Watchlists" };

export default async function WatchlistsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const { org, role } = await getOrgContext(slug);
  const lists = await getWatchlistSummaries(org.id);
  return (
    <div className="grid grid-cols-1 gap-2 p-2 xl:grid-cols-12">
      <Panel title="Intelligence watchlists" meta={`${lists.length} visible to you`} className="xl:col-span-8">
        {lists.length === 0 ? <EmptyState title="No watchlists yet">Watchlists track states, sectors, document types, sources, keywords and entities across the corpus.</EmptyState> : (
          <Table>
            <thead><tr><Th>Name</Th><Th className="w-24">Visibility</Th><Th className="w-20">Digest</Th><Th className="w-16 text-right">Items</Th><Th className="w-20 text-right">7d matches</Th><Th className="hidden w-24 md:table-cell">Updated</Th></tr></thead>
            <tbody>
              {lists.map((w) => (
                <Tr key={w.id}>
                  <Td className="max-w-0"><Link href={`/o/${slug}/watchlists/${w.id}`} className="block truncate hover:text-accent">{w.name}</Link></Td>
                  <Td><Badge>{w.visibility === "private" ? "Private" : "Org"}</Badge></Td>
                  <Td className="text-muted">{w.notify_frequency}</Td>
                  <Td className="text-right font-mono">{w.item_count}</Td>
                  <Td className={`text-right font-mono ${w.match_count_7d ? "text-accent" : "text-muted"}`}>{w.match_count_7d}</Td>
                  <Td className="hidden font-mono text-[11px] text-muted md:table-cell">{formatRelative(w.updated_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Panel title="New watchlist" className="xl:col-span-4">
        {can.createWatchlist(role)
          ? <CreateWatchlistForm orgId={org.id} orgSlug={slug} />
          : <EmptyState title="Read-only access">Viewers can read watchlists but not create them.</EmptyState>}
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
          Email/in-app digests are delivered from Milestone 4; the frequency you choose is stored now.
        </p>
      </Panel>
    </div>
  );
}
