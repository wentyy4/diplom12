"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidEmail } from "@/lib/validations";
import { isInviteRole, type Role } from "@/lib/rbac";

/** Public preview of an invitation by token for the register page. */
export async function getInvitationByToken(token: string): Promise<
  | {
      ok: true;
      email: string;
      role: Exclude<Role, "ADMIN">;
      expiresAt: Date;
      project: { id: string; name: string } | null;
      firm: { id: string; name: string };
    }
  | { ok: false; error: string }
> {
  if (!token || token.length < 16) return { ok: false, error: "Invalid token" };
  const inv = await prisma.invitation.findUnique({
    where: { token },
    include: {
      firm: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!inv) return { ok: false, error: "Invitation not found" };
  if (inv.acceptedAt) return { ok: false, error: "Invitation already used" };
  if (inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Invitation expired" };
  }
  if (!isInviteRole(inv.role)) {
    return { ok: false, error: "Invalid role on invitation" };
  }
  return {
    ok: true,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt,
    project: inv.project,
    firm: inv.firm,
  };
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  if (!email || !password) {
    return { error: "Email and password are required" };
  }
  if (!isValidEmail(email)) {
    return { error: "Invalid email format" };
  }
  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error) {
      return { error: "Invalid email or password" };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  revalidatePath("/");
  redirect("/dashboard");
}

/**
 * Registration flow:
 * 1. With token: create an invited participant using the invitation role/scope.
 * 2. Without token: create a new firm and make the registrant its ADMIN.
 *
 * Client-submitted role fields are intentionally ignored. The public form
 * cannot choose roles across existing firms.
 */
export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const passwordRaw = formData.get("password") as string;
  const formEmail = (formData.get("email") as string)?.trim();
  const token = ((formData.get("token") as string) || "").trim();

  if (!name?.trim() || !passwordRaw) {
    return { error: "Name and password are required" };
  }
  if (passwordRaw.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  let email: string;
  let role: Role;
  let consumeInvitationId: string | null = null;
  let projectInvitationId: string | null = null;
  let invitationFirmId: string | null = null;

  if (token) {
    const inv = await getInvitationByToken(token);
    if (!inv.ok) return { error: inv.error };
    email = inv.email.toLowerCase();
    role = inv.role;
    const row = await prisma.invitation.findUnique({ where: { token } });
    consumeInvitationId = row?.id ?? null;
    projectInvitationId = row?.projectId ?? null;
    invitationFirmId = row?.firmId ?? null;
  } else {
    if (!formEmail) return { error: "Email is required" };
    if (!isValidEmail(formEmail)) return { error: "Invalid email format" };
    email = formEmail.toLowerCase();
    role = "ADMIN";
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !token) return { error: "Email already registered" };

  const hashed = await bcrypt.hash(passwordRaw, 10);

  const inviteError = await prisma.$transaction(async (tx) => {
    const firmId =
      invitationFirmId ??
      (
        await tx.firm.create({
          data: { name: `${name.trim()}'s firm` },
          select: { id: true },
        })
      ).id;
    const userRole: Role = projectInvitationId ? "MEMBER" : role;
    const user = existing
      ? existing
      : await tx.user.create({
          data: {
            name: name.trim(),
            email,
            password: hashed,
            role: userRole,
            firmId,
          },
        });

    if (existing) {
      const validPassword = await bcrypt.compare(passwordRaw, existing.password);
      if (!validPassword) {
        throw new Error("Invalid password for existing account");
      }
    }

    await tx.firmMember.upsert({
      where: {
        firmId_userId: {
          firmId,
          userId: user.id,
        },
      },
      update: { role },
      create: {
        firmId,
        userId: user.id,
        role,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        firmId,
        role,
      },
    });

    if (projectInvitationId) {
      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: projectInvitationId,
            userId: user.id,
          },
        },
        update: {
          role: role === "MANAGER" ? "PROJECT_MANAGER" : "MEMBER",
        },
        create: {
          projectId: projectInvitationId,
          userId: user.id,
          role: role === "MANAGER" ? "PROJECT_MANAGER" : "MEMBER",
        },
      });
    }

    if (consumeInvitationId) {
      await tx.invitation.update({
        where: { id: consumeInvitationId },
        data: { acceptedAt: new Date() },
      });
    }
    return null;
  }).catch((error) => {
    if (error instanceof Error && error.message === "Invalid password for existing account") {
      return { error: "This email already has an account. Enter its current password to accept the invitation." };
    }
    throw error;
  });
  if (inviteError) return inviteError;

  revalidatePath("/");
  revalidatePath("/users");
  redirect("/login");
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
