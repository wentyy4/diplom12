"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TaskCard,
  type TaskCardPermissions,
  type TaskWithAssignee,
} from "@/components/TaskCard";

type KanbanColumnProps = {
  id: string;
  title: string;
  tasks: TaskWithAssignee[];
  onEditTask: (task: TaskWithAssignee) => void;
  onDeleteTask: (task: TaskWithAssignee) => void;
  getTaskPermissions: (task: TaskWithAssignee) => TaskCardPermissions;
};

export function KanbanColumn({
  id,
  title,
  tasks,
  onEditTask,
  onDeleteTask,
  getTaskPermissions,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col flex-1 min-w-[320px] max-w-[400px] rounded-lg border bg-muted/30 transition-colors",
        isOver && "bg-primary/5 border-primary/50"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[70vh] p-4 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              permissions={getTaskPermissions(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
