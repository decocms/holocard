// One bundle, many views: the host sets toolInfo.tool.name when it opens the
// iframe; TOOL_PAGES maps it to a view. Tabs let humans switch manually.
import { type ComponentType, useState } from "react";
import { useMcpHostContext, useMcpState } from "./context";
import { BriefingView } from "./views/briefing";
import { BoardView } from "./views/board";
import { RoomsView } from "./views/rooms";

const TOOL_PAGES: Record<string, ComponentType> = {
  get_briefing: BriefingView,
  goal_list: BriefingView,
  goal_set: BriefingView,
  metrics_query: BriefingView,
  hypothesis_list: BriefingView,
  hypothesis_create: BriefingView,
  hypothesis_update: BriefingView,
  memory_search: BriefingView,
  memory_write: BriefingView,
  task_list: BoardView,
  task_create: BoardView,
  task_update: BoardView,
  room_read: RoomsView,
  room_post: RoomsView,
};

const TABS: Array<{ label: string; component: ComponentType }> = [
  { label: "Briefing", component: BriefingView },
  { label: "Rooms", component: RoomsView },
  { label: "Board", component: BoardView },
];

export function AppRouter() {
  const { toolName, status } = useMcpState();
  const hostContext = useMcpHostContext();
  const insets = hostContext?.safeAreaInsets;
  const [tab, setTab] = useState<number | null>(null);

  if (status === "initializing") {
    return <div className="center muted">Connecting to host…</div>;
  }

  const Page =
    tab !== null
      ? (TABS[tab]?.component ?? BriefingView)
      : ((toolName ? TOOL_PAGES[toolName] : undefined) ?? BriefingView);

  return (
    <main
      style={{
        paddingTop: insets?.top,
        paddingBottom: insets?.bottom,
        paddingLeft: insets?.left,
        paddingRight: insets?.right,
      }}
    >
      <nav className="tabs">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            className={`tab ${Page === t.component ? "active" : ""}`}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <Page />
    </main>
  );
}
