"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SearchProject = {
  id: string;
  name: string;
  manager: { name: string };
  _count: { tasks: number };
};

export type SearchTask = {
  id: string;
  title: string;
  priority: string;
  project: { id: string; name: string };
  assignee: { name: string } | null;
};

export async function searchGlobal(query: string): Promise<{
  projects: SearchProject[];
  tasks: SearchTask[];
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) {
    return { projects: [], tasks: [], error: "Unauthorized" };
  }

  const q = query?.trim();
  if (!q || q.length < 2) {
    return { projects: [], tasks: [] };
  }

  const qLower = q.toLowerCase();
  const userId = session.user.id;
  const role = session.user.role as string;
  const firmId = session.user.firmId;
  const projectAccessFilter =
    role === "ADMIN"
      ? { firmId }
      : {
          firmId,
          OR: [
            { managerId: userId },
            { members: { some: { userId } } },
          ],
        };

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        AND: [
          projectAccessFilter,
          {
            OR: [
              { name: { contains: qLower } },
              { description: { contains: qLower } },
            ],
          },
        ],
      },
      include: {
        manager: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
      take: 10,
    }),
    prisma.task.findMany({
      where: {
        project: projectAccessFilter,
        OR: [
          { title: { contains: qLower } },
          { description: { contains: qLower } },
        ],
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true } },
      },
      take: 15,
    }),
  ]);

  return { projects, tasks };
}
