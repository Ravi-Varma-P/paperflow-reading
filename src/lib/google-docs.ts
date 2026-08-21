/**
 * Google Docs integration boundary.
 *
 * Everything the app needs from Google lives behind `GoogleDocsConnector`.
 * `demoGoogleDocsConnector` is a self-contained fake used while no real OAuth
 * credentials exist in this environment. To go live, implement the same
 * interface against Google Drive/Docs (via a server function that holds the
 * OAuth tokens) and return it from `getGoogleDocsConnector()`.
 */

import type { DraftSection } from "./types";

export interface RemoteDoc {
  /** Google Docs file id. */
  id: string;
  title: string;
  author: string | null;
  /** Google Drive revision id — used to detect updates. */
  revisionId: string;
  modifiedTime: string;
  sections: DraftSection[];
}

export interface ConnectResult {
  accountLabel: string;
}

export interface GoogleDocsConnector {
  /** "demo" until real OAuth credentials are wired up. */
  readonly mode: "demo" | "live";
  readonly requiredScopes: string[];
  connect(): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  listDocuments(): Promise<RemoteDoc[]>;
  getDocument(id: string): Promise<RemoteDoc | null>;
}

const DEMO_LATENCY = 650;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEMO_DOCS: RemoteDoc[] = [
  {
    id: "demo-doc-calm-001",
    title: "Field Notes: Designing for Calm",
    author: "Product Research Team",
    revisionId: "rev-18",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    sections: [],
  },
  {
    id: "demo-doc-weekly-014",
    title: "Weekly Reading Digest — Attention & Interfaces",
    author: "Nadia Okonkwo",
    revisionId: "rev-4",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    sections: [
      {
        heading: "Three things worth your Tuesday",
        heading_level: 2,
        body: "This week's digest is short on purpose. Two research papers, one essay, and a single practical experiment you can run before Friday.\n\nEverything below was read end to end by a human before it made the list.",
      },
      {
        heading: "1. The interruption tax is bigger than we thought",
        heading_level: 2,
        body: "A replication study out of Utrecht followed 214 knowledge workers for six weeks and found that recovery time after an interruption averaged eleven minutes — but only when the interrupted task required holding several variables in memory.\n\nFor routine tasks, recovery was under a minute. The implication: protect the hard work, not the calendar in general.",
      },
      {
        heading: "2. Typography is an accessibility feature",
        heading_level: 2,
        body: "An overlooked finding: readers with mild dyslexia benefited more from increased line spacing than from any specialised typeface. Line height of 1.7 outperformed every font swap tested.\n\nThe cheapest accessibility win in most products is a CSS change.",
      },
      {
        heading: "3. An experiment to try",
        heading_level: 2,
        body: "Pick one long document you have been avoiding. Read it in a dedicated reader with no sidebar, no comments, and a fixed measure. Note how far you get in twenty minutes.\n\nMost people report finishing something they had postponed for weeks. The document did not change; the surface did.",
      },
    ],
  },
  {
    id: "demo-doc-onboarding-007",
    title: "Onboarding Handbook — The First Thirty Days",
    author: "People Ops",
    revisionId: "rev-9",
    modifiedTime: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    sections: [
      {
        heading: "Welcome",
        heading_level: 2,
        body: "Your first month is deliberately unhurried. We would rather you understand why things are built the way they are than ship something in week one.\n\nThis handbook is a living document; it is edited most weeks, and your reader will pick up the changes automatically.",
      },
      {
        heading: "Week one: read and ask",
        heading_level: 2,
        body: "Spend the first week reading. Architecture notes, past decision records, the last two quarterly reviews. Keep a running list of questions and bring it to your Friday one-to-one.\n\nNobody expects a pull request. They do expect the questions.",
      },
      {
        heading: "Week two: your first change",
        heading_level: 2,
        body: "Pick something small and visible — a copy fix, a missing empty state, a slow query. The goal is to walk the whole path from branch to production once, while it is still cheap to get lost.",
      },
      {
        heading: "Weeks three and four: own something",
        heading_level: 2,
        body: "By the end of the month you should own one small surface end to end: its bugs, its metrics, and its roadmap for the next quarter.\n\nOwnership here means you are the person who notices when it breaks, not the person who must fix it alone.",
      },
    ],
  },
];

/** Sections for the seeded demo doc are already in the database; this fills gaps. */
DEMO_DOCS[0]!.sections = [
  {
    heading: "What we tested",
    heading_level: 2,
    body: "Over twelve weeks we ran forty-one moderated sessions with readers between the ages of nineteen and sixty-eight. Each participant read two long articles: one in a standard web layout, one in a calm layout we built for the study.\n\nWe measured completion rate, self-reported strain, and how often participants left the page mid-article.",
  },
  {
    heading: "Line length matters more than font size",
    heading_level: 2,
    body: "The single largest effect we found came from measure — the number of characters per line. Participants reading at roughly sixty-eight characters per line finished 34% more often than those reading full-width text on a wide monitor.\n\nFont size mattered too, but only below a threshold. Above sixteen pixels, increases produced almost no measurable gain in comprehension.",
  },
  {
    heading: "Contrast, but not maximum contrast",
    heading_level: 2,
    body: "Pure black text on pure white was rated as more fatiguing than a soft off-white background with near-black ink. Several participants described the maximum-contrast version as \u201cloud\u201d, which is a striking word to use about a static page.\n\nOur recommendation is a background around 96% lightness and text around 15%.",
  },
  {
    heading: "Progress makes people finish",
    heading_level: 2,
    body: "When we added a slim progress indicator, mid-article abandonment dropped by nearly a fifth. Participants said it converted an unknown commitment into a known one.\n\nThe effect held only when the indicator was accurate. A progress bar that jumped or lagged produced irritation and, in three cases, immediate exit.",
  },
  {
    heading: "Open questions",
    heading_level: 2,
    body: "We did not test long-form reading on phones in bright daylight, and we suspect sepia modes behave differently outdoors. That is the next study.",
  },
  {
    heading: "Addendum: daylight sessions",
    heading_level: 2,
    body: "Added after the original write-up. A small follow-up (n=9) suggests sepia is preferred outdoors by a wide margin, while dark mode is nearly unreadable in direct sun.\n\nTreat this as directional, not conclusive.",
  },
];

export const demoGoogleDocsConnector: GoogleDocsConnector = {
  mode: "demo",
  requiredScopes: [
    "See and download your Google Docs files",
    "See file names and last-modified times in Drive",
  ],
  async connect() {
    await sleep(DEMO_LATENCY);
    return { accountLabel: "demo.reader@paperplay.app" };
  },
  async disconnect() {
    await sleep(300);
  },
  async listDocuments() {
    await sleep(DEMO_LATENCY);
    return DEMO_DOCS.map((d) => ({ ...d }));
  },
  async getDocument(id: string) {
    await sleep(300);
    return DEMO_DOCS.find((d) => d.id === id) ?? null;
  },
};

/**
 * Swap this for a live connector once OAuth credentials exist.
 * Keep the return type as `GoogleDocsConnector` so no UI changes are needed.
 */
export function getGoogleDocsConnector(): GoogleDocsConnector {
  return demoGoogleDocsConnector;
}
