"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

type TaskWithProject = {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  projectName?: string;
  deadline?: Date | null;
};

export function RecentTasks({ tasks }: { tasks: TaskWithProject[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Circle className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-muted-foreground text-sm">No tasks yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Create tasks in your projects to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/projects/${task.projectId}`}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {task.status === "DONE" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : task.status === "IN_PROGRESS" ? (
              <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate group-hover:text-primary transition-colors">
                {task.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {task.projectName ?? "Project"} · {task.status?.replace("_", " ")}
              </p>
            </div>
            <Badge
              variant={
                task.priority === "HIGH"
                  ? "destructive"
                  : task.priority === "MEDIUM"
                  ? "warning"
                  : "success"
              }
              className="shrink-0 text-[10px]"
            >
              {task.priority?.toLowerCase() ?? "medium"}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
