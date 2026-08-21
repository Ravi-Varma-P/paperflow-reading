import { Link } from "@tanstack/react-router";
import { Clock, MoreHorizontal, Trash2 } from "lucide-react";
import type { DocumentRow, ProgressRow } from "@/lib/types";
import { ProgressRing } from "./ProgressRing";
import { SourceBadge, SyncStatusBadge } from "./SourceBadge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCENT_BAR: Record<string, string> = {
  lavender: "from-lavender to-ocean",
  coral: "from-coral to-lavender",
  ocean: "from-ocean to-moss",
  moss: "from-moss to-ocean",
};

export function DocumentCard({
  doc,
  progress,
  onDelete,
}: {
  doc: DocumentRow;
  progress?: ProgressRow;
  onDelete: (doc: DocumentRow) => void;
}) {
  const percent = progress?.percent ?? 0;

  return (
    <article className="card-lift group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div
        className={cn("h-1.5 w-full bg-linear-to-r", ACCENT_BAR[doc.accent] ?? ACCENT_BAR['lavender'])}
      />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge doc={doc} />
            <SyncStatusBadge doc={doc} />
          </div>
          <div className="flex items-center gap-1">
            <ProgressRing value={percent} size={38} />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${doc.title}`}
                className="rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(doc)}>
                  <Trash2 className="size-4" /> Remove from library
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="font-display text-lg leading-snug font-semibold text-balance">
            <Link
              to="/read/$documentId"
              params={{ documentId: doc.id }}
              className="after:absolute after:inset-0 hover:text-primary focus-visible:text-primary"
            >
              {doc.title}
            </Link>
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {doc.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="truncate">{doc.author ?? "Unknown author"}</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Clock className="size-3.5" />
            {doc.estimated_minutes} min
          </span>
        </div>
      </div>
    </article>
  );
}
