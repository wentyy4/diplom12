"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPriorityFromDeadline } from "@/lib/validations";
import {
  canCreateTask,
  canDeleteTask,
  canEditTask,
  canMoveTask,
  canAssignTask,
} from "@/lib/rbac";

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

function isTaskStatus(status: string): status is (typeof TASK_STATUSES)[number] {
  return TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number]);
}

/**
 * Resolve project and check access. ADMIN can access every project; others
 * must own the project or belong to it.
 */
async function ensureProjectAccess(
  projectId: string,
  userId: string,
  role: string,
  firmId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { error: "Project not found" as const, project: null };
  if (project.firmId !== firmId) {
    return { error: "Project not found" as const, project: null };
  }

  const isManager = project.managerId === userId;
  const membership = project.members.find((m) => m.userId === userId);
  const isMember = !!membership;
  const hasAccess = role === "ADMIN" || isManager || isMember;
  if (!hasAccess) return { error: "Access denied" as const, project: null };

  return { error: null, project };
}

export async function createTask(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const { error, project } = await ensureProjectAccess(
    projectId,
    session.user.id,
    session.user.role as string,
    session.user.firmId
  );
  if (error || !project) return { error: error ?? "Access denied" };

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (!canCreateTask(session.user.role as string, project.managerId, session.user.id, userProjectRole)) {
    return { error: "Only Admin or project Manager can create tasks" };
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const deadlineStr = formData.get("deadline") as string | null;
  const assigneeIdRaw = formData.get("assigneeId") as string;
  const assigneeId = assigneeIdRaw && assigneeIdRaw.trim() ? assigneeIdRaw : null;

  if (!title?.trim()) return { error: "Task title is required" };

  const deadline = deadlineStr ? new Date(deadlineStr) : null;
  const priority = getPriorityFromDeadline(deadline);

  const maxPos = await prisma.task.aggregate({
    where: { projectId, status: "TODO" },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      deadline,
      priority,
      projectId,
      assigneeId: assigneeId || null,
      status: "TODO",
      position,
    },
    include: {
      assignee: { select: { id: true, name: true } },
    },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true, task };
}

export async function updateTask(
  taskId: string,
  projectId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const { error, project } = await ensureProjectAccess(
    projectId,
    session.user.id,
    session.user.role as string,
    session.user.firmId
  );
  if (error || !project) return { error: error ?? "Access denied" };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };

  const canEdit = canEditTask(
    session.user.role as string,
    project.managerId,
    session.user.id,
    task.assigneeId,
    project.members.find((m) => m.userId === session.user.id)?.role ?? null
  );
  if (!canEdit) return { error: "You can only edit your own assigned tasks" };

  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const deadlineStr = formData.get("deadline") as string | null;
  const assigneeValue = formData.get("assigneeId");
  const assigneeId =
    typeof assigneeValue === "string" && assigneeValue.trim()
      ? assigneeValue
      : null;
  const status = formData.get("status") as string | null;

  const canChangeAssignee = canAssignTask(
    session.user.role as string,
    project.managerId,
    session.user.id,
    project.members.find((m) => m.userId === session.user.id)?.role ?? null
  );
  const canChangeDetails = canEdit;

  const updates: {
    title?: string;
    description?: string;
    deadline?: Date | null;
    assigneeId?: string | null;
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    priority?: "LOW" | "MEDIUM" | "HIGH";
  } = {};

  if (title !== null && canChangeDetails) updates.title = title.trim();
  if (description !== null && canChangeDetails) updates.description = description.trim();
  if (deadlineStr !== null && canChangeDetails) {
    updates.deadline = deadlineStr ? new Date(deadlineStr) : null;
    updates.priority = getPriorityFromDeadline(updates.deadline ?? task.deadline);
  }
  if (assigneeValue !== null && canChangeAssignee) updates.assigneeId = assigneeId;
  if (status && canEdit) {
    if (!isTaskStatus(status)) return { error: "Invalid task status" };
    updates.status = status;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: updates,
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTask(taskId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };

  const { error, project } = await ensureProjectAccess(
    projectId,
    session.user.id,
    session.user.role as string,
    session.user.firmId
  );
  if (error || !project) return { error: error ?? "Access denied" };

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (!canDeleteTask(session.user.role as string, project.managerId, session.user.id, userProjectRole)) {
    return { error: "Only Admin or project Manager can delete tasks" };
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function moveTask(
  taskId: string,
  projectId: string,
  newStatus: "TODO" | "IN_PROGRESS" | "DONE",
  newPosition: number
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return { error: "Unauthorized" };
  if (!isTaskStatus(newStatus)) return { error: "Invalid task status" };
  if (!Number.isInteger(newPosition) || newPosition < 0) {
    return { error: "Invalid task position" };
  }

  const { error, project } = await ensureProjectAccess(
    projectId,
    session.user.id,
    session.user.role as string,
    session.user.firmId
  );
  if (error || !project) return { error: error ?? "Access denied" };

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };
  if (task.projectId !== projectId) return { error: "Task not found" };

  const userProjectRole =
    project.members.find((m) => m.userId === session.user.id)?.role ?? null;

  if (!canMoveTask(session.user.role as string, project.managerId, session.user.id, task.assigneeId, userProjectRole)) {
    return { error: "You can only move your own assigned tasks" };
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus, position: newPosition },
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
