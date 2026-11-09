import {
  Activity, Bot, Eye, FileSearch, Map as MapIcon, Network, Radar, Settings, Target, Users,
} from "lucide-react";
import type { ModuleId } from "@/lib/domain/modules";

export const MODULE_ICON: Record<ModuleId, React.ComponentType<{ className?: string }>> = {
  command: Activity,
  radar: Radar,
  search: FileSearch,
  analyst: Bot,
  entities: Users,
  graph: Network,
  map: MapIcon,
  impact: Target,
  watchlists: Eye,
  settings: Settings,
};
