import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("courses")
      .select("id,title,code,description")
      .eq("id", params.courseId)
      .maybeSingle();
    return { course: data };
  },
  head: ({ params, loaderData }) => {
    const course = loaderData?.course;
    const title = course?.title ? `${course.title} — Kabir.io` : "Course — Kabir.io";
    const desc = course?.description
      ? course.description.slice(0, 160)
      : course?.title
        ? `Notes, images, links, and announcements for ${course.title} on Kabir.io.`
        : "Course materials, notes, images, links, and announcements on Kabir.io.";
    const url = `https://academicio.lovable.app/courses/${params.courseId}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: course
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Course",
                name: course.title,
                description: desc,
                ...(course.code ? { courseCode: course.code } : {}),
                url,
                provider: {
                  "@type": "EducationalOrganization",
                  name: "Kabir.io",
                  url: "https://academicio.lovable.app",
                },
              }),
            },
          ]
        : undefined,
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const { data: user } = useCurrentUser();
  const isAdmin = !!user?.isAdmin;

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,code,description,accent_color,last_updated")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!course) {
    return <div className="glass rounded-2xl p-10 text-center">Course not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className={`glass course-banner accent-${course.accent_color ?? "violet"} rounded-2xl p-8`}>
        {course.code && (
          <Badge variant="secondary" className="mb-3 bg-black/30 text-white/90">
            {course.code}
          </Badge>
        )}
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{course.title}</h1>
        {course.description && (
          <p className="mt-2 max-w-2xl text-sm text-white/80">{course.description}</p>
        )}
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="bg-white/5">
          <TabsTrigger value="notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Notes</TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Images</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5"><LinkIcon className="h-3.5 w-3.5" />Links</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" />Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-5">
          <h2 className="sr-only">Notes</h2>
          <NotesTab courseId={course.id} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="images" className="mt-5">
          <h2 className="sr-only">Images</h2>
          <ImagesTab courseId={course.id} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="links" className="mt-5">
          <h2 className="sr-only">Links</h2>
          <LinksTab courseId={course.id} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="announcements" className="mt-5">
          <h2 className="sr-only">Announcements</h2>
          <AnnouncementsTab courseId={course.id} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- NOTES ---------------- */
function NotesTab({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,description,file_path,file_name,file_size,mime_type,created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async (form: { title: string; description: string; file: File }) => {
      const path = `${courseId}/${crypto.randomUUID()}-${form.file.name}`;
      const up = await supabase.storage.from("course-files").upload(path, form.file, {
        contentType: form.file.type,
      });
      if (up.error) throw up.error;
      const ins = await supabase.from("notes").insert({
        course_id: courseId,
        title: form.title,
        description: form.description || null,
        file_path: path,
        file_name: form.file.name,
        file_size: form.file.size,
        mime_type: form.file.type,
        uploaded_by: user?.session.user.id ?? null,
      });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success("Note uploaded");
      qc.invalidateQueries({ queryKey: ["notes", courseId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (path: string, filename: string) => {
    const { data, error } = await supabase.storage
      .from("course-files")
      .createSignedUrl(path, 60, { download: filename });
    if (error || !data) return toast.error(error?.message ?? "Failed to download");
    window.open(data.signedUrl, "_blank");
  };

  const remove = useMutation({
    mutationFn: async (n: { id: string; file_path: string }) => {
      await supabase.storage.from("course-files").remove([n.file_path]);
      const { error } = await supabase.from("notes").delete().eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      qc.invalidateQueries({ queryKey: ["notes", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="mr-2 h-4 w-4" />Upload note</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload a new note</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const file = fd.get("file") as File;
                  if (!file || file.size === 0) return toast.error("Pick a file");
                  upload.mutate({
                    title: String(fd.get("title") || file.name),
                    description: String(fd.get("description") || ""),
                    file,
                  });
                }}
                className="space-y-4"
              >
                <div><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
                <div><Label htmlFor="file">File (PDF, DOCX, PPT, ZIP)</Label>
                  <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" required />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={upload.isPending}>
                    {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Upload
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : notes?.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} text="No notes uploaded yet." />
      ) : (
        <div className="grid gap-3">
          {notes!.map((n) => (
            <div key={n.id} className="glass flex items-center gap-4 rounded-xl p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium leading-tight truncate">{n.title}</div>
                {n.description && <div className="text-xs text-muted-foreground truncate">{n.description}</div>}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {n.file_name} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-white/15 bg-white/5"
                onClick={() => download(n.file_path, n.file_name)}>
                <Download className="mr-2 h-3.5 w-3.5" />Download
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={() => {
                    if (confirm(`Delete "${n.title}"?`)) remove.mutate({ id: n.id, file_path: n.file_path });
                  }}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- IMAGES ---------------- */
function ImagesTab({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  const { data: images, isLoading } = useQuery({
    queryKey: ["images", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_images")
        .select("id,title,image_path,created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // build signed URLs (private bucket)
      const withUrls = await Promise.all(
        (data ?? []).map(async (img) => {
          const { data: signed } = await supabase.storage
            .from("course-images")
            .createSignedUrl(img.image_path, 60 * 60);
          return { ...img, url: signed?.signedUrl ?? "" };
        }),
      );
      return withUrls;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = `${courseId}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("course-images").upload(path, file, {
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const ins = await supabase.from("course_images").insert({
        course_id: courseId,
        title: file.name,
        image_path: path,
        uploaded_by: user?.session.user.id ?? null,
      });
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      toast.success("Image uploaded");
      qc.invalidateQueries({ queryKey: ["images", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (img: { id: string; image_path: string }) => {
      await supabase.storage.from("course-images").remove([img.image_path]);
      const { error } = await supabase.from("course_images").delete().eq("id", img.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Image deleted");
      qc.invalidateQueries({ queryKey: ["images", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />Upload image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : images?.length === 0 ? (
        <EmptyState icon={<ImageIcon className="h-6 w-6" />} text="No images yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images!.map((img) => (
            <div key={img.id} className="glass group relative block overflow-hidden rounded-xl">
              <a href={img.url} target="_blank" rel="noreferrer" className="block">
                <div className="aspect-square overflow-hidden bg-black/30">
                  {img.url && (
                    <img
                      src={img.url}
                      alt={img.title ?? ""}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
              </a>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute right-2 top-2 h-8 w-8 border-destructive/30 bg-destructive/20 text-destructive backdrop-blur hover:bg-destructive/30"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this image?")) remove.mutate({ id: img.id, image_path: img.image_path });
                  }}
                  aria-label="Delete image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- LINKS ---------------- */
function LinksTab({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const { data: links, isLoading } = useQuery({
    queryKey: ["links", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_links")
        .select("id,title,description,url,category,created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (f: { title: string; description: string; url: string; category: string }) => {
      const { error } = await supabase.from("course_links").insert({
        course_id: courseId,
        title: f.title,
        description: f.description || null,
        url: f.url,
        category: f.category || null,
        created_by: user?.session.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link added");
      qc.invalidateQueries({ queryKey: ["links", courseId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Link deleted");
      qc.invalidateQueries({ queryKey: ["links", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add link</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a resource link</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  create.mutate({
                    title: String(fd.get("title") || ""),
                    description: String(fd.get("description") || ""),
                    url: String(fd.get("url") || ""),
                    category: String(fd.get("category") || ""),
                  });
                }}
                className="space-y-4"
              >
                <div><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
                <div><Label htmlFor="url">URL</Label><Input id="url" name="url" type="url" placeholder="https://…" required /></div>
                <div><Label htmlFor="category">Category</Label><Input id="category" name="category" placeholder="Reference, Video…" /></div>
                <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" rows={2} /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Add</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : links?.length === 0 ? (
        <EmptyState icon={<LinkIcon className="h-6 w-6" />} text="No links yet." />
      ) : (
        <div className="grid gap-3">
          {links!.map((l) => (
            <div key={l.id} className="glass flex items-center gap-4 rounded-xl p-4 transition hover:bg-white/10">
              <a href={l.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{l.title}</div>
                    {l.category && <Badge variant="secondary" className="bg-white/10">{l.category}</Badge>}
                  </div>
                  {l.description && <div className="text-xs text-muted-foreground truncate">{l.description}</div>}
                  <div className="text-[11px] text-muted-foreground truncate">{l.url}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={() => { if (confirm(`Delete "${l.title}"?`)) remove.mutate(l.id); }}
                  aria-label="Delete link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ANNOUNCEMENTS ---------------- */
function AnnouncementsTab({ courseId, isAdmin }: { courseId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["announcements", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,title,message,priority,created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (f: { title: string; message: string; priority: "normal" | "important" | "urgent" }) => {
      const { error } = await supabase.from("announcements").insert({
        course_id: courseId,
        title: f.title,
        message: f.message,
        priority: f.priority,
        created_by: user?.session.user.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement posted");
      qc.invalidateQueries({ queryKey: ["announcements", courseId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      qc.invalidateQueries({ queryKey: ["announcements", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priorityStyle = (p: string) =>
    p === "urgent"
      ? "border-destructive/40 bg-destructive/10"
      : p === "important"
        ? "border-primary/40 bg-primary/10"
        : "border-white/10 bg-white/5";

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post an announcement</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  create.mutate({
                    title: String(fd.get("title") || ""),
                    message: String(fd.get("message") || ""),
                    priority: (fd.get("priority") as "normal" | "important" | "urgent") || "normal",
                  });
                }}
                className="space-y-4"
              >
                <div><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
                <div><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={4} required /></div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Post</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : items?.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} text="No announcements yet." />
      ) : (
        <div className="space-y-3">
          {items!.map((a) => (
            <div key={a.id} className={`rounded-xl border p-4 ${priorityStyle(a.priority)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{a.title}</h4>
                    <Badge variant="outline" className="uppercase text-[10px]">{a.priority}</Badge>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </span>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      onClick={() => { if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id); }}
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center text-muted-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
