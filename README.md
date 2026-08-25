# PaperFlow Reading

Create a polished full-stack document reading app called “PaperPlay” (name can be changed later). The core product: users upload document files and the app transforms extracted text into a visually appealing, easy-to-read reading experience with a fun, interactive UX. Also support a Google Docs connection so new Google Docs and updates to existing docs can automatically sync into the app.

Build a production-quality responsive web app with TypeScript, Tailwind and shadcn/ui. Use a warm, modern editorial aesthetic: soft off-white background, dark ink typography, subtle lavender/coral/blue accents, rounded cards, tasteful gradients, gentle shadows, playful micro-interactions, and excellent whitespace. Avoid a generic admin-dashboard look.

Main screens/features:
1. Home/library screen: large friendly hero, “Upload document” CTA with drag-and-drop zone, “Connect Google Docs” CTA, recent documents grid/list, search, filters by source/type, and sync status badges. Include a beautiful empty state.
2. Document reader: immersive reading layout with document title, source, last synced time, reading progress, estimated read time, font size controls, line-height controls, light/sepia/dark themes, table of contents/section navigator when headings are available, bookmark button, “focus mode”, and keyboard-friendly navigation. Text should be rendered as clean readable sections rather than raw extracted dump.
3. Fun interactions: reading progress ring/bar, section completion animation, subtle confetti for finishing a document, selectable text toolbar with highlight/bookmark actions, and a small “reading streak” or “minutes read” widget in the library.
4. Upload flow: support PDF, DOCX, TXT and Markdown at the UI level. Show parsing state, upload progress, success/error states, metadata, and a preview before opening.
5. Google Docs sync screen/modal: OAuth-style connect UI, explain permissions clearly, list synced documents, show last sync time/status, auto-sync toggle, manual “Sync now”, and per-document sync status. Architect the data model so Google Docs IDs and revision/update timestamps are stored. If actual Google OAuth/connector credentials are not available in this build environment, implement a realistic mock/demo connector with clear “Demo mode” indication and leave the integration boundary clean for a real Google Drive/Docs connector later. Do not fake that real cloud sync is active.
6. Settings: reading preferences, sync preferences, account/profile placeholder, storage/source controls.

Data model should be suitable for persistence: documents, document_sections, reading_progress, bookmarks/highlights, sync_sources, sync_jobs/status. Use Supabase/Postgres when appropriate. Include robust loading, error, and empty states. Seed the app with a few attractive sample documents so the experience is immediately explorable.

Important UX details:
- Desktop-first but fully responsive on tablet/mobile.
- Make the reader the star of the app.
- Use semantic HTML and accessible controls.
- Add polished hover, focus, and transition states without over-animating.
- Use realistic sample content and metadata rather than lorem ipsum.
- Make upload/dropzone and reader interactions feel delightful.
- Include a clear distinction between local uploaded files and Google Docs source documents.

Implementation goal: deliver a working app with the complete frontend UX and backend-ready architecture. For Google Docs, use a clearly isolated service/interface so switching from demo data to real OAuth + Google Docs API is straightforward. Include a small developer-facing “Integration status” area in settings that says whether Google sync is Demo mode or Connected.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6b0304a1-a4e8-4327-9abf-b242844bcc7f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
