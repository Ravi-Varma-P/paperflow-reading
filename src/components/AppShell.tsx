import { Link } from "@tanstack/react-router";
import { BookOpenText, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="PaperPlay home">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-lavender to-coral text-primary-foreground shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:-rotate-6">
              <BookOpenText className="size-4.5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">PaperPlay</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Main">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Library
            </Link>
            <Link
              to="/settings"
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Settings className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <ThemeToggle className="ml-0.5" />
            <AccountMenu />
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
