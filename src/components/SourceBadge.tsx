import { CloudCheck, CloudAlert, FileText, Loader2, RefreshCw } from "lucide-react";
import type { DocumentRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILE_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  md: "Markdown",
  gdoc: "Google Doc",
};

export function SourceBadge({ doc, className }: { doc: DocumentRow; className?: string }) {
  const isGoogle = doc.source === "google_docs";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium",
        isGoogle
          ? "border-transparent bg-ocean-soft text-ocean"
          : "border-transparent bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {isGoogle ? <CloudCheck className="size-3.5" /> : <FileText className="size-3.5" />}
      {isGoogle ? "Google Docs" : FILE_LABEL[doc.file_type] || "File"}
    </span>
  );
}

export function SyncStatusBadge({ doc }: { doc: DocumentRow }) {
  if (doc.source !== "google_docs") return null;

  if (doc.sync_status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-soft px-2.5 py-1 text-[0.7rem] font-medium text-lavender">
        <Loader2 className="size-3.5 animate-spin" /> Syncing
      </span>
    );
  }
  if (doc.sync_status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-2.5 py-1 text-[0.7rem] font-medium text-coral">
        <CloudAlert className="size-3.5" /> Sync failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft px-2.5 py-1 text-[0.7rem] font-medium text-moss">
      <RefreshCw className="size-3.5" /> {relativeTime(doc.last_synced_at)}
    </span>
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "never synced";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
