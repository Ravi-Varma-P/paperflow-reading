import { getGoogleDocsConnector } from "./google-docs";
import {
  createDocument,
  fetchDocuments,
  logSyncJob,
  replaceSections,
  touchDocumentSync,
  updateSyncSource,
} from "./library";
import { countWords } from "./extract";
import { supabase } from "@/integrations/supabase/client";

export interface SyncOutcome {
  added: number;
  updated: number;
  unchanged: number;
}

export async function runGoogleSync(sourceId: string): Promise<SyncOutcome> {
  const connector = getGoogleDocsConnector();
  const outcome: SyncOutcome = { added: 0, updated: 0, unchanged: 0 };

  try {
    const remote = await connector.listDocuments();
    const local = await fetchDocuments();
    const byGoogleId = new Map(
      local.filter((d) => d.google_doc_id).map((d) => [d.google_doc_id as string, d]),
    );

    for (const doc of remote) {
      const existing = byGoogleId.get(doc.id);
      const text = doc.sections.map((s) => `${s.heading ?? ""}\n${s.body}`).join("\n\n");

      if (!existing) {
        await createDocument({
          title: doc.title,
          author: doc.author,
          source: "google_docs",
          fileType: "gdoc",
          excerpt: (doc.sections[0]?.body ?? "").replace(/\s+/g, " ").slice(0, 200) + "…",
          wordCount: countWords(text),
          sections: doc.sections,
          googleDocId: doc.id,
          googleRevisionId: doc.revisionId,
        });
        outcome.added++;
        continue;
      }

      if (existing.google_revision_id !== doc.revisionId) {
        await replaceSections(existing.id, doc.sections);
        await supabase
          .from("documents")
          .update({
            title: doc.title,
            author: doc.author,
            word_count: countWords(text),
          } as never)
          .eq("id", existing.id);
        await touchDocumentSync(existing.id, { revisionId: doc.revisionId, status: "synced" });
        outcome.updated++;
      } else {
        await touchDocumentSync(existing.id, { revisionId: doc.revisionId, status: "synced" });
        outcome.unchanged++;
      }
    }

    await updateSyncSource(sourceId, { last_sync_at: new Date().toISOString() });
    await logSyncJob({
      sourceId,
      status: "success",
      documentsSynced: outcome.added + outcome.updated,
      message: `${outcome.added} added · ${outcome.updated} updated · ${outcome.unchanged} unchanged`,
    });
    return outcome;
  } catch (error) {
    await logSyncJob({
      sourceId,
      status: "error",
      documentsSynced: 0,
      message: error instanceof Error ? error.message : "Sync failed",
    });
    throw error;
  }
}
