import { useCallback, useEffect, useState } from "react";

export type ReaderTheme = "light" | "sepia" | "dark";

export interface ReaderPrefs {
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
  focusMode: boolean;
  fontFamily: "reading" | "sans";
}

export const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 19,
  lineHeight: 1.75,
  theme: "light",
  focusMode: false,
  fontFamily: "reading",
};

const KEY = "paperplay.reader.prefs";

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ReaderPrefs>) });
    } catch {
      /* ignore corrupt prefs */
    }
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  return { prefs, update, hydrated };
}

/** Lightweight "minutes read" + streak widget state, kept on the device. */
const STATS_KEY = "paperplay.stats";

export interface ReadingStats {
  minutesToday: number;
  streak: number;
  lastDay: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function loadStats(): ReadingStats {
  const fallback: ReadingStats = { minutesToday: 0, streak: 0, lastDay: today() };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<ReadingStats>) };
  } catch {
    return fallback;
  }
}

export function recordMinute(): ReadingStats {
  const stats = loadStats();
  const day = today();
  let next: ReadingStats;
  if (stats.lastDay === day) {
    next = { ...stats, minutesToday: stats.minutesToday + 1 };
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    next = {
      minutesToday: 1,
      streak: stats.lastDay === yesterday ? stats.streak + 1 : 1,
      lastDay: day,
    };
  }
  if (next.streak === 0) next.streak = 1;
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function useReadingStats(active: boolean) {
  const [stats, setStats] = useState<ReadingStats>({
    minutesToday: 0,
    streak: 0,
    lastDay: today(),
  });

  useEffect(() => {
    setStats(loadStats());
    if (!active) return;
    const id = window.setInterval(() => setStats(recordMinute()), 60000);
    return () => window.clearInterval(id);
  }, [active]);

  return stats;
}
