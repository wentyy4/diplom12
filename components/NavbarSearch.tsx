"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchGlobal, type SearchProject, type SearchTask } from "@/lib/actions/search";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavbarSearchProps = {
  userId: string | undefined;
};

const DEBOUNCE_MS = 280;

export function NavbarSearch({ userId }: NavbarSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q?.trim() || q.trim().length < 2) {
      setProjects([]);
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchGlobal(q.trim());
      if (res.error) {
        setProjects([]);
        setTasks([]);
        return;
      }
      setProjects(res.projects);
      setTasks(res.tasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setProjects([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(q);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, runSearch]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setProjects([]);
      setTasks([]);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSelectResult = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleViewAll = useCallback(() => {
    const q = query.trim();
    setOpen(false);
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [query, router]);

  const hasResults = projects.length > 0 || tasks.length > 0;
  const showResults = query.trim().length >= 2;

  if (!userId) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Search projects and tasks"
      >
        <Search className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose={false}
          className="top-[10%] sm:top-[50%] translate-y-0 sm:translate-y-[-50%] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden w-[calc(100%-2rem)] sm:max-w-lg"
        >
          <DialogHeader className="p-4 pb-2 space-y-0">
            <DialogTitle className="sr-only">Search projects and tasks</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, tasks..."
                className="pl-9 pr-9 h-11"
                autoComplete="off"
                aria-label="Search"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto border-t min-h-0 px-4 py-2">
            {!showResults && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Type at least 2 characters to search
              </p>
            )}
            {showResults && !loading && !hasResults && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No projects or tasks match &quot;{query.trim()}&quot;
              </p>
            )}
            {showResults && (hasResults || loading) && (
              <div className="space-y-4 pb-4">
                {projects.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5" />
                      Projects
                    </p>
                    <ul className="space-y-1">
                      {projects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectResult(`/projects/${p.id}`)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm font-medium",
                              "hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                            )}
                          >
                            <span className="block truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground font-normal">
                              {p._count.tasks} tasks · {p.manager.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ListChecks className="h-3.5 w-3.5" />
                      Tasks
                    </p>
                    <ul className="space-y-1">
                      {tasks.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectResult(`/projects/${t.project.id}`)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2",
                              "hover:bg-accent focus:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                            )}
                          >
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{t.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {t.project.name}
                                {t.assignee && ` · ${t.assignee.name}`}
                              </span>
                            </div>
                            <Badge
                              variant={
                                t.priority === "HIGH"
                                  ? "destructive"
                                  : t.priority === "MEDIUM"
                                  ? "warning"
                                  : "success"
                              }
                              className="text-[10px] shrink-0"
                            >
                              {t.priority?.toLowerCase()}
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasResults && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-muted-foreground"
                      onClick={handleViewAll}
                    >
                      View all results for &quot;{query.trim()}&quot;
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
