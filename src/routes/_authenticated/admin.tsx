import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Kabir.io" },
      {
        name: "description",
        content:
          "Kabir.io admin console for reviewing pending sign-ups, approving members, and managing user access across the platform.",
      },
      { property: "og:title", content: "Admin — Kabir.io" },
      {
        property: "og:description",
        content:
          "Kabir.io admin console for reviewing pending sign-ups, approving members, and managing user access.",
      },
      { property: "og:url", content: "https://academicio.lovable.app/admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://academicio.lovable.app/admin" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: me, isLoading } = useCurrentUser();
  const qc = useQueryClient();

  const { data: users, isLoading: loadingUsers } = useQuery({
    enabled: !!me?.isAdmin,
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "approved" ? "User approved" : "User rejected");
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="glass mx-auto max-w-md rounded-2xl p-10 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h2 className="mt-3 font-display text-lg">Admins only</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  const pending = users?.filter((u) => u.status === "pending") ?? [];
  const others = users?.filter((u) => u.status !== "pending") ?? [];

  return (
    <div className="space-y-10">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-primary">Administration</div>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">User management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject access requests and review existing accounts.
        </p>
      </header>

      <section>
        <SectionHeader title="Pending access requests" count={pending.length} />
        {loadingUsers ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : pending.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="glass flex items-center justify-between gap-4 rounded-xl p-4">
                <UserInfo name={u.full_name} email={u.email} createdAt={u.created_at} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "approved" })}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                    onClick={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="All accounts" count={others.length} />
        <div className="space-y-2">
          {others.map((u) => (
            <div key={u.id} className="glass flex items-center justify-between gap-4 rounded-xl p-4">
              <UserInfo name={u.full_name} email={u.email} createdAt={u.created_at} />
              <div className="flex items-center gap-2">
                <Badge variant={u.status === "approved" ? "default" : "destructive"}>
                  {u.status}
                </Badge>
                {u.status === "approved" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: u.id, status: "rejected" })}
                  >
                    Revoke
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: u.id, status: "approved" })}
                  >
                    Restore
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <Badge variant="secondary" className="bg-white/10">{count}</Badge>
    </div>
  );
}

function UserInfo({ name, email, createdAt }: { name: string | null; email: string; createdAt: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{name ?? email}</div>
      <div className="truncate text-xs text-muted-foreground">
        {email} · joined {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

// Avoid TS unused import warning if redirect not used
export { redirect as _redirect };
