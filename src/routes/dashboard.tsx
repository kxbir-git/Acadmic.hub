import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kabir.io" },
      {
        name: "description",
        content:
          "Your Kabir.io academic dashboard: browse courses, access notes, images, links, and announcements all in one place.",
      },
      { property: "og:title", content: "Dashboard — Kabir.io" },
      {
        property: "og:description",
        content:
          "Your Kabir.io academic dashboard: browse courses, access notes, images, links, and announcements all in one place.",
      },
      { property: "og:url", content: "https://academicio.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://academicio.lovable.app/dashboard" }],
  }),
  component: Dashboard,
});

type Course = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  accent_color: string | null;
  thumbnail_url: string | null;
  last_updated: string;
};

function Dashboard() {
  const { data: user } = useCurrentUser();
  const [q, setQ] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,code,description,accent_color,thumbnail_url,last_updated")
        .order("title");
      if (error) throw error;
      return data as Course[];
    },
  });

  const filtered = useMemo(() => {
    if (!courses) return [];
    const term = q.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.code?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term),
    );
  }, [courses, q]);

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-primary">
            Welcome back{user?.profile.full_name ? `, ${user.profile.full_name.split(" ")[0]}` : ""}
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
            Your <span className="text-gradient-gold">academic</span> dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            All your courses, notes and university updates in one place. Open a course to view its notes,
            images, links and announcements.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className="bg-white/5 pl-9"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          No courses match your search.
        </div>
      ) : (
        <section aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="mb-4 font-display text-xl font-semibold">
            Courses
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const accent = `accent-${course.accent_color ?? "violet"}`;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className={`group glass relative flex flex-col overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:shadow-glow ${accent}`}
    >
      <div className="course-banner relative aspect-[16/9] w-full overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover opacity-80 mix-blend-luminosity"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/80">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        {course.code && (
          <div className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
            {course.code}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold leading-snug">{course.title}</h3>
          {course.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-muted-foreground">
          <span>Updated {formatDistanceToNow(new Date(course.last_updated), { addSuffix: true })}</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// keep the import for tree-shaking warning silence
export { Button as _Button };
