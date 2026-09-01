import { supabase } from "@/integrations/supabase/client";
import type {
  Accent,
  AnnotationRow,
  DocumentRow,
  DraftSection,
  ProgressRow,
  SectionRow,
  SyncJobRow,
  SyncSourceRow,
} from "./types";
import { readingMinutes } from "./extract";

const ACCENTS: Accent[] = ["lavender", "coral", "ocean", "moss"];
export const pickAccent = (seed: number): Accent =>
  ACCENTS[Math.abs(seed) % ACCENTS.length] as Accent;

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function fetchDocuments(): Promise<DocumentRow[]> {
  return unwrap<DocumentRow[]>(
    await supabase.from("documents").select("*").order("updated_at", { ascending: false }),
  );
}

export async function fetchDocument(id: string): Promise<DocumentRow | null> {
  return unwrap<DocumentRow | null>(
    await supabase.from("documents").select("*").eq("id", id).maybeSingle(),
  );
}

export async function fetchSections(documentId: string): Promise<SectionRow[]> {
  return unwrap<SectionRow[]>(
    await supabase
      .from("document_sections")
      .select("*")
      .eq("document_id", documentId)
      .order("position", { ascending: true }),
  );
}

export async function fetchAllProgress(): Promise<ProgressRow[]> {
  return unwrap<ProgressRow[]>(await supabase.from("reading_progress").select("*"));
}

export async function fetchProgress(documentId: string): Promise<ProgressRow | null> {
  return unwrap<ProgressRow | null>(
    await supabase.from("reading_progress").select("*").eq("document_id", documentId).maybeSingle(),
  );
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function saveProgress(input: {
  documentId: string;
  percent: number;
  minutesRead?: number;
  lastSectionId?: string | null;
  completed?: boolean;
}): Promise<void> {
  const userId = await currentUserId();
  // Reading progress is private per account; anonymous visitors simply don't persist it.
  if (!userId) return;

  const payload: Record<string, unknown> = {
    user_id: userId,
    document_id: input.documentId,
    percent: Math.round(input.percent),
    completed: input.completed ?? input.percent >= 99,
    updated_at: new Date().toISOString(),
  };
  if (input.minutesRead !== undefined) payload["minutes_read"] = input.minutesRead;
  if (input.lastSectionId !== undefined) payload["last_section_id"] = input.lastSectionId;

  const { error } = await supabase
    .from("reading_progress")
    .upsert(payload as never, { onConflict: "user_id,document_id" });
  if (error) throw new Error(error.message);
}


export async function fetchAnnotations(documentId: string): Promise<AnnotationRow[]> {
  return unwrap<AnnotationRow[]>(
    await supabase
      .from("annotations")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false }),
  );
}

export async function addAnnotation(input: {
  documentId: string;
  sectionId?: string | null;
  kind: "bookmark" | "highlight";
  quote?: string | null;
  color?: Accent;
}): Promise<AnnotationRow> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Sign in to save highlights and bookmarks.");

  return unwrap<AnnotationRow>(
    await supabase
      .from("annotations")
      .insert({
        user_id: userId,
        document_id: input.documentId,
        section_id: input.sectionId ?? null,
        kind: input.kind,
        quote: input.quote ?? null,
        color: input.color ?? "lavender",
      } as never)
      .select()
      .single(),
  );
}


export async function removeAnnotation(id: string): Promise<void> {
  const { error } = await supabase.from("annotations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface CreateDocumentInput {
  title: string;
  author?: string | null;
  source: "upload" | "google_docs";
  fileType: DocumentRow["file_type"];
  excerpt: string;
  wordCount: number;
  sections: DraftSection[];
  googleDocId?: string | null;
  googleRevisionId?: string | null;
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRow> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Sign in to add documents to your library.");

  const doc = unwrap<DocumentRow>(
    await supabase
      .from("documents")
      .insert({
        user_id: userId,
        title: input.title,

        author: input.author ?? null,
        source: input.source,
        file_type: input.fileType,
        excerpt: input.excerpt,
        word_count: input.wordCount,
        estimated_minutes: readingMinutes(input.wordCount),
        accent: pickAccent(input.title.length + input.wordCount),
        google_doc_id: input.googleDocId ?? null,
        google_revision_id: input.googleRevisionId ?? null,
        sync_status: input.source === "google_docs" ? "synced" : "idle",
        last_synced_at: input.source === "google_docs" ? new Date().toISOString() : null,
      } as never)
      .select()
      .single(),
  );

  if (input.sections.length) {
    const { error } = await supabase.from("document_sections").insert(
      input.sections.map((s, i) => ({
        document_id: doc.id,
        position: i,
        heading: s.heading,
        heading_level: s.heading_level,
        body: s.body,
      })) as never,
    );
    if (error) throw new Error(error.message);
  }
  return doc;
}

export async function replaceSections(documentId: string, sections: DraftSection[]) {
  await supabase.from("document_sections").delete().eq("document_id", documentId);
  if (!sections.length) return;
  const { error } = await supabase.from("document_sections").insert(
    sections.map((s, i) => ({
      document_id: documentId,
      position: i,
      heading: s.heading,
      heading_level: s.heading_level,
      body: s.body,
    })) as never,
  );
  if (error) throw new Error(error.message);
}

export async function fetchSyncSource(): Promise<SyncSourceRow | null> {
  const userId = await currentUserId();
  // Sync configuration is per account.
  if (!userId) return null;

  const existing = unwrap<SyncSourceRow | null>(
    await supabase
      .from("sync_sources")
      .select("*")
      .eq("provider", "google_docs")
      .eq("user_id", userId)
      .maybeSingle(),
  );
  if (existing) return existing;

  return unwrap<SyncSourceRow>(
    await supabase
      .from("sync_sources")
      .insert({ provider: "google_docs", display_name: "Google Docs", user_id: userId } as never)
      .select()
      .single(),
  );
}


export async function updateSyncSource(
  id: string,
  patch: Partial<
    Pick<SyncSourceRow, "status" | "mode" | "account_label" | "auto_sync" | "last_sync_at">
  >,
): Promise<SyncSourceRow> {
  return unwrap<SyncSourceRow>(
    await supabase
      .from("sync_sources")
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .select()
      .single(),
  );
}

export async function fetchSyncJobs(limit = 8): Promise<SyncJobRow[]> {
  return unwrap<SyncJobRow[]>(
    await supabase
      .from("sync_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit),
  );
}

export async function logSyncJob(input: {
  sourceId: string;
  status: "success" | "error";
  documentsSynced: number;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from("sync_jobs").insert({
    source_id: input.sourceId,
    status: input.status,
    documents_synced: input.documentsSynced,
    message: input.message,
    finished_at: new Date().toISOString(),
  } as never);
  if (error) throw new Error(error.message);
}

export async function touchDocumentSync(
  id: string,
  patch: { revisionId?: string; status?: DocumentRow["sync_status"] },
) {
  const { error } = await supabase
    .from("documents")
    .update({
      google_revision_id: patch.revisionId,
      sync_status: patch.status ?? "synced",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
