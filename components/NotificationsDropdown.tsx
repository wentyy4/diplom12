"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

type AlertTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  deadline: Date | null;
  isOverdue: boolean;
};

export function NotificationsDropdown({
  overdueTasks,
  dueSoonTasks,
}: {
  overdueTasks: AlertTask[];
  dueSoonTasks: AlertTask[];
}) {
  const total = overdueTasks.length + dueSoonTasks.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {total > 9 ? "9+" : total}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <h3 className="font-semibold text-sm mb-2">Tasks needing attention</h3>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No overdue or due-soon tasks
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {overdueTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}`}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-accent"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.projectName}</p>
                  </div>
                  <Badge variant="destructive" className="text-[10px] shrink-0">
                    Overdue
                  </Badge>
                </Link>
              ))}
              {dueSoonTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}`}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-accent"
                >
                  <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.projectName}</p>
                  </div>
                  <Badge variant="warning" className="text-[10px] shrink-0">
                    Due soon
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
