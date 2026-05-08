"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  canManageProject,
  canManageUsers,
  isInviteRole,
  isRole,
} from "@/lib/rbac";
import { isValidEmail } from "@/lib/validations";
import { randomBytes } from "crypto";

const INVITATION_TTL_DAYS = 7;
const TOKEN_BYTES = 24; // 32 chars in base64url

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function buildInviteLink(token: string): string {
  // Use the configured app URL when present; fall back to localhost for local development.
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/register?token=${encodeURIComponent(token)}`;
}

/**
 * Creates a single-use, time-limited invitation pinned to an email, optional
 * project, and target role. ADMIN can invite globally; ADMIN or the project's
 * manager/project-manager can invite users to that project.
 *
 * If a non-accepted, non-expired invitation already exists for the same
 * email, it is replaced — preventing accidental token leakage.
 */
export async function createInvitation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const emailRaw = (formData.get("email") as string)?.trim().toLowerCase();
  const roleRaw = (formData.get("role") as string)?.trim();
  const projectId = ((formData.get("projectId") as string) || "").trim() || null;

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return { error: "Invalid email" };
  }
  if (!isInviteRole(roleRaw)) {
    return { error: "Invalid role" };
  }
  const role = roleRaw;

  const project = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
      })
    : null;
  if (projectId && !project) return { error: "Project not found" };
  if (!project && !canManageUsers(session.user.role as string)) {
    return { error: "Only Admin can invite users to the firm" };
  }
  if (project) {
    const membership = project.members.find(
      (member) => member.userId === session.user.id
    );
    if (
      !canManageProject(
        session.user.role as string,
        project.managerId,
        session.user.id,
        membership?.role
      )
    ) {
      return { error: "You can only invite users to your own projects" };
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email: emailRaw } });
  if (existingUser) {
    if (!projectId) {
      return { error: "A user with this email is already registered" };
    }
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: existingUser.id,
        },
      },
      update: {
        role: role === "MANAGER" ? "PROJECT_MANAGER" : "MEMBER",
      },
      create: {
        projectId,
        userId: existingUser.id,
        role: role === "MANAGER" ? "PROJECT_MANAGER" : "MEMBER",
      },
    });
    // If the user gains project-manager rights inside a project, lift their
    // global role from MEMBER to MANAGER so they can also create their own
    // projects. ADMINs stay ADMIN; existing MANAGERs are unchanged.
    if (role === "MANAGER" && existingUser.role === "MEMBER") {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "MANAGER" },
      });
    }
    revalidatePath("/users");
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return {
      success: true,
      addedExistingUser: true,
      projectName: project?.name,
    };
  }

  // Drop any prior pending invitations for the same email to avoid two live tokens.
  await prisma.invitation.deleteMany({
    where: { email: emailRaw, acceptedAt: null, projectId },
  });

  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email: emailRaw,
      role,
      token,
      expiresAt,
      invitedBy: session.user.id,
      projectId,
    },
  });

  revalidatePath("/users");
  if (projectId) revalidatePath(`/projects/${projectId}`);

  return {
    success: true,
    invitationId: invitation.id,
    link: buildInviteLink(token),
    expiresAt: expiresAt.toISOString(),
    projectName: project?.name,
  };
}

/** Deletes a pending invitation. ADMIN can revoke any; project managers can revoke project invites they manage. */
export async function revokeInvitation(invitationId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { project: { include: { members: true } } },
  });
  if (!inv) return { error: "Invitation not found" };
  if (inv.acceptedAt) return { error: "Cannot revoke an accepted invitation" };
  if (!canManageUsers(session.user.role as string)) {
    if (!inv.project) {
      return { error: "Only Admin can revoke firm invitations" };
    }
    const membership = inv.project.members.find(
      (member) => member.userId === session.user.id
    );
    if (
      !canManageProject(
        session.user.role as string,
        inv.project.managerId,
        session.user.id,
        membership?.role
      )
    ) {
      return { error: "You can only revoke invitations for your own projects" };
    }
  }
  await prisma.invitation.delete({ where: { id: invitationId } });
  revalidatePath("/users");
  if (inv.projectId) revalidatePath(`/projects/${inv.projectId}`);
  return { success: true };
}

/**
 * ADMIN-only. Changes the role of an existing user.
 * Guard against self-demotion: an admin cannot strip their own ADMIN role
 * if they are the last ADMIN — the firm must always have at least one.
 */
export async function updateUserRole(userId: string, newRole: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!canManageUsers(session.user.role as string)) {
    return { error: "Only Admin can change user roles" };
  }
  if (!isRole(newRole)) return { error: "Invalid role" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.role === newRole) return { success: true };

  // Block demoting the last ADMIN.
  if (target.role === "ADMIN" && newRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "Cannot demote the last administrator" };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
  revalidatePath("/users");
  return { success: true };
}

/**
 * ADMIN-only. Deletes a user account.
 * Self-deletion is forbidden to prevent locking the firm out of admin access
 * via misclick. The last ADMIN cannot be deleted either.
 */
export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!canManageUsers(session.user.role as string)) {
    return { error: "Only Admin can delete users" };
  }
  if (userId === session.user.id) {
    return { error: "You cannot delete your own account" };
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "Cannot delete the last administrator" };
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
  return { success: true };
}
