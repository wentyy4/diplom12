import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { canManageProject } from "@/lib/rbac";
import { ProjectHeader } from "@/components/ProjectHeader";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ProjectMembersPanel } from "@/components/ProjectMembersPanel";

async function getProject(id: string, userId: string, role: string, firmId: string) {
  const project = await prisma.project.findFirst({
    where:
      role === "ADMIN"
        ? { id, firmId }
        : {
            id,
            firmId,
            OR: [
              { managerId: userId },
              { members: { some: { userId } } },
            ],
          },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      invitations: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          inviter: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
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
  if (!session?.user?.id || !session.user.firmId) return null;

  const { id } = await params;
  const project = await getProject(
    id,
    session.user.id,
    session.user.role as string,
    session.user.firmId
  );
  if (!project) notFound();

  const role = session.user.role as string;
  const userId = session.user.id;
  const currentMembership = project.members.find((m) => m.userId === userId);
  const userProjectRole = currentMembership?.role ?? null;
  const canEditProject = canManageProject(
    role,
    project.managerId,
    userId,
    userProjectRole
  );

  const members = project.members.map((m) => m.user);
  const managerUser = {
    id: project.managerId,
    name: project.manager.name,
    email: project.manager.email,
  };
  const allMembers = [managerUser, ...members.filter((m) => m.id !== project.managerId)];
  const teamMembers = [
    {
      role: "PROJECT_MANAGER",
      user: managerUser,
    },
    ...project.members.filter((m) => m.userId !== project.managerId),
  ];

  const allUsers = canEditProject
    ? await prisma.user.findMany({
        where: { firmMemberships: { some: { firmId: session.user.firmId } } },
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

      <ProjectMembersPanel
        projectId={project.id}
        managerId={project.managerId}
        members={teamMembers}
        pendingInvitations={project.invitations}
        canManage={canEditProject}
      />

      <KanbanBoard
        projectId={project.id}
        projectManagerId={project.managerId}
        tasks={project.tasks}
        members={allMembers}
        userRole={session.user.role as string}
        userId={session.user.id}
        userProjectRole={userProjectRole}
      />
    </div>
  );
}
