"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canManageProject } from "@/lib/rbac";

/** MANAGER can only create (and becomes manager); ADMIN can create. */
export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

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

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      managerId: session.user.id,
      members: {
        create: [...new Set(memberIds)].map((userId) => ({ userId })),
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
  if (!session?.user?.id) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" };

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

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({
      where: { projectId: id, userId: { notIn: uniqueMemberIds } },
    });
    await tx.project.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description.trim(),
      },
    });
    for (const userId of uniqueMemberIds) {
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
  if (!session?.user?.id) return { error: "Unauthorized" };

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" };

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
