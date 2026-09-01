/**
 * PaperPlay MCP server — Streamable HTTP transport (JSON-RPC 2.0).
 *
 * Implements the subset of the Model Context Protocol needed by remote
 * clients (Grok custom connectors, Claude, Cursor, ChatGPT):
 *   - `initialize`  / `notifications/initialized`
 *   - `tools/list`  / `tools/call`
 *   - `ping`
 *
 * Transport notes: this endpoint is JSON-only. It responds to POST with a
 * single `application/json` JSON-RPC response (allowed by the Streamable HTTP
 * spec) and rejects SSE upgrade (GET) with 405, since no server-initiated
 * messages are produced.
 *
 * AUTH: every request must present `Authorization: Bearer <MCP_API_KEY>`,
 * where `MCP_API_KEY` is a server-side environment secret. There is NO
 * anonymous access — documents are never exposed without the key.
 */
import { createClient } from "@supabase/supabase-js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Database } from "@/integrations/supabase/types";

export const MCP_PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

/* ------------------------------------------------------------------ env */

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  return (globalThis as RuntimeGlobals).process?.env?.[name]?.trim() || undefined;
}

function firstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name);
    if (value) return value;
  }
  return undefined;
}

/** Direct Supabase host — the OAuth issuer must never be a proxy URL. */
const PROJECT_REF = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export const OAUTH_ISSUER = `https://${PROJECT_REF}.supabase.co/auth/v1`;

function supabaseForMcp(accessToken?: string) {
  const url = firstEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const key = firstEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);
  if (!url || !key) throw new Error("Supabase environment is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: accessToken
        ? { apikey: key, Authorization: `Bearer ${accessToken}` }
        : { apikey: key },
    },
  });
}

/* ----------------------------------------------------------------- auth */

