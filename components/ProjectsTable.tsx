"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/ProjectForm";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Plus, Pencil } from "lucide-react";
import type { Project } from "@prisma/client";

type ProjectWithRelations = Project & {
  manager: { name: string };
  members: { user: { id: string; name: string } }[];
  _count?: { tasks: number; members: number };
};

type ProjectsTableProps = {
  projects: ProjectWithRelations[];
  userId: string;
  userRole: string;
  editProject?: ProjectWithRelations | null;
  triggerLabel?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  allUsers?: { id: string; name: string }[];
};

export function ProjectsTable({
  projects,
  userId,
  userRole,
  editProject,
  triggerLabel = "Create Project",
  variant = "default",
  size = "default",
  allUsers = [],
}: ProjectsTableProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectWithRelations | null>(null);

  return (
    <>
      {editProject ? (
        <Button
          variant={variant}
          size={size}
          onClick={() => {
            setProjectToEdit(editProject);
            setEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      ) : (
        <Button variant={variant} size={size} onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      )}

      <ProjectForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        allUsers={allUsers}
        onSuccess={() => {
          setCreateOpen(false);
        }}
      />

      {projectToEdit && (
        <ProjectForm
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setProjectToEdit(null);
          }}
          editProject={projectToEdit}
          allUsers={allUsers}
          onSuccess={() => {
            setEditOpen(false);
            setProjectToEdit(null);
          }}
        />
      )}
    </>
  );
}
