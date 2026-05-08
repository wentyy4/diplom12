"use server";

import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function switchFirm(firmId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await prisma.firmMember.findUnique({
    where: {
      firmId_userId: {
        firmId,
        userId: session.user.id,
      },
    },
  });
  if (!membership) return { error: "You do not belong to this firm" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firmId,
      role: membership.role,
    },
  });
  await updateSession({
    user: {
      role: membership.role,
      firmId,
    },
  });

  revalidatePath("/");
  return { success: true };
}
