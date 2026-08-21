
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  source text NOT NULL DEFAULT 'upload',
  file_type text NOT NULL DEFAULT 'txt',
  excerpt text,
  word_count integer NOT NULL DEFAULT 0,
  estimated_minutes integer NOT NULL DEFAULT 1,
  accent text NOT NULL DEFAULT 'lavender',
  google_doc_id text,
  google_revision_id text,
  sync_status text NOT NULL DEFAULT 'idle',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  heading text,
  heading_level integer NOT NULL DEFAULT 2,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX document_sections_document_idx ON public.document_sections(document_id, position);

CREATE TABLE public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  percent integer NOT NULL DEFAULT 0,
  minutes_read integer NOT NULL DEFAULT 0,
  last_section_id uuid,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  section_id uuid,
  kind text NOT NULL DEFAULT 'highlight',
  quote text,
  note text,
  color text NOT NULL DEFAULT 'lavender',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'google_docs',
  display_name text NOT NULL DEFAULT 'Google Docs',
  account_label text,
  status text NOT NULL DEFAULT 'disconnected',
  mode text NOT NULL DEFAULT 'demo',
  auto_sync boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.sync_sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  documents_synced integer NOT NULL DEFAULT 0,
  message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_sections TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annotations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_sources TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_jobs TO anon, authenticated;
GRANT ALL ON public.documents, public.document_sections, public.reading_progress, public.annotations, public.sync_sources, public.sync_jobs TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demo open access" ON public.documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo open access" ON public.document_sections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo open access" ON public.reading_progress FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo open access" ON public.annotations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo open access" ON public.sync_sources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "demo open access" ON public.sync_jobs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.sync_sources (id, provider, display_name, account_label, status, mode, auto_sync)
VALUES ('11111111-1111-4111-8111-111111111111', 'google_docs', 'Google Docs', NULL, 'disconnected', 'demo', true);

INSERT INTO public.documents (id, title, author, source, file_type, excerpt, word_count, estimated_minutes, accent, google_doc_id, google_revision_id, sync_status, last_synced_at)
VALUES
('22222222-2222-4222-8222-222222222221', 'The Quiet Craft of Deep Work', 'Maya Ellison', 'upload', 'pdf', 'Why the most valuable skill of the decade is the ability to sit with a single hard problem for ninety uninterrupted minutes.', 720, 4, 'lavender', NULL, NULL, 'idle', NULL),
('22222222-2222-4222-8222-222222222222', 'Field Notes: Designing for Calm', 'Product Research Team', 'google_docs', 'gdoc', 'Interface patterns that lower cognitive load, gathered from twelve weeks of usability sessions with real readers.', 640, 4, 'coral', 'demo-doc-calm-001', 'rev-18', 'synced', now() - interval '2 hours'),
('22222222-2222-4222-8222-222222222223', 'A Short History of the Reading Machine', 'Tomas Berg', 'upload', 'md', 'From the codex to the e-ink screen: how each new reading surface quietly rewired the way we hold attention.', 580, 3, 'blue', NULL, NULL, 'idle', NULL);

INSERT INTO public.document_sections (document_id, position, heading, heading_level, body) VALUES
('22222222-2222-4222-8222-222222222221', 0, 'The vanishing hour', 2, E'There was a time when an afternoon could hold exactly one task. A researcher opened a notebook at two o''clock, and by five the page carried a single argument, worked over until it held its shape.\n\nThat hour has not disappeared so much as been divided. It now arrives in slivers of nine minutes, each one interrupted by something that feels urgent and is almost never important. The cost is not the interruption itself but the residue it leaves: part of your attention stays behind with the last thing you looked at.'),
('22222222-2222-4222-8222-222222222221', 1, 'Attention residue', 2, E'Psychologists call this attention residue. When you switch from one task to another, a portion of your focus lingers on the first task, especially if you left it unfinished. Work done in the shadow of residue is measurably worse — slower, shallower, and more error-prone.\n\nThe practical implication is unglamorous. If you want to think well, you have to protect long, boring, unbroken stretches of time. Not inspiration. Just duration.'),
('22222222-2222-4222-8222-222222222221', 2, 'Building the ninety minutes', 2, E'Start with one block, four days a week. Put it on the calendar as though it were a meeting with someone you respect. Close the door if you have one; wear headphones if you do not.\n\nThe first twenty minutes will feel like a waste. Your mind will produce a long list of small tasks that suddenly seem essential. Write them down, do not do them, and keep going. Somewhere around minute thirty the noise thins out and the real work begins.'),
('22222222-2222-4222-8222-222222222221', 3, 'What deep work is not', 2, E'Deep work is not working longer. Most people who adopt it end up working fewer total hours, because the hours they keep are worth more.\n\nIt is also not a personality trait. It is a practice with a warm-up period, a fatigue curve, and a ceiling of roughly four hours a day for almost everyone. Treat the fifth hour as a bonus you did not plan for.'),
('22222222-2222-4222-8222-222222222221', 4, 'A closing note', 2, E'The craft is quiet because nobody applauds the hour you spent staring at a paragraph. But the paragraph is better, and eventually so is everything built on top of it.');

