"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canManageProject } from "@/lib/rbac";

/** MANAGER can only create (and becomes manager); ADMIN can create. */
export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return { error: "Only Admin or Manager can create projects" };
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const memberIds = (formData.get("memberIds") as string)
    ?.split(",")
    .filter(Boolean) ?? [];

  if (!name?.trim()) return { error: "Project name is required" };

  const firmMemberIds = memberIds.length
    ? await prisma.firmMember.findMany({
        where: { userId: { in: [...new Set(memberIds)] }, firmId: session.user.firmId },
        select: { userId: true },
      })
    : [];

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      managerId: session.user.id,
      firmId: session.user.firmId,
      members: {
        create: firmMemberIds.map(({ userId }) => ({ userId })),
      },
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { success: true, id: project.id };
}

/**
 * ADMIN can edit any project; MANAGER only projects they manage.
 * MEMBER cannot edit — Server Action rejects with access denied (toast shown by caller).
 */
export async function updateProject(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" };
  if (project.firmId !== session.user.firmId) return { error: "Project not found" };

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (!canManageProject(session.user.role as string, project.managerId, session.user.id, userProjectRole)) {
    return { error: "Access denied: only project manager or admin can edit projects" };
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const memberIds = (formData.get("memberIds") as string)
    ?.split(",")
    .filter(Boolean) ?? [];

  if (!name?.trim()) return { error: "Project name is required" };

  const uniqueMemberIds = [...new Set(memberIds)];
  const firmMemberIds = await prisma.firmMember.findMany({
    where: { userId: { in: uniqueMemberIds }, firmId: session.user.firmId },
    select: { userId: true },
  });
  const allowedMemberIds = firmMemberIds.map(({ userId }) => userId);

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({
      where: { projectId: id, userId: { notIn: allowedMemberIds } },
    });
    await tx.project.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim(),
      },
    });
    for (const userId of allowedMemberIds) {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: id,
            userId,
          },
        },
        update: {},
        create: { projectId: id, userId, role: "MEMBER" },
      });
    }
  });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { success: true };
}

/**
 * ADMIN can delete any project; MANAGER only projects they manage.
 * MEMBER cannot delete — Server Action rejects with access denied.
 */
export async function deleteProject(id: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" };
  if (project.firmId !== session.user.firmId) return { error: "Project not found" };

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (!canManageProject(session.user.role as string, project.managerId, session.user.id, userProjectRole)) {
    return { error: "Access denied: only project manager or admin can delete projects" };
  }

  await prisma.project.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { success: true };
}

/** Removes a user from a project. The project owner cannot be removed. */
export async function removeProjectMember(projectId: string, userId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" };
  if (project.firmId !== session.user.firmId) return { error: "Project not found" };
  if (userId === project.managerId) {
    return { error: "Project owner cannot be removed" };
  }

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (
    !canManageProject(
      session.user.role as string,
      project.managerId,
      session.user.id,
      userProjectRole
    )
  ) {
    return { error: "Access denied: only project manager or admin can remove members" };
  }

  await prisma.$transaction([
    prisma.projectMember.deleteMany({
      where: { projectId, userId },
    }),
    prisma.task.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
