import { Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppTheme, type ThemeChoice } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolved, setTheme } = useAppTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Theme: ${theme}. Change appearance`}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground",
          className,
        )}
      >
        {resolved === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => setTheme(o.id)}
            className={cn("gap-2 rounded-xl", theme === o.id && "bg-secondary text-foreground")}
          >
            <o.icon className="size-4" /> {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
