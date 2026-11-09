import { getOrgContext } from "@/lib/data/session";
import { getSourceStatus } from "@/lib/data/command";
import { LICENSE, RUN_STATUS } from "@/lib/domain/labels";
import { formatCount, formatDateTime } from "@/lib/domain/format";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { EmptyState, Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata = { title: "Sources" };

export default async function SourcesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  await getOrgContext(slug);
  const sources = await getSourceStatus();
  return (
    <div className="flex flex-col gap-2">
      <Panel title="Source catalogue" meta="shared corpus · read-only">
        {sources.length === 0 ? <EmptyState title="No sources registered" /> : (
          <Table>
            <thead><tr><Th>Source</Th><Th className="hidden md:table-cell">Publisher</Th><Th className="w-20">Scope</Th><Th className="w-44">Licence</Th><Th className="w-20">State</Th><Th className="w-40">Last run</Th><Th className="w-16 text-right">Docs</Th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <Tr key={s.id}>
                  <Td><div className="flex items-center gap-2">{s.is_demo ? <DemoBadge /> : null}<span>{s.name}</span></div></Td>
                  <Td className="hidden text-muted md:table-cell">{s.publisher}</Td>
                  <Td className="font-mono text-[11px]">{s.jurisdiction_code}</Td>
                  <Td><StatusBadge table={LICENSE} value={s.license_status} /></Td>
                  <Td>{s.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                  <Td>
                    {s.last_run_status ? (
                      <span className="flex items-center gap-2"><StatusBadge table={RUN_STATUS} value={s.last_run_status} /><span className="font-mono text-[10px] text-muted">{formatDateTime(s.last_run_finished_at ?? s.last_run_started_at)}</span></span>
                    ) : <span className="text-[11px] text-muted">Never run</span>}
                  </Td>
                  <Td className="text-right font-mono">{formatCount(s.document_count)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <p className="px-1 text-[11px] text-muted">
        A source can only be activated after its reuse terms have been reviewed and recorded (enforced by a database constraint).
        Publicly accessible does not mean licensed for commercial reuse.
      </p>
    </div>
  );
}
