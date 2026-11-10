import { getOrgContext } from "@/lib/data/session";
import { listEntities } from "@/lib/data/entities";
import { ProjectMap, type MapPoint } from "@/components/geo/project-map";
import { EmptyState, Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata = { title: "Geo Intelligence" };

export default async function MapPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  await getOrgContext(slug);
  const projects = await listEntities({ type: "public_project", limit: 500 });
  const points: MapPoint[] = projects.flatMap((p) => {
    const a = p.attributes as Record<string, string | number | undefined>;
    if (typeof a.lat !== "number" || typeof a.lon !== "number") return [];
    const detail = [a.plant_type, a.capacity_mw ? `${a.capacity_mw} MW` : null, a.operator].filter(Boolean).join(" · ");
    return [{ id: p.id, name: p.canonical_name, lat: a.lat, lon: a.lon, detail, sourceUrl: a.wikidata_qid ? `https://www.wikidata.org/wiki/${a.wikidata_qid}` : null }];
  });

  return (
    <div className="flex flex-col gap-2 p-2">
      <Panel title="Geo Intelligence · Karnataka" meta={`${points.length} public projects with coordinates`}>
        {points.length === 0 ? <EmptyState title="No geocoded projects in the corpus yet" /> : <ProjectMap points={points} />}
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted">
          Project locations: Wikidata (CC0), auto-matched and not yet verified. The basemap is OpenStreetMap-derived and is not an official
          depiction of India&apos;s boundaries. Use Survey of India boundaries before any external publication. Constituency and district layers (DataMeet, CC BY 2.5 IN) are next.
        </p>
      </Panel>
      <Panel title="Projects">
        <Table>
          <thead><tr><Th>Name</Th><Th>Type</Th><Th className="w-24 text-right">Capacity</Th><Th>Operator</Th><Th className="w-40">Coordinates</Th></tr></thead>
          <tbody>
            {projects.map((p) => {
              const a = p.attributes as Record<string, string | number | undefined>;
              return (
                <Tr key={p.id}>
                  <Td>{p.canonical_name}</Td>
                  <Td className="text-muted">{a.plant_type ?? "—"}</Td>
                  <Td className="text-right font-mono">{a.capacity_mw ? `${a.capacity_mw} MW` : "—"}</Td>
                  <Td className="text-muted">{a.operator ?? "—"}</Td>
                  <Td className="font-mono text-[11px] text-muted">{typeof a.lat === "number" ? `${a.lat.toFixed(3)}, ${Number(a.lon).toFixed(3)}` : "—"}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
