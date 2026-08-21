import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CloudCog, Flame, Plus, Search, Sparkles, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DocumentCard } from "@/components/DocumentCard";
import { DropZone } from "@/components/DropZone";
import { UploadDialog } from "@/components/UploadDialog";
import { GoogleSyncDialog } from "@/components/GoogleSyncDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteDocument, fetchAllProgress, fetchDocuments, fetchSyncSource } from "@/lib/library";
import { useReadingStats } from "@/hooks/useReaderPrefs";
import type { DocumentRow } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PaperPlay — Your documents, beautifully readable" },
      {
        name: "description",
        content:
          "Upload PDFs, Word files, text and Markdown, or sync Google Docs, and read them in a calm, focused reading experience.",
      },
      { property: "og:title", content: "PaperPlay — Your documents, beautifully readable" },
      {
        property: "og:description",
        content:
          "Upload documents or sync Google Docs and turn them into a calm, focused reading experience.",
      },
    ],
  }),
  component: LibraryPage,
});

type Filter = "all" | "upload" | "google_docs" | "reading";

const LIBRARY_STATE_KEY = "paperplay.library.state";

function LibraryPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [syncOpen, setSyncOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const stats = useReadingStats(false);

  // Restore the search/filter the reader was opened from.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(LIBRARY_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { query?: string; filter?: Filter };
      if (saved.query) setQuery(saved.query);
      if (saved.filter) setFilter(saved.filter);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(LIBRARY_STATE_KEY, JSON.stringify({ query, filter }));
    } catch {
      /* ignore */
    }
  }, [query, filter]);

  const docsQuery = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const progressQuery = useQuery({ queryKey: ["progress"], queryFn: fetchAllProgress });
  const sourceQuery = useQuery({ queryKey: ["sync-source"], queryFn: fetchSyncSource });

  const progressByDoc = useMemo(
    () => new Map((progressQuery.data ?? []).map((p) => [p.document_id, p])),
    [progressQuery.data],
  );

  const remove = useMutation({
    mutationFn: (doc: DocumentRow) => deleteDocument(doc.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast("Removed from your library");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const docs = docsQuery.data ?? [];
  const visible = docs.filter((doc) => {
    const q = query.trim().toLowerCase();
    const matches =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      (doc.author ?? "").toLowerCase().includes(q) ||
      (doc.excerpt ?? "").toLowerCase().includes(q);
    if (!matches) return false;
    if (filter === "upload") return doc.source === "upload";
    if (filter === "google_docs") return doc.source === "google_docs";
    if (filter === "reading") {
      const p = progressByDoc.get(doc.id);
      return !!p && p.percent > 0 && !p.completed;
    }
    return true;
  });

  const minutesTotal = (progressQuery.data ?? []).reduce((sum, p) => sum + p.minutes_read, 0);
  const connected = sourceQuery.data?.status === "connected";

  return (
    <AppShell>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-20">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-sm font-medium shadow-[var(--shadow-soft)]">
              <Sparkles className="size-4 text-coral" />
              Reading, minus the clutter
            </span>
            <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Every document you own, turned into a{" "}
              <span className="text-lavender">beautiful read</span>.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Drop in a PDF, Word file, note or Markdown draft — or connect Google Docs — and
              PaperPlay reshapes the text into clean sections with progress, highlights and a reader
              built for actually finishing things.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full"
                onClick={() => {
                  setPendingFile(null);
                  setUploadOpen(true);
                }}
              >
                <Plus className="size-4" /> Upload document
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full"
                onClick={() => setSyncOpen(true)}
              >
                <CloudCog className="size-4" />
                {connected ? "Manage Google Docs" : "Connect Google Docs"}
              </Button>
            </div>
            <dl className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-coral-soft text-coral">
                  <Flame className="size-4.5" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">Reading streak</dt>
                  <dd className="font-display font-semibold">
                    {stats.streak} day{stats.streak === 1 ? "" : "s"}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-lavender-soft text-lavender">
                  <Timer className="size-4.5" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">Minutes read</dt>
                  <dd className="font-display font-semibold tabular-nums">{minutesTotal}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-moss-soft text-moss">
                  <BookOpen className="size-4.5" />
                </span>
                <div>
                  <dt className="text-xs text-muted-foreground">In your library</dt>
                  <dd className="font-display font-semibold tabular-nums">{docs.length}</dd>
                </div>
              </div>
            </dl>
          </div>

          <DropZone
            onFile={(file) => {
              setPendingFile(file);
              setUploadOpen(true);
            }}
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl font-semibold">Your library</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents"
                aria-label="Search documents"
                className="w-full rounded-full pl-9 sm:w-64"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="rounded-full">
                <TabsTrigger value="all" className="rounded-full">
                  All
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-full">
                  Uploads
                </TabsTrigger>
                <TabsTrigger value="google_docs" className="rounded-full">
                  Google
                </TabsTrigger>
                <TabsTrigger value="reading" className="rounded-full">
                  In progress
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="mt-6">
          {docsQuery.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-56 rounded-3xl" />
              ))}
            </div>
          ) : docsQuery.isError ? (
            <p role="alert" className="rounded-3xl bg-coral-soft p-6 text-center text-coral">
              We couldn't load your library. Please refresh and try again.
            </p>
          ) : visible.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  {...(progressByDoc.get(doc.id) ? { progress: progressByDoc.get(doc.id)! } : {})}
                  onDelete={(d) => remove.mutate(d)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-4xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-lavender-soft text-lavender">
                <BookOpen className="size-7" />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">
                {docs.length ? "Nothing matches that" : "Your shelf is waiting"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                {docs.length
                  ? "Try a different search or clear the filters."
                  : "Add your first document and PaperPlay will turn it into a calm, sectioned read."}
              </p>
              {!docs.length && (
                <Button
                  className="mt-6 rounded-full"
                  onClick={() => {
                    setPendingFile(null);
                    setUploadOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Upload your first document
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      <UploadDialog
        open={uploadOpen}
        initialFile={pendingFile}
        onOpenChange={(next) => {
          setUploadOpen(next);
          if (!next) setPendingFile(null);
        }}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["documents"] })}
      />
      <GoogleSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </AppShell>
  );
}
