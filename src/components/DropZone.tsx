import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.docx,.txt,.md,.markdown";

export function DropZone({
  onFile,
  compact = false,
  disabled = false,
}: {
  onFile: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Upload a document. PDF, DOCX, TXT or Markdown."
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card/70 text-center transition-all duration-300",
        compact ? "gap-2 p-6" : "gap-3 p-10",
        dragging
          ? "scale-[1.01] border-primary bg-lavender-soft/60 shadow-[var(--shadow-lift)]"
          : "border-border hover:border-primary/50 hover:bg-card",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-2xl bg-lavender-soft text-lavender transition-transform duration-300",
          compact ? "size-11" : "size-14",
          dragging ? "-translate-y-1 rotate-3" : "group-hover:-translate-y-0.5",
        )}
      >
        <UploadCloud className={compact ? "size-5" : "size-6"} />
      </span>
      <p className="font-display text-base font-semibold">
        {dragging ? "Drop it right here" : "Drag a document in, or browse"}
      </p>
      <p className="text-sm text-muted-foreground">PDF · DOCX · TXT · Markdown — up to 20 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
