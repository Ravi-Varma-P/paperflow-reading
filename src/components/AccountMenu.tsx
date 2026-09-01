import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AccountMenu() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!email) {
    return (
      <Button asChild size="sm" className="rounded-full">
        <Link to="/auth">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="hidden max-w-[10rem] truncate text-sm text-muted-foreground sm:inline"
        title={email}
      >
        <UserRound className="mr-1 inline size-4" aria-hidden />
        {email}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="rounded-full"
        aria-label="Sign out"
        onClick={async () => {
          await supabase.auth.signOut();
          await navigate({ to: "/" });
        }}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