export type AuthResult =
  | { ok: true; accessToken?: string }
  | { ok: false; status: number; message: string };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwkSet() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${OAUTH_ISSUER}/.well-known/jwks.json`));
  return jwks;
}

/**
 * Accepts either an OAuth 2.1 access token issued by the app's authorization
 * server (Grok / Claude / ChatGPT connectors) or the static MCP_API_KEY used by
 * scripts and curl.
 */
export async function authenticate(request: Request): Promise<AuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const presented = match?.[1]?.trim();
  if (!presented) return { ok: false, status: 401, message: "Missing bearer token." };

  // JWT → OAuth access token from the authorization server.
  if (presented.split(".").length === 3) {
    try {
      await jwtVerify(presented, jwkSet(), {
        issuer: OAUTH_ISSUER,
        audience: "authenticated",
      });
      return { ok: true, accessToken: presented };
    } catch {
      return { ok: false, status: 401, message: "Invalid or expired access token." };
    }
  }

  const expected = runtimeEnv("MCP_API_KEY");
  if (expected && timingSafeEqual(presented, expected)) return { ok: true };
  return { ok: false, status: 401, message: "Missing or invalid bearer token." };
}


/* ---------------------------------------------------------------- tools */

interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

class ToolError extends Error {}

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

function str(args: Record<string, unknown>, key: string, required = false): string | undefined {
  const value = args[key];
  if (value === undefined || value === null || value === "") {
    if (required) throw new ToolError(`Missing required argument "${key}".`);
    return undefined;
  }
  if (typeof value !== "string") throw new ToolError(`Argument "${key}" must be a string.`);
  return value;
}

function num(args: Record<string, unknown>, key: string, fallback: number, max: number): number {
  const value = args[key];
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new ToolError(`Argument "${key}" must be a number.`);
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

const DOC_FIELDS =
  "id,title,author,source,file_type,excerpt,word_count,estimated_minutes,sync_status,last_synced_at,created_at,updated_at";

const listDocuments: McpTool = {
  name: "list_documents",
  title: "List documents",
  description:
    "List documents in the PaperPlay library, most recently updated first. Optionally filter by source (upload or google_docs) or file type.",
  annotations: readOnly,
  inputSchema: {
    type: "object",
    properties: {
      source: {
        type: "string",
        enum: ["upload", "google_docs"],
        description: "Only return documents from this source.",
      },
      file_type: {
        type: "string",
        enum: ["pdf", "docx", "txt", "md", "gdoc"],
        description: "Only return documents with this file type.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 25,
        description: "Maximum number of documents to return (default 25).",
      },
    },
    additionalProperties: false,
  },
  handler: async (args) => {
    const supabase = supabaseForMcp();
    let query = supabase
      .from("documents")
      .select(DOC_FIELDS)
      .order("updated_at", { ascending: false })
      .limit(num(args, "limit", 25, 100));
    const source = str(args, "source");
    const fileType = str(args, "file_type");
    if (source) query = query.eq("source", source);
    if (fileType) query = query.eq("file_type", fileType);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    return { count: data?.length ?? 0, documents: data ?? [] };
  },
};

const getDocument: McpTool = {
  name: "get_document",
  title: "Get document",
  description:
    "Fetch a single document's metadata by id, including source, word count, estimated reading time and sync status.",
  annotations: readOnly,
  inputSchema: {
    type: "object",
    properties: {
      document_id: { type: "string", description: "UUID of the document." },
    },
    required: ["document_id"],
    additionalProperties: false,
  },
  handler: async (args) => {
    const id = str(args, "document_id", true)!;
    const supabase = supabaseForMcp();
    const { data, error } = await supabase
      .from("documents")
      .select(DOC_FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError(`No document found with id "${id}".`);
    return { document: data };
  },
};

const searchDocuments: McpTool = {
  name: "search_documents",
  title: "Search documents",
  description:
    "Search the library by keyword. Matches document titles, authors and excerpts (case-insensitive substring match).",
  annotations: readOnly,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", minLength: 1, description: "Keyword or phrase to search for." },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        default: 10,
        description: "Maximum number of matches to return (default 10).",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  handler: async (args) => {
    const raw = str(args, "query", true)!;
    const term = raw.replace(/[%,()]/g, " ").trim();
    if (!term) throw new ToolError("Search query must contain searchable characters.");
    const supabase = supabaseForMcp();
    const { data, error } = await supabase
      .from("documents")
      .select(DOC_FIELDS)
      .or(`title.ilike.%${term}%,author.ilike.%${term}%,excerpt.ilike.%${term}%`)
      .order("updated_at", { ascending: false })
      .limit(num(args, "limit", 10, 50));
    if (error) throw new ToolError(error.message);
    return { query: raw, count: data?.length ?? 0, documents: data ?? [] };
  },
};

const getDocumentSections: McpTool = {
  name: "get_document_sections",
  title: "Get document sections",
  description:
    "Return the readable sections of a document in order (heading, heading level and body text). Use include_body=false for a table of contents only.",
  annotations: readOnly,
  inputSchema: {
    type: "object",
    properties: {
      document_id: { type: "string", description: "UUID of the document." },
      include_body: {
        type: "boolean",
        default: true,
        description: "Include section body text (default true).",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 200,
        default: 50,
        description: "Maximum number of sections to return (default 50).",
      },
    },
    required: ["document_id"],
    additionalProperties: false,
  },
  handler: async (args) => {
    const id = str(args, "document_id", true)!;
    const includeBody = args["include_body"] !== false;
    const supabase = supabaseForMcp();
    const { data, error } = await supabase
      .from("document_sections")
      .select("id,position,heading,heading_level,body")
      .eq("document_id", id)
      .order("position", { ascending: true })
      .limit(num(args, "limit", 50, 200));
    if (error) throw new ToolError(error.message);
    const sections = (data ?? []).map((s) => ({
      id: s.id,
      position: s.position,
      heading: s.heading,
      heading_level: s.heading_level,
      ...(includeBody ? { body: s.body } : {}),
    }));
    return { document_id: id, count: sections.length, sections };
  },
};

export const TOOLS: McpTool[] = [listDocuments, getDocument, searchDocuments, getDocumentSections];

/* ------------------------------------------------------------- JSON-RPC */

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

const result = (id: JsonRpcId, value: unknown) => ({ jsonrpc: "2.0", id, result: value });
const failure = (id: JsonRpcId, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

const SERVER_INFO = { name: "paperflow-reading", title: "PaperPlay Reading", version: "1.0.0" };
const INSTRUCTIONS =
  "Read-only access to the PaperPlay reading library. Use list_documents or search_documents to find a document id, then get_document for metadata and get_document_sections for its readable text.";

async function handleMessage(message: JsonRpcRequest): Promise<unknown | null> {
  const id = message.id ?? null;
  const method = message.method ?? "";
  const params = (message.params ?? {}) as Record<string, unknown>;

  // Notifications carry no id and expect no response.
  if (message.id === undefined) return null;

  switch (method) {
    case "initialize": {
      const requested =
        typeof params["protocolVersion"] === "string" ? params["protocolVersion"] : "";
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : MCP_PROTOCOL_VERSION;
      return result(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
        })),
      });
    case "tools/call": {
      const name = typeof params["name"] === "string" ? params["name"] : "";
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return failure(id, -32602, `Unknown tool "${name}".`);
      const args = (params["arguments"] ?? {}) as Record<string, unknown>;
      try {
        const value = await tool.handler(args);
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
          structuredContent: value as Record<string, unknown>,
          isError: false,
        });
      } catch (error) {
        const text = error instanceof ToolError ? error.message : "Tool execution failed.";
        if (!(error instanceof ToolError)) console.error("[mcp] tool error", error);
        return result(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    case "resources/list":
      return result(id, { resources: [] });
    case "prompts/list":
      return result(id, { prompts: [] });
    default:
      return failure(id, -32601, `Method "${method}" is not supported.`);
  }
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Expose-Headers": "mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

const jsonHeaders = {
  ...CORS_HEADERS,
  "content-type": "application/json",
  "mcp-protocol-version": MCP_PROTOCOL_VERSION,
};

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extra } });
}

/** Entry point shared by every mounted MCP route. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS_HEADERS });

  const auth = authenticate(request);
  if (!auth.ok) {
    return jsonResponse(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: auth.message } },
      auth.status,
      auth.status === 401 ? { "WWW-Authenticate": 'Bearer realm="paperplay-mcp"' } : {},
    );
  }

  // No server-initiated stream and no session state to terminate.
  if (request.method === "GET" || request.method === "DELETE") {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000, message: "Use POST for JSON-RPC messages." },
      },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Method not allowed." } },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(failure(null, -32700, "Parse error: body must be JSON."), 400);
  }

  if (Array.isArray(payload)) {
    const responses = (
      await Promise.all((payload as JsonRpcRequest[]).map((m) => handleMessage(m)))
    ).filter((r) => r !== null);
    if (!responses.length) return new Response(null, { status: 202, headers: CORS_HEADERS });
    return jsonResponse(responses);
  }

  if (!payload || typeof payload !== "object") {
    return jsonResponse(failure(null, -32600, "Invalid request."), 400);
  }

  const response = await handleMessage(payload as JsonRpcRequest);
  if (response === null) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return jsonResponse(response);
}
