/** Workspace modules. `milestone` > 1 means not yet built — the route renders an honest status page. */
export const MODULES = [
  { id: "command", label: "Command Centre", href: "command", key: "c", milestone: 1 },
  { id: "radar", label: "Policy Radar", href: "radar", key: "r", milestone: 1 },
  { id: "search", label: "Document Search", href: "search", key: "f", milestone: 1 },
  { id: "analyst", label: "Research Analyst", href: "analyst", key: "a", milestone: 3 },
  { id: "entities", label: "Entities", href: "entities", key: "e", milestone: 1 },
  { id: "graph", label: "Relationships", href: "graph", key: "g", milestone: 3 },
  { id: "map", label: "Geo Intelligence", href: "map", key: "m", milestone: 1 },
  { id: "impact", label: "Impact", href: "impact", key: "i", milestone: 5 },
  { id: "watchlists", label: "Watchlists", href: "watchlists", key: "w", milestone: 1 },
  { id: "settings", label: "Settings", href: "settings/members", key: "s", milestone: 1 },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

/** Resolve a two-key "g <key>" chord to a module href. */
export function chordTarget(key: string): string | null {
  return MODULES.find((m) => m.key === key.toLowerCase())?.href ?? null;
}
