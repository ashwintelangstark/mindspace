import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  handleSqliteAction,
  fetchLiveYahooChart,
  searchLiveYahooStocks,
  fetchLiveMarketOverview,
  type SqliteActionPayload,
} from "./lib/sqlite-server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // SQLite API Endpoint
      if (url.pathname === "/api/db") {
        if (request.method === "POST") {
          const body = (await request.json()) as SqliteActionPayload;
          const result = await handleSqliteAction(body);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        const result = await handleSqliteAction({ action: "get_state" });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Live Yahoo Finance Market Chart & Quote Proxy Endpoint
      if (url.pathname === "/api/market/chart") {
        const symbol = url.searchParams.get("symbol") || "";
        const interval = url.searchParams.get("interval") || "5m";
        const range = url.searchParams.get("range") || "1d";
        if (!symbol) {
          return new Response(JSON.stringify({ ok: false, error: "Missing symbol" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const result = await fetchLiveYahooChart(symbol, interval, range);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Live Yahoo Finance Stock Search Endpoint
      if (url.pathname === "/api/market/search") {
        const q = url.searchParams.get("q") || "";
        const result = await searchLiveYahooStocks(q);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // Live Market Overview Indices Endpoint
      if (url.pathname === "/api/market/overview") {
        const result = await fetchLiveMarketOverview();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
