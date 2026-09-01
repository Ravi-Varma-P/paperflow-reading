# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## MCP server (for Grok and other AI clients)

PaperPlay exposes a **Model Context Protocol** server over the standard
Streamable HTTP transport, so external AI clients can read the library.

### Endpoint

```
https://<your-app>.lovable.app/mcp
```

A mirror is available at `https://<your-app>.lovable.app/api/public/mcp` — use
it if the platform's site-level access gate blocks `/mcp` (that prefix is always
reachable). Both routes run the same handler and require the same bearer key.

Stable URLs that survive project renames:

```
https://project--<project-id>.lovable.app/mcp        # published
https://project--<project-id>-dev.lovable.app/mcp    # preview build
```

The endpoint is only reachable over HTTPS once the project is **published**.

### Authentication

The endpoint accepts **two** bearer credentials:

1. **OAuth 2.1 (recommended for AI clients).** The app is an OAuth resource
   server. Clients discover the authorization server through
   `/.well-known/oauth-protected-resource`, register dynamically, send the user
   through the app's consent screen at `/.lovable/oauth/consent`, and receive a
   user access token. Tools then run as that signed-in PaperPlay user, so
   database row-level security applies to them.
2. **Static API key.** `Authorization: Bearer <MCP_API_KEY>` — a server-side
   environment secret, useful for scripts and curl. It has anonymous-level
   database access (public sample documents only).

There is **no anonymous access**: unauthenticated requests get `401` with a
`WWW-Authenticate` header pointing at the protected-resource metadata.

### Tools (all read-only)

| Tool                    | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `list_documents`        | List library documents (filter by `source`, `file_type`, `limit`).         |
| `get_document`          | Metadata for one document by `document_id`.                                |
| `search_documents`      | Keyword search across title, author and excerpt.                           |
| `get_document_sections` | Ordered readable sections; `include_body=false` gives a table of contents. |

Each tool returns both human-readable text and `structuredContent` JSON.

### Connecting from Grok (Custom Connector)

1. Publish the app so the HTTPS URL is live.
2. In Grok → Settings → **Connectors** → **Add custom connector**.
3. **Server URL**: `https://<your-app>.lovable.app/mcp`
4. Leave the OAuth client id/secret fields blank if Grok supports dynamic
   client registration; otherwise create a client in the app's auth settings.
   Grok reads the OAuth endpoints from the discovery document automatically.
5. Approve the consent screen when the browser opens, then confirm the four
   tools appear after Grok's `tools/list` handshake.


### Verifying manually

```sh
curl -X POST https://<your-app>.lovable.app/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Known limitations

- **JSON responses only.** The server replies to `POST` with a single
  `application/json` JSON-RPC message. SSE streaming (`GET /mcp`) is not
  supported and returns `405`; no tool needs server-initiated messages.
- **Stateless.** No MCP session ids, resumability, or `notifications/*` fan-out.
- **Read-only.** No tool writes to the database.
- **Single shared key.** Auth is a shared server-side API key, not per-user
  OAuth, so tools expose the whole library to any holder of the key. Treat the
  key as a secret and rotate it if it leaks.
