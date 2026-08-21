import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Focus,
  Highlighter,
  List,
  Minus,
  Plus,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { SourceBadge, relativeTime } from "@/components/SourceBadge";
import {
  addAnnotation,
  fetchAnnotations,
  fetchDocument,
  fetchProgress,
  fetchSections,
  removeAnnotation,
  saveProgress,
} from "@/lib/library";
import { useReaderPrefs, useReadingStats, type ReaderTheme } from "@/hooks/useReaderPrefs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/read/$documentId")({
  head: () => ({
    meta: [
      { title: "Reading — PaperPlay" },
      { name: "description", content: "A calm, focused reader for your documents." },
      { property: "og:title", content: "Reading — PaperPlay" },
      { property: "og:description", content: "A calm, focused reader for your documents." },
    ],
  }),
  component: ReaderPage,
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">This document didn't open</h1>
        <p className="mt-2 text-muted-foreground">Something went wrong loading the text.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Back to library
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <p>We couldn't find that document.</p>
    </div>
  ),
});

const THEMES: { id: ReaderTheme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "sepia", label: "Sepia" },
  { id: "dark", label: "Dark" },
];

function ReaderPage() {
  const { documentId } = Route.useParams();
  const queryClient = useQueryClient();
  const { prefs, update } = useReaderPrefs();
  const [percent, setPercent] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set());
  const celebrated = useRef(false);
  const articleRef = useRef<HTMLElement>(null);

  const docQuery = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => fetchDocument(documentId),
  });
  const sectionsQuery = useQuery({
    queryKey: ["sections", documentId],
    queryFn: () => fetchSections(documentId),
  });
  const progressQuery = useQuery({
    queryKey: ["progress", documentId],
    queryFn: () => fetchProgress(documentId),
  });
  const annotationsQuery = useQuery({
    queryKey: ["annotations", documentId],
    queryFn: () => fetchAnnotations(documentId),
  });

  useReadingStats(true);

  const doc = docQuery.data;
  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);
  const bookmarked = (annotationsQuery.data ?? []).find((a) => a.kind === "bookmark" && !a.section_id);

  useEffect(() => {
    if (progressQuery.data) setPercent(progressQuery.data.percent);
  }, [progressQuery.data]);

  const persist = useCallback(
    (value: number) => {
      void saveProgress({ documentId, percent: value }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["progress"] });
      });
    },
    [documentId, queryClient],
  );

  // Scroll-driven progress + section completion
  useEffect(() => {
    if (!sections.length) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const el = articleRef.current;
        if (!el) return;
        const total = el.scrollHeight - window.innerHeight + el.offsetTop;
        const value = Math.max(0, Math.min(100, ((window.scrollY - 0) / Math.max(1, total)) * 100));
        setPercent((prev) => (Math.abs(prev - value) > 0.6 ? value : prev));

        const next = new Set<string>();
        for (const s of sections) {
          const node = document.getElementById(`section-${s.id}`);
          if (node && node.getBoundingClientRect().bottom < window.innerHeight * 0.6) next.add(s.id);
        }
        setDoneSections(next);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  // Persist progress occasionally + celebrate at the end
  useEffect(() => {
    if (!sections.length) return;
    const id = window.setTimeout(() => persist(percent), 1200);
    if (percent >= 98 && !celebrated.current) {
      celebrated.current = true;
      setCelebrate(true);
      void saveProgress({ documentId, percent: 100, completed: true });
    }
    return () => window.clearTimeout(id);
  }, [percent, sections.length, persist, documentId]);

  // Selection toolbar
  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!text || text.length < 3 || !sel?.rangeCount) return setSelection(null);
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "f") update({ focusMode: !prefs.focusMode });
      if (e.key === "t") setTocOpen((o) => !o);
      if (e.key === "+" || e.key === "=") update({ fontSize: Math.min(26, prefs.fontSize + 1) });
      if (e.key === "-") update({ fontSize: Math.max(15, prefs.fontSize - 1) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs, update]);

  const toggleBookmark = async () => {
    if (bookmarked) {
      await removeAnnotation(bookmarked.id);
      toast("Bookmark removed");
    } else {
      await addAnnotation({ documentId, kind: "bookmark" });
      toast.success("Bookmarked");
    }
    void queryClient.invalidateQueries({ queryKey: ["annotations", documentId] });
  };

  const highlight = async () => {
    if (!selection) return;
    await addAnnotation({ documentId, kind: "highlight", quote: selection.text });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    void queryClient.invalidateQueries({ queryKey: ["annotations", documentId] });
    toast.success("Highlight saved");
  };

  if (docQuery.isLoading || sectionsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-24">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-4 w-1/3 rounded-xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Document not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const headings = sections.filter((s) => s.heading);

  return (
    <div className={cn("reader-surface min-h-screen", `reader-${prefs.theme}`)}>
      <Confetti fire={celebrate} onDone={() => setCelebrate(false)} />

      <div
        className="fixed inset-x-0 top-0 z-50 h-1 origin-left bg-linear-to-r from-lavender to-coral transition-transform duration-150"
        style={{ transform: `scaleX(${percent / 100})` }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />

      <header
        className={cn(
          "sticky top-0 z-40 border-b border-current/10 backdrop-blur-md transition-opacity duration-300",
          prefs.focusMode && "opacity-0 hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium opacity-80 transition hover:opacity-100"
          >
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Library</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {headings.length > 1 && (
              <Popover open={tocOpen} onOpenChange={setTocOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <List className="size-4" />
                    <span className="hidden sm:inline">Contents</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="max-h-80 w-72 overflow-y-auto rounded-2xl">
                  <nav aria-label="Table of contents" className="space-y-0.5">
                    {headings.map((s) => (
                      <a
                        key={s.id}
                        href={`#section-${s.id}`}
                        onClick={() => setTocOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition hover:bg-secondary",
                          s.heading_level >= 3 && "pl-6 text-muted-foreground",
                        )}
                      >
                        {doneSections.has(s.id) ? (
                          <Check className="size-3.5 shrink-0 text-moss" />
                        ) : (
                          <span className="size-3.5 shrink-0 rounded-full border border-current/30" />
                        )}
                        <span className="truncate">{s.heading}</span>
                      </a>
                    ))}
                  </nav>
                </PopoverContent>
              </Popover>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <Type className="size-4" />
                  <span className="hidden sm:inline">Display</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-5 rounded-2xl">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Text size</span>
                    <span className="tabular-nums text-muted-foreground">{prefs.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Decrease text size"
                      className="rounded-full"
                      onClick={() => update({ fontSize: Math.max(15, prefs.fontSize - 1) })}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Slider
                      value={[prefs.fontSize]}
                      min={15}
                      max={26}
                      step={1}
                      aria-label="Text size"
                      onValueChange={([v]) => update({ fontSize: v ?? prefs.fontSize })}
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Increase text size"
                      className="rounded-full"
                      onClick={() => update({ fontSize: Math.min(26, prefs.fontSize + 1) })}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Line height</span>
                    <span className="tabular-nums text-muted-foreground">
                      {prefs.lineHeight.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[prefs.lineHeight]}
                    min={1.4}
                    max={2.1}
                    step={0.05}
                    aria-label="Line height"
                    onValueChange={([v]) => update({ lineHeight: v ?? prefs.lineHeight })}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => update({ theme: t.id })}
                        aria-pressed={prefs.theme === t.id}
                        className={cn(
                          "rounded-xl border px-2 py-2 text-sm transition",
                          prefs.theme === t.id
                            ? "border-primary bg-secondary font-medium"
                            : "border-border hover:bg-secondary/60",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-pressed={prefs.focusMode}
              onClick={() => update({ focusMode: !prefs.focusMode })}
            >
              <Focus className={cn("size-4", prefs.focusMode && "text-lavender")} />
              <span className="hidden sm:inline">Focus</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-pressed={!!bookmarked}
              onClick={toggleBookmark}
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-coral text-coral")} />
            </Button>

            <ProgressRing value={percent} size={34} />
          </div>
        </div>
      </header>

      <article ref={articleRef} className="mx-auto w-full max-w-2xl px-5 pt-12 pb-32 sm:px-6">
        <header className="mb-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge doc={doc} />
            <span className="text-sm opacity-70">
              {doc.estimated_minutes} min read
              {doc.source === "google_docs" && ` · synced ${relativeTime(doc.last_synced_at)}`}
            </span>
          </div>
          <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {doc.title}
          </h1>
          {doc.author && <p className="text-lg opacity-70">by {doc.author}</p>}
        </header>

        <div
          className="reader-prose"
          style={{ fontSize: `${prefs.fontSize}px`, lineHeight: prefs.lineHeight }}
        >
          {sections.map((s) => (
            <section
              key={s.id}
              id={`section-${s.id}`}
              className={cn(
                "mb-10 scroll-mt-24 transition-opacity duration-500",
                doneSections.has(s.id) && "section-complete",
              )}
            >
              {s.heading &&
                (s.heading_level <= 2 ? (
                  <h2 className="font-display mb-3 text-2xl font-semibold tracking-tight">
                    {s.heading}
                  </h2>
                ) : (
                  <h3 className="font-display mb-2 text-xl font-semibold">{s.heading}</h3>
                ))}
              {s.body.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mb-5">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>

        {percent >= 98 && (
          <div className="animate-pop rounded-3xl border border-current/10 p-8 text-center">
            <h2 className="font-display text-2xl font-semibold">You finished it 🎉</h2>
            <p className="mt-2 opacity-70">Nice work. That's {doc.estimated_minutes} minutes well spent.</p>
            <Link
              to="/"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Back to library
            </Link>
          </div>
        )}
      </article>

      {selection && (
        <div
          className="animate-pop fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-border bg-popover p-1 shadow-[var(--shadow-lift)]"
          style={{ left: selection.x, top: selection.y }}
        >
          <Button size="sm" variant="ghost" className="rounded-full" onClick={highlight}>
            <Highlighter className="size-4" /> Highlight
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={async () => {
              await addAnnotation({ documentId, kind: "bookmark", quote: selection.text });
              setSelection(null);
              toast.success("Saved to bookmarks");
              void queryClient.invalidateQueries({ queryKey: ["annotations", documentId] });
            }}
          >
            <Bookmark className="size-4" /> Bookmark
          </Button>
        </div>
      )}
    </div>
  );
}
