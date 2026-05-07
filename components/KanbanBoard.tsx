"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/KanbanColumn";
import { TaskCard } from "@/components/TaskCard";
import { TaskForm } from "@/components/TaskForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { moveTask, deleteTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canMoveTask,
  canAssignTask,
} from "@/lib/rbac";
import type { TaskCardPermissions } from "@/components/TaskCard";
import type { Task } from "@prisma/client";

const COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const statusOrder: Record<ColumnId, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

function getStatusOrder(status: string) {
  return statusOrder[status as ColumnId] ?? Number.MAX_SAFE_INTEGER;
}

function isColumnId(status: string): status is ColumnId {
  return COLUMNS.some((column) => column.id === status);
}

type KanbanBoardProps = {
  projectId: string;
  projectManagerId: string;
  tasks: Task[];
  members: { id: string; name: string }[];
  userRole: string;
  userId: string;
  userProjectRole?: string | null;
};

export function KanbanBoard({
  projectId,
  projectManagerId,
  tasks: initialTasks,
  members,
  userRole,
  userId,
  userProjectRole = null,
}: KanbanBoardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canCreate = canCreateTask(userRole, projectManagerId, userId, userProjectRole);

  const getTaskPermissions = useCallback(
    (task: Task): TaskCardPermissions => {
      if (!userId) {
        return { canEdit: false, canDelete: false, canAssign: false, canDrag: false };
      }
      const assigneeId =
        task.assigneeId ?? (task as { assignee?: { id: string } }).assignee?.id ?? null;
      return {
        canEdit: canEditTask(userRole, projectManagerId, userId, assigneeId, userProjectRole),
        canDelete: canDeleteTask(userRole, projectManagerId, userId, userProjectRole),
        canAssign: canAssignTask(userRole, projectManagerId, userId, userProjectRole),
        canDrag: canMoveTask(userRole, projectManagerId, userId, assigneeId, userProjectRole),
      };
    },
    [userRole, projectManagerId, userId, userProjectRole]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const getTasksByStatus = useCallback(
    (status: ColumnId) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position),
    [tasks]
  );

  function handleDragStart(e: DragStartEvent) {
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const overId = over.id as string;
    const overIsColumn = COLUMNS.some((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!isColumnId(task.status)) return;

    let newStatus: ColumnId = task.status;
    let newPosition = task.position;

    if (overIsColumn) {
      if (!isColumnId(overId)) return;
      newStatus = overId;
      const colTasks = getTasksByStatus(newStatus);
      newPosition = colTasks.length;
    } else if (overTask) {
      if (!isColumnId(overTask.status)) return;
      newStatus = overTask.status;
      const colTasks = getTasksByStatus(newStatus);
      const overIndex = colTasks.findIndex((t) => t.id === overTask.id);
      newPosition = overIndex >= 0 ? overIndex : colTasks.length;
    }

    if (newStatus === task.status && newPosition === task.position) return;

    if (!getTaskPermissions(task).canDrag) return;

    // Optimistic update
    setTasks((prev) => {
      const without = prev.filter((t) => t.id !== taskId);
      const updated = { ...task, status: newStatus, position: newPosition };
      const col = without
        .filter((t) => t.status === newStatus)
        .sort((a, b) => a.position - b.position);
      col.splice(newPosition, 0, updated);
      col.forEach((t, i) => (t.position = i));
      return without
        .filter((t) => t.status !== newStatus)
        .concat(col)
        .sort((a, b) => {
          return getStatusOrder(a.status) - getStatusOrder(b.status) || a.position - b.position;
        });
    });

    const result = await moveTask(
      taskId,
      projectId,
      newStatus,
      newPosition
    );

    if (result?.error) {
      toast.error(result.error);
      setTasks(initialTasks);
      router.refresh();
      return;
    }
    router.refresh();
  }

  async function handleDelete(task: Task) {
    setDeleteTaskId(task.id);
  }

  async function confirmDelete() {
    if (!deleteTaskId) return;
    const result = await deleteTask(deleteTaskId, projectId);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
    setDeleteTaskId(null);
    toast.success("Task deleted");
    router.refresh();
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          {canCreate && (
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
          {COLUMNS.map((col) => {
            const colTasks = getTasksByStatus(col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col flex-1 min-w-[320px] max-w-[400px] rounded-lg border bg-muted/30"
              >
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                  <h3 className="font-semibold">{col.title}</h3>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex-1 p-4 space-y-2">
                  {colTasks.length === 0 ? (
                    <Skeleton className="h-24 w-full rounded-lg" />
                  ) : (
                    colTasks.slice(0, 3).map((t) => (
                      <Skeleton key={t.id} className="h-24 w-full rounded-lg" />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && (
          <Button onClick={() => setAddTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={getTasksByStatus(col.id)}
              onEditTask={(t) => setEditTask(t)}
              onDeleteTask={handleDelete}
              getTaskPermissions={getTaskPermissions}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                permissions={{
                  canEdit: false,
                  canDelete: false,
                  canAssign: false,
                  canDrag: false,
                }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskForm
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        projectId={projectId}
        members={members}
        canAssign={canAssignTask(userRole, projectManagerId, userId, userProjectRole)}
        onSuccess={(newTask) => {
          setAddTaskOpen(false);
          if (newTask) {
            const task = {
              ...newTask,
              deadline: newTask.deadline ? new Date(newTask.deadline) : null,
              createdAt: new Date(newTask.createdAt),
              updatedAt: new Date(newTask.updatedAt),
            };
            setTasks((prev) => [...prev, task]);
          }
          router.refresh();
        }}
      />

      {editTask && (
        <TaskForm
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          projectId={projectId}
          editTask={editTask}
          members={members}
          canAssign={canAssignTask(userRole, projectManagerId, userId, userProjectRole)}
          onSuccess={() => {
            router.refresh();
            setEditTask(null);
          }}
        />
      )}

      <Dialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this task?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTaskId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
