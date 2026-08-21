import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { DropZone } from "./DropZone";
import { parseFile, readingMinutes } from "@/lib/extract";
import { createDocument } from "@/lib/library";
import type { ParsedDocument } from "@/lib/types";
import { toast } from "sonner";

type Phase = "idle" | "parsing" | "ready" | "saving" | "error";

export function UploadDialog({
  open,
  onOpenChange,
  onCreated,
  initialFile = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  initialFile?: File | null;
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [parsed, setParsed] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const handledFile = useRef<File | null>(null);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setPhase("idle");
      setParsed(null);
      setProgress(0);
      setError("");
      setTitle("");
      setAuthor("");
      setFileName("");
    }, 250);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setError("");
    setPhase("parsing");
    setProgress(8);

    const tick = window.setInterval(() => setProgress((p) => Math.min(92, p + 7)), 140);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("That file is larger than 20 MB.");
      const result = await parseFile(file);
      if (!result.sections.length)
        throw new Error("We couldn't find readable sections in this file.");
      setParsed(result);
      setTitle(result.title);
      setProgress(100);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that file.");
      setPhase("error");
    } finally {
      window.clearInterval(tick);
    }
  };

  // A file dropped on the library hero opens this dialog already loaded.
  useEffect(() => {
    if (!open || !initialFile) return;
    if (handledFile.current === initialFile) return;
    handledFile.current = initialFile;
    void handleFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  const save = async () => {
    if (!parsed) return;
    setPhase("saving");
    try {
      const doc = await createDocument({
        title: title.trim() || parsed.title,
        author: author.trim() || null,
        source: "upload",
        fileType: parsed.fileType,
        excerpt: parsed.excerpt,
        wordCount: parsed.wordCount,
        sections: parsed.sections,
      });
      onCreated();
      onOpenChange(false);
      toast.success("Added to your library");
      void navigate({ to: "/read/$documentId", params: { documentId: doc.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
      setPhase("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add a document</DialogTitle>
          <DialogDescription>
            We extract the text, split it into sections, and hand you a clean reading view.
          </DialogDescription>
        </DialogHeader>

        {(phase === "idle" || phase === "error") && (
          <div className="space-y-3">
            <DropZone onFile={handleFile} />
            {phase === "error" && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-2xl bg-coral-soft px-3.5 py-3 text-sm text-coral"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>
        )}

        {phase === "parsing" && (
          <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  Extracting text and finding headings…
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {(phase === "ready" || phase === "saving") && parsed && (
          <div className="space-y-4">
            <div className="animate-pop flex items-center gap-2 rounded-2xl bg-moss-soft px-3.5 py-2.5 text-sm font-medium text-moss">
              <CheckCircle2 className="size-4" /> Parsed {parsed.sections.length} sections
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="doc-title">Title</Label>
                <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-author">Author (optional)</Label>
                <Input
                  id="doc-author"
                  value={author}
                  placeholder="Who wrote this?"
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/70 p-3 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">Format</dt>
                <dd className="font-medium uppercase">{parsed.fileType}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Words</dt>
                <dd className="font-medium tabular-nums">{parsed.wordCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Read time</dt>
                <dd className="font-medium">{readingMinutes(parsed.wordCount)} min</dd>
              </div>
            </dl>

            <div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" /> Preview
              </p>
              {parsed.sections.slice(0, 3).map((s, i) => (
                <div key={i}>
                  {s.heading && <p className="font-display text-sm font-semibold">{s.heading}</p>}
                  <p className="line-clamp-2 text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPhase("idle")}
                disabled={phase === "saving"}
              >
                Choose another
              </Button>
              <Button onClick={save} disabled={phase === "saving"} className="rounded-full">
                {phase === "saving" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Open in reader
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
