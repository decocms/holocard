// MCP-App bridge: wires @modelcontextprotocol/ext-apps' useApp() into React.
// The host (deco studio) renders this bundle in a sandboxed iframe and
// proxies every tool call — the UI never holds the worker URL or token.
import {
  type App,
  type McpUiHostContext,
  useApp,
  useHostStyles,
} from "@modelcontextprotocol/ext-apps/react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";

export type McpStatus = "initializing" | "connected" | "tool-input" | "tool-result" | "error";

export interface McpState<TResult = unknown> {
  status: McpStatus;
  toolName?: string;
  toolResult?: TResult;
  error?: string;
}

const INITIAL_STATE: McpState = { status: "initializing" };

const McpStateContext = createContext<McpState>(INITIAL_STATE);
const McpStateSetterContext = createContext<Dispatch<SetStateAction<McpState>> | null>(null);
const McpAppContext = createContext<App | null>(null);
const McpHostContext = createContext<McpUiHostContext | undefined>(undefined);

export function McpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<McpState>(INITIAL_STATE);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>(undefined);

  const onAppCreated = useCallback((app: App) => {
    app.ontoolinput = () => {
      setState((prev) => ({ ...prev, status: "tool-input" }));
    };
    app.ontoolresult = (result) => {
      if (result.isError) {
        const textBlock = result.content?.find((c) => c.type === "text");
        setState((prev) => ({
          ...prev,
          status: "error",
          error: (textBlock?.type === "text" ? textBlock.text : undefined) ?? "Tool error",
        }));
        return;
      }
      setState((prev) => ({ ...prev, status: "tool-result", toolResult: result.structuredContent }));
    };
    app.onerror = (err) => console.error("MCP App error:", err);
    app.onhostcontextchanged = (ctx) => setHostContext((prev) => ({ ...prev, ...ctx }));
  }, []);

  const { app, isConnected } = useApp({
    appInfo: { name: "holocard admin", version: "0.1.0" },
    capabilities: {},
    onAppCreated,
  });

  useHostStyles(app, app?.getHostContext());

  if (isConnected && state.status === "initializing") {
    const ctx = app?.getHostContext();
    if (ctx) setHostContext(ctx);
    setState({ status: "connected", toolName: ctx?.toolInfo?.tool.name });
  }

  return (
    <McpAppContext.Provider value={app}>
      <McpHostContext.Provider value={hostContext}>
        <McpStateSetterContext.Provider value={setState}>
          <McpStateContext.Provider value={state}>{children}</McpStateContext.Provider>
        </McpStateSetterContext.Provider>
      </McpHostContext.Provider>
    </McpAppContext.Provider>
  );
}

export function useMcpState<TResult = unknown>() {
  return useContext(McpStateContext) as McpState<TResult>;
}

export function useMcpHostContext() {
  return useContext(McpHostContext);
}

/** Call a tool on this server via the host. */
export function useCallTool() {
  const app = useContext(McpAppContext);
  return useCallback(
    async <T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
      if (!app) throw new Error("MCP App not connected yet");
      const result = await app.callServerTool({ name, arguments: args });
      if (result?.isError) {
        const textBlock = result.content?.find((c) => c.type === "text");
        throw new Error(textBlock?.type === "text" ? textBlock.text : `Tool ${name} failed`);
      }
      return result.structuredContent as T;
    },
    [app],
  );
}
