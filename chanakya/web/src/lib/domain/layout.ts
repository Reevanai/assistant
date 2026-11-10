/** Command Centre panels. Order here is the default order on screen. */
export const COMMAND_PANELS = [
  { id: "developments", label: "Latest developments" },
  { id: "notifications", label: "Gazette & notifications" },
  { id: "watchlists", label: "Watchlists" },
  { id: "tracked", label: "Tracked bodies & regions" },
  { id: "ingestion", label: "Ingestion status" },
  { id: "activity", label: "Research activity" },
] as const;

export type PanelId = (typeof COMMAND_PANELS)[number]["id"];
const PANEL_IDS = new Set<string>(COMMAND_PANELS.map((p) => p.id));

export interface CommandLayout {
  hidden: PanelId[];
}

/** Parse the untrusted jsonb stored in user_workspace_prefs.layout. */
export function parseLayout(raw: unknown): CommandLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { hidden: [] };
  const hidden = (raw as { hidden?: unknown }).hidden;
  if (!Array.isArray(hidden)) return { hidden: [] };
  return { hidden: [...new Set(hidden.filter((h): h is PanelId => typeof h === "string" && PANEL_IDS.has(h)))] };
}

export const isPanelVisible = (layout: CommandLayout, id: PanelId) => !layout.hidden.includes(id);
