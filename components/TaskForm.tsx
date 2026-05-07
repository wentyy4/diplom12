"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { Task } from "@prisma/client";

type TaskFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editTask?: Task | null;
  members: { id: string; name: string }[];
  /** Called after create/update; for create, receives the new task so UI can add it without refresh */
  onSuccess?: (newTask?: Task) => void;
  /** RBAC: hide assignee field for MEMBER (cannot change assignee) */
  canAssign?: boolean;
};

export function TaskForm({
  open,
  onOpenChange,
  projectId,
  editTask,
  members,
  onSuccess,
  canAssign = true,
}: TaskFormProps) {
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = editTask
      ? await updateTask(editTask.id, projectId, formData)
      : await createTask(projectId, formData);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(editTask ? "Task updated" : "Task created");
      onOpenChange(false);
      const newTask = !editTask && "task" in result ? (result.task as Task) : undefined;
      onSuccess?.(newTask);
      router.refresh();
    }
  }

  const deadlineValue = editTask?.deadline
    ? new Date(editTask.deadline).toISOString().slice(0, 16)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={editTask?.title}
                required
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={editTask?.description ?? ""}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="datetime-local"
                defaultValue={deadlineValue}
              />
              <p className="text-xs text-muted-foreground">
                Priority is auto-set: &lt;3 days = High, &lt;7 days = Medium, else Low
              </p>
            </div>
            {canAssign && (
              <div className="space-y-2">
                <Label htmlFor="assigneeId">Assignee</Label>
                <select
                  id="assigneeId"
                  name="assigneeId"
                  defaultValue={editTask?.assigneeId ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {editTask && (
              <input type="hidden" name="status" value={editTask.status} />
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
