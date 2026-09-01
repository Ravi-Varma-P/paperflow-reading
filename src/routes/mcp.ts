import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, handleMcpRequest } from "@/lib/mcp/server";

// Canonical MCP endpoint. Mirrors /api/public/mcp; both require the bearer key.
export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handleMcpRequest(request),
      GET: ({ request }) => handleMcpRequest(request),
      DELETE: ({ request }) => handleMcpRequest(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
    },
  },
});
