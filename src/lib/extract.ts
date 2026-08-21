import type { DraftSection, FileType, ParsedDocument } from "./types";

const WORDS_PER_MINUTE = 225;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function detectFileType(name: string): FileType | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "txt") return "txt";
  if (ext === "md" || ext === "markdown") return "md";
  return null;
}

function titleCaseFromFilename(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Turn a flat block of text into readable, headed sections. */
export function sectionize(raw: string): DraftSection[] {
  const normalized = raw.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const sections: DraftSection[] = [];
  let current: DraftSection = { heading: null, heading_level: 2, body: "" };
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body || current.heading) {
      sections.push({ ...current, body });
    }
    buffer = [];
  };

  const isHeading = (line: string): { text: string; level: number } | null => {
    const t = line.trim();
    if (!t) return null;
    const md = /^(#{1,4})\s+(.*)$/.exec(t);
    if (md) return { text: (md[2] ?? "").trim(), level: Math.min(3, (md[1] ?? "#").length) };
    // Short, punctuation-free, title-ish line surrounded by blanks.
    if (t.length <= 72 && !/[.!?;:,]$/.test(t) && countWords(t) <= 10 && /[A-Za-z]/.test(t)) {
      return { text: t.replace(/^[-*•\s]+/, ""), level: 2 };
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const prevBlank = i === 0 || !(lines[i - 1] ?? "").trim();
    const nextBlank = i === lines.length - 1 || !(lines[i + 1] ?? "").trim();
    const heading = prevBlank && (nextBlank || /^#{1,4}\s/.test(line.trim())) ? isHeading(line) : null;

    if (heading) {
      flush();
      current = { heading: heading.text, heading_level: heading.level, body: "" };
      continue;
    }
    buffer.push(line);
  }
  flush();

  // If nothing was headed, chunk paragraphs into readable groups.
  if (sections.length <= 1 && sections[0] && !sections[0].heading) {
    const paragraphs = sections[0].body.split(/\n{2,}/).filter((p) => p.trim());
    if (paragraphs.length > 4) {
      const chunks: DraftSection[] = [];
      const size = Math.ceil(paragraphs.length / Math.min(6, Math.ceil(paragraphs.length / 3)));
      for (let i = 0; i < paragraphs.length; i += size) {
        chunks.push({
          heading: `Part ${chunks.length + 1}`,
          heading_level: 2,
          body: paragraphs.slice(i, i + size).join("\n\n"),
        });
      }
      return chunks;
    }
  }

  return sections.filter((s) => s.body || s.heading);
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let text = "";
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) text += "\n";
      text += item.str;
      lastY = y;
    }
    pages.push(text);
  }
  return pages.join("\n\n");
}

type MammothBrowser = {
  convertToMarkdown: (i: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

async function extractDocx(file: File): Promise<string> {
  const mod = (await import(
    /* @vite-ignore */ "mammoth/mammoth.browser.js"
  )) as unknown as MammothBrowser & { default?: MammothBrowser };
  const mammoth = mod.default ?? mod;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToMarkdown({ arrayBuffer });
  return result.value;
}

export async function parseFile(file: File): Promise<ParsedDocument> {
  const fileType = detectFileType(file.name);
  if (!fileType) throw new Error("Unsupported file type. Use PDF, DOCX, TXT or Markdown.");

  let raw = "";
  if (fileType === "pdf") raw = await extractPdf(file);
  else if (fileType === "docx") raw = await extractDocx(file);
  else raw = await file.text();

  const cleaned = raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  if (!cleaned) throw new Error("No readable text was found in this file.");

  const sections = sectionize(cleaned);
  const firstHeading = sections.find((s) => s.heading)?.heading ?? null;
  const looksLikeTitle =
    firstHeading && sections[0]?.heading === firstHeading && (sections[0]?.body?.length ?? 0) < 400;

  const wordCount = countWords(cleaned);
  const excerptSource = sections.find((s) => s.body)?.body ?? cleaned;

  return {
    title: looksLikeTitle ? firstHeading : titleCaseFromFilename(file.name),
    author: null,
    fileType,
    sections,
    wordCount,
    excerpt: excerptSource.replace(/\s+/g, " ").slice(0, 220).trim() + "…",
  };
}
