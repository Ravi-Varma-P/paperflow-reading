export type DocSource = "upload" | "google_docs";
export type FileType = "pdf" | "docx" | "txt" | "md" | "gdoc";
export type Accent = "lavender" | "coral" | "ocean" | "moss";
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export interface DocumentRow {
  id: string;
  title: string;
  author: string | null;
  source: DocSource;
  file_type: FileType;
  excerpt: string | null;
  word_count: number;
  estimated_minutes: number;
  accent: Accent;
  google_doc_id: string | null;
  google_revision_id: string | null;
  sync_status: SyncStatus;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  document_id: string;
  position: number;
  heading: string | null;
  heading_level: number;
  body: string;
}

export interface ProgressRow {
  id: string;
  document_id: string;
  percent: number;
  minutes_read: number;
  last_section_id: string | null;
  completed: boolean;
  updated_at: string;
}

export interface AnnotationRow {
  id: string;
  document_id: string;
  section_id: string | null;
  kind: "bookmark" | "highlight";
  quote: string | null;
  note: string | null;
  color: Accent;
  created_at: string;
}

export interface SyncSourceRow {
  id: string;
  provider: string;
  display_name: string;
  account_label: string | null;
  status: "connected" | "disconnected" | "error";
  mode: "demo" | "live";
  auto_sync: boolean;
  last_sync_at: string | null;
}

export interface SyncJobRow {
  id: string;
  source_id: string | null;
  status: "running" | "success" | "error";
  documents_synced: number;
  message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface DraftSection {
  heading: string | null;
  heading_level: number;
  body: string;
}

export interface ParsedDocument {
  title: string;
  author: string | null;
  fileType: FileType;
  sections: DraftSection[];
  wordCount: number;
  excerpt: string;
}
