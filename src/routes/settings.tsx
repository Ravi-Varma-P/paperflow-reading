import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleUser, CloudCog, FlaskConical, HardDrive, Palette, Radio } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GoogleSyncDialog } from "@/components/GoogleSyncDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useReaderPrefs, type ReaderTheme } from "@/hooks/useReaderPrefs";
import { fetchDocuments, fetchSyncJobs, fetchSyncSource, updateSyncSource } from "@/lib/library";
import { getGoogleDocsConnector } from "@/lib/google-docs";
import { relativeTime } from "@/components/SourceBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — PaperPlay" },
      {
        name: "description",
        content: "Tune your reading preferences, Google Docs sync and storage in PaperPlay.",
      },
      { property: "og:title", content: "Settings — PaperPlay" },
      {
        property: "og:description",
        content: "Tune your reading preferences, Google Docs sync and storage in PaperPlay.",
      },
    ],
  }),
  component: SettingsPage,
});

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator className="my-5" />
      {children}
    </section>
  );
}

const THEMES: ReaderTheme[] = ["light", "sepia", "dark"];

function SettingsPage() {
  const { prefs, update } = useReaderPrefs();
  const queryClient = useQueryClient();
  const connector = getGoogleDocsConnector();
  const [syncOpen, setSyncOpen] = useState(false);

  const sourceQuery = useQuery({ queryKey: ["sync-source"], queryFn: fetchSyncSource });
  const jobsQuery = useQuery({ queryKey: ["sync-jobs"], queryFn: () => fetchSyncJobs(5) });
  const docsQuery = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });

  const source = sourceQuery.data;
  const docs = docsQuery.data ?? [];
  const uploads = docs.filter((d) => d.source === "upload").length;
  const gdocs = docs.length - uploads;
  const words = docs.reduce((s, d) => s + d.word_count, 0);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12 sm:px-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Reading defaults, sync behaviour and what's stored in your library.
          </p>
        </header>

        <Section
          icon={<Palette className="size-5 text-lavender" />}
          title="Reading preferences"
          description="Defaults applied every time you open the reader."
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <Label>Text size</Label>
                <span className="tabular-nums text-muted-foreground">{prefs.fontSize}px</span>
              </div>
              <Slider
                value={[prefs.fontSize]}
                min={15}
                max={26}
                step={1}
                aria-label="Default text size"
                onValueChange={([v]) => update({ fontSize: v ?? prefs.fontSize })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <Label>Line height</Label>
                <span className="tabular-nums text-muted-foreground">
                  {prefs.lineHeight.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[prefs.lineHeight]}
                min={1.4}
                max={2.1}
                step={0.05}
                aria-label="Default line height"
                onValueChange={([v]) => update({ lineHeight: v ?? prefs.lineHeight })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reader theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    aria-pressed={prefs.theme === t}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm capitalize transition",
                      prefs.theme === t
                        ? "border-primary bg-secondary font-medium"
                        : "border-border hover:bg-secondary/60",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="focus-default">Start in focus mode</Label>
                <p className="text-sm text-muted-foreground">
                  Hides the reader chrome until you move your pointer.
                </p>
              </div>
              <Switch
                id="focus-default"
                checked={prefs.focusMode}
                onCheckedChange={(v) => update({ focusMode: v })}
              />
            </div>
          </div>
        </Section>

        <Section
          icon={<CloudCog className="size-5 text-ocean" />}
          title="Google Docs sync"
          description="Bring documents in automatically and keep revisions up to date."
        >
          {sourceQuery.isLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {source?.status === "connected" ? source.account_label : "Not connected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last sync {relativeTime(source?.last_sync_at ?? null)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setSyncOpen(true)}
                >
                  {source?.status === "connected" ? "Manage" : "Connect"}
                </Button>
              </div>

              {source?.status === "connected" && (
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/60 px-4 py-3">
                  <Label htmlFor="auto-sync-settings">Auto-sync new docs and revisions</Label>
                  <Switch
                    id="auto-sync-settings"
                    checked={source.auto_sync}
                    onCheckedChange={async (checked) => {
                      await updateSyncSource(source.id, { auto_sync: checked });
                      void queryClient.invalidateQueries({ queryKey: ["sync-source"] });
                    }}
                  />
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Recent sync activity
                </p>
                <ul className="space-y-1.5 text-sm">
                  {(jobsQuery.data ?? []).map((job) => (
                    <li key={job.id} className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          job.status === "error" ? "text-coral" : "text-muted-foreground",
                        )}
                      >
                        <Radio className="mt-0.5 size-3.5 shrink-0" />
                        {job.message}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {relativeTime(job.started_at)}
                      </span>
                    </li>
                  ))}
                  {!jobsQuery.data?.length && (
                    <li className="text-muted-foreground">No syncs yet.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </Section>

        <Section
          icon={<FlaskConical className="size-5 text-coral" />}
          title="Integration status"
          description="Developer-facing view of which connector implementation is live."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Google Docs connector</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    connector.mode === "live" ? "bg-moss" : "bg-coral",
                  )}
                />
                {connector.mode === "live" ? "Connected (live OAuth)" : "Demo mode"}
              </dd>
              <p className="mt-2 text-xs text-muted-foreground">
                {connector.mode === "live"
                  ? "Requests hit the Google Docs API with real credentials."
                  : "No Google credentials in this environment. Sample workspace data is used behind the same GoogleDocsConnector interface."}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Scopes requested</dt>
              <dd className="mt-1 space-y-1 text-sm">
                {connector.requiredScopes.map((s) => (
                  <p key={s}>{s}</p>
                ))}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          icon={<HardDrive className="size-5 text-moss" />}
          title="Storage & sources"
          description="What's currently held in your PaperPlay library."
        >
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Uploaded files</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">{uploads}</dd>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Google Docs</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">{gdocs}</dd>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <dt className="text-xs text-muted-foreground">Words stored</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                {words.toLocaleString()}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          icon={<CircleUser className="size-5 text-lavender" />}
          title="Account"
          description="Profile and multi-device sync are coming next."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Reading on this device</p>
              <p className="text-sm text-muted-foreground">
                Preferences and streaks are stored locally; documents live in your library database.
              </p>
            </div>
            <Button variant="secondary" className="rounded-full" disabled>
              Sign in
            </Button>
          </div>
        </Section>
      </div>

      <GoogleSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </AppShell>
  );
}
