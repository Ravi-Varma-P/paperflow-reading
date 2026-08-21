import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CloudCog,
  FlaskConical,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getGoogleDocsConnector } from "@/lib/google-docs";
import { fetchDocuments, fetchSyncSource, updateSyncSource } from "@/lib/library";
import { runGoogleSync } from "@/lib/sync";
import { relativeTime } from "./SourceBadge";
import { toast } from "sonner";

export function GoogleSyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const connector = getGoogleDocsConnector();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const sourceQuery = useQuery({ queryKey: ["sync-source"], queryFn: fetchSyncSource });
  const docsQuery = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const source = sourceQuery.data;
  const googleDocs = (docsQuery.data ?? []).filter((d) => d.source === "google_docs");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["documents"] });
    void queryClient.invalidateQueries({ queryKey: ["sync-source"] });
    void queryClient.invalidateQueries({ queryKey: ["sync-jobs"] });
  };

  const connect = useMutation({
    mutationFn: async () => {
      if (!source) throw new Error("Sync source is unavailable.");
      const result = await connector.connect();
      await updateSyncSource(source.id, {
        status: "connected",
        mode: connector.mode,
        account_label: result.accountLabel,
      });
      return runGoogleSync(source.id);
    },
    onSuccess: (outcome) => {
      invalidate();
      toast.success(`Connected — ${outcome.added + outcome.updated} documents pulled in`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      if (!source) throw new Error("Sync source is unavailable.");
      return runGoogleSync(source.id);
    },
    onSuccess: (o) => {
      invalidate();
      toast.success(`Sync complete · ${o.added} new, ${o.updated} updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = async () => {
    if (!source) return;
    setBusy(true);
    try {
      await connector.disconnect();
      await updateSyncSource(source.id, { status: "disconnected", account_label: null });
      invalidate();
      toast("Google Docs disconnected. Synced documents stay in your library.");
    } finally {
      setBusy(false);
    }
  };

  const connected = source?.status === "connected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-ocean-soft text-ocean">
              <CloudCog className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-display text-xl">Google Docs sync</DialogTitle>
              <DialogDescription>
                Keep your docs flowing into PaperPlay automatically.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {connector.mode === "demo" && (
          <p className="flex items-start gap-2 rounded-2xl bg-accent px-3.5 py-3 text-sm text-accent-foreground">
            <FlaskConical className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">Demo mode.</strong> No Google account is contacted.
              This connects to a realistic sample workspace so you can see the full sync flow. Real
              OAuth drops into the same interface without UI changes.
            </span>
          </p>
        )}

        {sourceQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-10 rounded-full" />
          </div>
        ) : !connected ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="size-4 text-moss" /> PaperPlay will ask to:
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {connector.requiredScopes.map((scope) => (
                  <li key={scope} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-moss" />
                    {scope}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Read-only. PaperPlay never edits or deletes anything in your Drive.
              </p>
            </div>
            <Button
              className="w-full rounded-full"
              size="lg"
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
            >
              {connect.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CloudCog className="size-4" />
              )}
              Connect Google Docs
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{source?.account_label}</p>
                <p className="text-sm text-muted-foreground">
                  Last sync {relativeTime(source?.last_sync_at ?? null)}
                </p>
              </div>
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => syncNow.mutate()}
                disabled={syncNow.isPending}
              >
                <RefreshCw className={syncNow.isPending ? "size-4 animate-spin" : "size-4"} />
                Sync now
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
              <div>
                <Label htmlFor="auto-sync" className="font-medium">
                  Auto-sync
                </Label>
                <p className="text-sm text-muted-foreground">
                  Check for new docs and revisions when you open the library.
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={source?.auto_sync ?? false}
                onCheckedChange={async (checked) => {
                  if (!source) return;
                  await updateSyncSource(source.id, { auto_sync: checked });
                  invalidate();
                }}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Synced documents ({googleDocs.length})
              </p>
              <ul className="max-h-48 divide-y divide-border overflow-y-auto">
                {googleDocs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 truncate text-sm">{doc.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {doc.google_revision_id} · {relativeTime(doc.last_synced_at)}
                    </span>
                  </li>
                ))}
                {!googleDocs.length && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nothing synced yet.
                  </li>
                )}
              </ul>
            </div>

            <Button
              variant="ghost"
              className="w-full rounded-full text-muted-foreground"
              onClick={disconnect}
              disabled={busy}
            >
              <Unplug className="size-4" /> Disconnect
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
