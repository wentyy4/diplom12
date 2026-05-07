"use client";

import { useEffect, useState } from "react";
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
import { createProject, updateProject } from "@/lib/actions/projects";
import { toast } from "sonner";
import type { Project } from "@prisma/client";

type ProjectWithRelations = Project & {
  members: { role?: string; user: { id: string; name: string } }[];
};

type ProjectFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProject?: ProjectWithRelations | null;
  allUsers?: { id: string; name: string }[];
  onSuccess?: () => void;
};

export function ProjectForm({
  open,
  onOpenChange,
  editProject,
  allUsers = [],
  onSuccess,
}: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const memberIds = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="memberIds"]:checked'))
      .map((el) => el.value);
    formData.set("memberIds", memberIds.join(","));

    const result = editProject
      ? await updateProject(editProject.id, formData)
      : await createProject(formData);

    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(editProject ? "Project updated" : "Project created");
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editProject ? "Edit Project" : "Create Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editProject?.name}
                required
                placeholder="Project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={editProject?.description ?? ""}
                placeholder="Brief description"
              />
            </div>
            {allUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Members</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {allUsers.map((user) => {
                    const isMember = editProject?.members?.some(
                      (m) => m.user.id === user.id
                    );
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="memberIds"
                          value={user.id}
                          defaultChecked={!!isMember}
                          className="rounded"
                        />
                        <span className="text-sm">{user.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editProject ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
