import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, ShieldCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/use-current-user";

export function AppHeader({ user }: { user: CurrentUser | null }) {
  const navigate = useNavigate();

  const signIn = async () => {
    await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/dashboard" });
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">
              Kabir<span className="text-gradient-gold">.io</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Academic Hub
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground [&.active]:bg-white/10 [&.active]:text-foreground"
          >
            Dashboard
          </Link>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground [&.active]:bg-white/10 [&.active]:text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium leading-none">
                  {user.profile.full_name ?? user.profile.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.isAdmin ? "Administrator" : "Student"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </Button>
            </>
          )}
          {!user && (
            <Button variant="outline" size="sm" onClick={signIn} className="gap-1.5">
              <LogIn className="h-3.5 w-3.5" /> Admin sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
