import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = {
  client?: { name?: string; client_name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <AppShell>
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">Authorization request failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </main>
    </AppShell>
  ),
  head: () => ({
    meta: [
      { title: "Authorize access · PaperPlay" },
      {
        name: "description",
        content: "Approve or deny an external app's request to use your PaperPlay library.",
      },
      { property: "og:title", content: "Authorize access · PaperPlay" },
      {
        property: "og:description",
        content: "Review and approve connector access to your PaperPlay reading library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? details?.client?.client_name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Connect {clientName} to PaperPlay
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This lets {clientName} use PaperPlay as you — reading your documents, sections and
            search results through the app&rsquo;s MCP tools.
          </p>
          {details?.client?.redirect_uri && (
            <p className="mt-2 break-all text-xs text-muted-foreground">
              Redirects to {details.client.redirect_uri}
            </p>
          )}
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            <li>· Share your basic profile and email address</li>
            <li>· Read documents and highlights your account can access</li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            This does not bypass PaperPlay&rsquo;s permissions or backend policies.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-6 flex gap-2">
            <Button className="flex-1 rounded-full" disabled={busy} onClick={() => decide(true)}>
              Approve
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Cancel connection
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
