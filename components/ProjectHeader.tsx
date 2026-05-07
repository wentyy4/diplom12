"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { ProjectForm } from "@/components/ProjectForm";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import type { Project } from "@prisma/client";

type ProjectWithMembers = Project & {
  manager: { name: string };
  members: { user: { id: string; name: string } }[];
};

type ProjectHeaderProps = {
  project: ProjectWithMembers;
  /** Only ADMIN or project manager can edit/delete. When false, no Edit/Delete UI is shown. */
  canEditProject: boolean;
  /** All users for member selection in Edit form. Pass empty array when canEditProject is false. */
  allUsers: { id: string; name: string }[];
};

export function ProjectHeader({
  project,
  canEditProject,
  allUsers,
}: ProjectHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      {/* Project-level actions: only visible for ADMIN or project manager */}
      {canEditProject && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            aria-label="Edit project"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          <DeleteProjectButton
            projectId={project.id}
            projectName={project.name}
            variant="outline"
            size="sm"
          />
        </div>
      )}

      {canEditProject && (
        <ProjectForm
          open={editOpen}
          onOpenChange={setEditOpen}
          editProject={project}
          allUsers={allUsers}
          onSuccess={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
