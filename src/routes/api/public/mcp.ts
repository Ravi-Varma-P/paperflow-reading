import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, handleMcpRequest } from "@/lib/mcp/server";

// Public route prefix (bypasses the platform's site auth gate) — the handler
// enforces its own bearer API key, so nothing is readable anonymously.
export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handleMcpRequest(request),
      GET: ({ request }) => handleMcpRequest(request),
      DELETE: ({ request }) => handleMcpRequest(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
    },
  },
});
