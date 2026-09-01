import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, OAUTH_ISSUER } from "@/lib/mcp/server";

/**
 * RFC 9728 protected-resource metadata. OAuth-capable MCP clients (Grok,
 * Claude, ChatGPT) read this to discover the authorization server.
 */
function metadata(request: Request) {
  const origin = new URL(request.url).origin;
  return new Response(
    JSON.stringify({
      resource: `${origin}/mcp`,
      authorization_servers: [OAUTH_ISSUER],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"],
      resource_name: "PaperPlay Reading MCP",
    }),
    { headers: { ...CORS_HEADERS, "content-type": "application/json" } },
  );
}

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => metadata(request),
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
    },
  },
});
