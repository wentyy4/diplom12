"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, Pencil, Trash2, UserPlus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@prisma/client";

export type TaskWithAssignee = Task & {
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
};

/** RBAC: canEdit = edit details; canDelete = delete task; canAssign = change assignee; canDrag = move between columns */
export type TaskCardPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canDrag: boolean;
};

type TaskCardProps = {
  task: TaskWithAssignee;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
  permissions: TaskCardPermissions;
};

const priorityVariant = {
  HIGH: "destructive" as const,
  MEDIUM: "warning" as const,
  LOW: "success" as const,
};

/** Use fixed locale to avoid hydration mismatch (server vs client locale). */
const DATE_LOCALE = "en-US";

function formatDueDate(deadline: Date | null): { text: string; color: string } | null {
  if (!deadline) return null;
  const now = new Date();
  const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const dateStr = deadline.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: deadline.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
  if (diff < 0) return { text: `${dateStr} (overdue)`, color: "text-destructive" };
  if (diff < 3) return { text: dateStr, color: "text-amber-600 dark:text-amber-400" };
  return { text: dateStr, color: "text-muted-foreground" };
}

export function TaskCard({ task, onEdit, onDelete, permissions }: TaskCardProps) {
  const { canEdit, canDelete, canAssign, canDrag } = permissions;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== "DONE";
  const dueSoon =
    task.deadline &&
    task.status !== "DONE" &&
    (() => {
      const diff =
        (new Date(task.deadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24);
      return diff > 0 && diff < 3;
    })();

  const dueInfo = formatDueDate(task.deadline);

  const showMenu = canEdit || canDelete || canAssign;

  return (
    <div ref={setNodeRef} style={style} {...(canDrag ? { ...attributes, ...listeners } : {})}>
      <Card
        className={cn(
          "hover:border-primary/50 hover:shadow-sm transition-all duration-200",
          canDrag && "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge
                  variant={priorityVariant[task.priority as keyof typeof priorityVariant] ?? "secondary"}
                  className="text-[10px]"
                >
                  {task.priority?.toLowerCase() ?? "medium"}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px]">
                    Overdue
                  </Badge>
                )}
                {dueSoon && !isOverdue && (
                  <Badge variant="warning" className="text-[10px]">
                    Due soon
                  </Badge>
                )}
              </div>
              {task.deadline && (
                <div className={cn("flex items-center gap-1 mt-2 text-xs", dueInfo?.color)}>
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>{dueInfo?.text}</span>
                </div>
              )}
              {task.assignee && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    {task.assignee.name}
                  </span>
                </div>
              )}
            </div>
            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canAssign && (
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(task)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
