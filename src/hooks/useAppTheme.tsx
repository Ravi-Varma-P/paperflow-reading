import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "paperplay.theme";

interface ThemeContextValue {
  theme: ThemeChoice;
  resolved: "light" | "dark";
  setTheme: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline snippet injected before hydration so the first paint already has the right theme. */
export const themeBootstrapScript = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)})||"system";var d=c==="dark"||(c==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

function systemDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark ? "dark" : ("light" as const);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (window.localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? "system";
    setThemeState(stored);
    setResolved(apply(stored) as "light" | "dark");
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") setResolved(apply("system") as "light" | "dark");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice);
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage unavailable */
    }
    setResolved(apply(choice) as "light" | "dark");
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used inside ThemeProvider");
  return ctx;
}
