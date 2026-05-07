"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

type TaskWithProject = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName?: string;
};

type Project = {
  id: string;
  name: string;
};

const COLUMNS = [
  { id: "TODO", title: "To Do", defaultProjectId: null as string | null },
  { id: "IN_PROGRESS", title: "In Progress", defaultProjectId: null as string | null },
  { id: "DONE", title: "Done", defaultProjectId: null as string | null },
];

export function DashboardKanbanPreview({
  allTasks,
  projects,
}: {
  allTasks: TaskWithProject[];
  projects: Project[];
}) {
  const getTasksByStatus = (status: string) =>
    allTasks.filter((t) => t.status === status);

  const getDefaultProjectForColumn = (status: string) => {
    const tasks = getTasksByStatus(status);
    if (tasks.length === 0 && projects.length > 0) return projects[0].id;
    return tasks[0]?.projectId ?? projects[0]?.id ?? "/projects";
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const tasks = getTasksByStatus(col.id);
        const projectId = getDefaultProjectForColumn(col.id);
        const href = projectId ? `/projects/${projectId}` : "/projects";

        return (
          <Link
            key={col.id}
            href={href}
            className={cn(
              "flex flex-col rounded-lg border bg-muted/30 p-4 min-h-[200px]",
              "hover:bg-muted/50 hover:border-primary/30 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{col.title}</h3>
              <Badge variant="secondary">{tasks.length}</Badge>
            </div>
            <div className="space-y-2 flex-1 overflow-hidden">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Inbox className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No tasks</p>
                </div>
              ) : (
                tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md border bg-card p-2.5 hover:bg-accent/30 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <Badge
                        variant={
                          task.priority === "HIGH"
                            ? "destructive"
                            : task.priority === "MEDIUM"
                            ? "warning"
                            : "success"
                        }
                        className="text-[10px]"
                      >
                        {task.priority?.toLowerCase() ?? "medium"}
                      </Badge>
                      {task.projectName && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                          {task.projectName}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
