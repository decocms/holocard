// MCP-App UI resources: each ui://holocard/* URI serves the SAME single-file
// HTML bundle (built by vite.mcp.config.ts into dist-mcp/, imported as text
// via the wrangler.jsonc Text rule). deco studio loads it into a sandboxed
// iframe; the React app inside picks the view at runtime from
// hostContext.toolInfo.tool.name. Tool ↔ URI mapping lives in the tools'
// _meta.ui.resourceUri (mcp.ts / improve.ts).
import bundledHtml from "../../dist-mcp/index.html";

const HTML: string = bundledHtml as unknown as string;

export const MCP_APP_MIME = "text/html;profile=mcp-app";

export const RESOURCES = [
  {
    uri: "ui://holocard/briefing",
    name: "Mission briefing",
    description: "Goals with live progress, 7-day metrics, open hypotheses, recent memories.",
  },
  {
    uri: "ui://holocard/team",
    name: "Team",
    description: "The task board and the rooms where the agent team converses.",
  },
];

export function readResource(uri: string): { uri: string; mimeType: string; text: string } | null {
  if (!uri.startsWith("ui://holocard/")) return null;
  return { uri, mimeType: MCP_APP_MIME, text: HTML };
}
