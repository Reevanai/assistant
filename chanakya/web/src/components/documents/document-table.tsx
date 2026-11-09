import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DocumentListRow } from "@/lib/data/command";
import { DOC_TYPE_LABEL, VERIFICATION } from "@/lib/domain/labels";
import { formatDate, shortJurisdiction } from "@/lib/domain/format";
import { DemoBadge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export function DocumentTable({ rows, orgSlug, compact = false }: { rows: DocumentListRow[]; orgSlug: string; compact?: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-28">Published</Th>
          {!compact ? <Th className="w-36">Type</Th> : null}
          <Th className="w-16">Juris.</Th>
          <Th>Title</Th>
          <Th className="hidden w-28 md:table-cell">Status</Th>
          <Th className="w-8"><span className="sr-only">Source</span></Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => (
          <Tr key={d.id}>
            <Td className="whitespace-nowrap font-mono text-[11px] text-muted">{formatDate(d.published_on)}</Td>
            {!compact ? <Td className="text-muted">{DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}</Td> : null}
            <Td className="font-mono text-[11px]">{shortJurisdiction(d.state_code)}</Td>
            <Td className="max-w-0">
              <div className="flex items-center gap-2">
                {d.is_demo ? <DemoBadge /> : null}
                <Link href={`/o/${orgSlug}/documents/${d.id}`} className="truncate text-fg hover:text-accent" title={d.title}>{d.title}</Link>
              </div>
            </Td>
            <Td className="hidden md:table-cell"><StatusBadge table={VERIFICATION} value={d.verification_status} /></Td>
            <Td>
              <a href={d.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-muted hover:text-accent" title="Open original source" aria-label="Open original source">
                <ExternalLink className="size-3.5" />
              </a>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
