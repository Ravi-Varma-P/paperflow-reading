-- Ownership columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.reading_progress ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.annotations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.sync_sources ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.sync_jobs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Legacy demo rows that carry per-user meaning cannot belong to anyone: remove them
DELETE FROM public.reading_progress WHERE user_id IS NULL;
DELETE FROM public.annotations WHERE user_id IS NULL;
DELETE FROM public.sync_jobs WHERE user_id IS NULL;
DELETE FROM public.sync_sources WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS reading_progress_user_id_idx ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS annotations_user_id_idx ON public.annotations(user_id);

-- Per-user uniqueness for progress upserts
ALTER TABLE public.reading_progress DROP CONSTRAINT IF EXISTS reading_progress_document_id_key;
DROP INDEX IF EXISTS public.reading_progress_document_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reading_progress_user_document_key ON public.reading_progress(user_id, document_id);

-- Drop permissive demo policies
DROP POLICY IF EXISTS "demo open access" ON public.documents;
DROP POLICY IF EXISTS "demo open access" ON public.document_sections;
DROP POLICY IF EXISTS "demo open access" ON public.reading_progress;
DROP POLICY IF EXISTS "demo open access" ON public.annotations;
DROP POLICY IF EXISTS "demo open access" ON public.sync_sources;
DROP POLICY IF EXISTS "demo open access" ON public.sync_jobs;

-- Grants: anon may only read the public sample library
REVOKE INSERT, UPDATE, DELETE ON public.documents, public.document_sections FROM anon;
REVOKE ALL ON public.reading_progress, public.annotations, public.sync_sources, public.sync_jobs FROM anon;

-- documents
CREATE POLICY "Sample documents are public" ON public.documents
  FOR SELECT TO anon, authenticated USING (user_id IS NULL);
CREATE POLICY "Users read own documents" ON public.documents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own documents" ON public.documents
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own documents" ON public.documents
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- document_sections follow their parent document
CREATE POLICY "Sample sections are public" ON public.document_sections
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id IS NULL)
  );
CREATE POLICY "Users read own sections" ON public.document_sections
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Users insert own sections" ON public.document_sections
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Users update own sections" ON public.document_sections
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );
CREATE POLICY "Users delete own sections" ON public.document_sections
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );

-- reading_progress / annotations / sync_sources / sync_jobs: owner only
CREATE POLICY "Users manage own reading progress" ON public.reading_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own annotations" ON public.annotations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own sync sources" ON public.sync_sources
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own sync jobs" ON public.sync_jobs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());