INSERT INTO public.document_sections (document_id, position, heading, heading_level, body) VALUES
('22222222-2222-4222-8222-222222222222', 0, 'What we tested', 2, E'Over twelve weeks we ran forty-one moderated sessions with readers between the ages of nineteen and sixty-eight. Each participant read two long articles: one in a standard web layout, one in a calm layout we built for the study.\n\nWe measured completion rate, self-reported strain, and how often participants left the page mid-article.'),
('22222222-2222-4222-8222-222222222222', 1, 'Line length matters more than font size', 2, E'The single largest effect we found came from measure — the number of characters per line. Participants reading at roughly sixty-eight characters per line finished 34% more often than those reading full-width text on a wide monitor.\n\nFont size mattered too, but only below a threshold. Above sixteen pixels, increases produced almost no measurable gain in comprehension.'),
('22222222-2222-4222-8222-222222222222', 2, 'Contrast, but not maximum contrast', 2, E'Pure black text on pure white was rated as more fatiguing than a soft off-white background with near-black ink. Several participants described the maximum-contrast version as "loud", which is a striking word to use about a static page.\n\nOur recommendation is a background around 96% lightness and text around 15%.'),
('22222222-2222-4222-8222-222222222222', 3, 'Progress makes people finish', 2, E'When we added a slim progress indicator, mid-article abandonment dropped by nearly a fifth. Participants said it converted an unknown commitment into a known one.\n\nThe effect held only when the indicator was accurate. A progress bar that jumped or lagged produced irritation and, in three cases, immediate exit.'),
('22222222-2222-4222-8222-222222222222', 4, 'Open questions', 2, E'We did not test long-form reading on phones in bright daylight, and we suspect sepia modes behave differently outdoors. That is the next study.');

INSERT INTO public.document_sections (document_id, position, heading, heading_level, body) VALUES
('22222222-2222-4222-8222-222222222223', 0, 'The scroll gives way', 2, E'For centuries reading meant unrolling. A scroll demanded two hands and a linear path; you could not easily jump to the middle, and you certainly could not flip back to check a claim.\n\nThe codex — pages bound at one edge — changed that around the second century. Suddenly a reader could hold a place with a thumb and compare two passages. Cross-referencing was born as a physical gesture before it was an intellectual habit.'),
('22222222-2222-4222-8222-222222222223', 1, 'Whitespace as invention', 2, E'Early manuscripts ran words together without spaces. Silent reading as we know it was nearly impossible; text had to be voiced to be parsed.\n\nIrish scribes began inserting spaces between words in the seventh century, and within a few generations reading rooms grew quiet. A typographic convention had rewired a cognitive process.'),
('22222222-2222-4222-8222-222222222223', 2, 'The paperback and the commute', 2, E'Cheap bound paperbacks in the 1930s did something no earlier format had: they made reading portable enough for the fifteen-minute gap. Publishers discovered that chapter length is a function of transport infrastructure.'),
('22222222-2222-4222-8222-222222222223', 3, 'Screens, and what they took', 2, E'The e-ink reader restored some of the codex''s calm — a fixed page, no notifications, a battery measured in weeks. The general-purpose screen took it away again.\n\nWhat every successful reading surface has shared is a kind of narrowness: it does one thing, and the doing of that one thing is easy to resume.');

INSERT INTO public.reading_progress (document_id, percent, minutes_read, completed) VALUES
('22222222-2222-4222-8222-222222222221', 40, 12, false),
('22222222-2222-4222-8222-222222222222', 100, 9, true),
('22222222-2222-4222-8222-222222222223', 0, 0, false);
