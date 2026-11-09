import { Badge } from "./badge";
import { lookup, type Tone } from "@/lib/domain/labels";

export function StatusBadge({ table, value }: { table: Record<string, { label: string; tone: Tone }>; value: string | null | undefined }) {
  const { label, tone } = lookup(table, value);
  return <Badge tone={tone}>{label}</Badge>;
}
