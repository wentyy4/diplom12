import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { canManageProject } from "@/lib/rbac";
import { ProjectHeader } from "@/components/ProjectHeader";
import { KanbanBoard } from "@/components/KanbanBoard";

async function getProject(id: string, userId: string, role: string) {
  // ADMIN can access any project; others only if manager or member
  const project = await prisma.project.findFirst({
    where:
      role === "ADMIN"
        ? { id }
        : {
            id,
            OR: [
              { managerId: userId },
              { members: { some: { userId } } },
            ],
          },
    include: {
      manager: { select: { name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      tasks: {
        orderBy: [{ status: "asc" }, { position: "asc" }],
        include: { assignee: { select: { id: true, name: true } } },
      },
    },
  });
  return project;
}

export default async function ProjectKanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const project = await getProject(id, session.user.id, session.user.role as string);
  if (!project) notFound();

  const role = session.user.role as string;
  const userId = session.user.id;
  const canEditProject = canManageProject(role, project.managerId, userId);

  const members = project.members.map((m) => m.user);
  const managerUser = { id: project.managerId, name: project.manager.name };
  const allMembers = [managerUser, ...members.filter((m) => m.id !== project.managerId)];

  const allUsers = canEditProject
    ? await prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        canEditProject={canEditProject}
        allUsers={allUsers}
      />

      <KanbanBoard
        projectId={project.id}
        projectManagerId={project.managerId}
        tasks={project.tasks}
        members={allMembers}
        userRole={session.user.role as string}
        userId={session.user.id}
      />
    </div>
  );
}
