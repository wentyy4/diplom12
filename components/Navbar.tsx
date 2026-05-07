import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { NavbarSearch } from "@/components/NavbarSearch";

async function getAlertTasks(userId: string, role?: string) {
  const projects = await prisma.project.findMany({
    where:
      role === "ADMIN"
        ? {}
        : {
            OR: [
              { managerId: userId },
              { members: { some: { userId } } },
            ],
          },
    include: {
      tasks: {
        where: {
          status: { not: "DONE" },
          deadline: { not: null },
        },
      },
    },
  });

  const now = new Date();
  const overdueTasks: { id: string; title: string; projectId: string; projectName: string; deadline: Date | null; isOverdue: boolean }[] = [];
  const dueSoonTasks: { id: string; title: string; projectId: string; projectName: string; deadline: Date | null; isOverdue: boolean }[] = [];

  for (const p of projects) {
    for (const t of p.tasks) {
      if (!t.deadline) continue;
      const diff = (t.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const item = {
        id: t.id,
        title: t.title,
        projectId: p.id,
        projectName: p.name,
        deadline: t.deadline,
        isOverdue: diff < 0,
      };
      if (diff < 0) overdueTasks.push(item);
      else if (diff < 3) dueSoonTasks.push(item);
    }
  }

  return { overdueTasks, dueSoonTasks };
}

export async function Navbar() {
  const session = await auth();
  const { overdueTasks, dueSoonTasks } = session?.user?.id
    ? await getAlertTasks(session.user.id, session.user.role)
    : { overdueTasks: [], dueSoonTasks: [] };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex-1 flex items-center gap-2">
        <NavbarSearch userId={session?.user?.id} />
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsDropdown
          overdueTasks={overdueTasks}
          dueSoonTasks={dueSoonTasks}
        />
        <Link
          href="/profile"
          className="flex items-center gap-2 pl-2 border-l rounded-md hover:text-primary transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {session?.user?.name?.slice(0, 2).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium">{session?.user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">
              {session?.user?.role === "ADMIN"
                ? "Admin"
                : session?.user?.role === "MANAGER"
                ? "Project Manager"
              : "Member"}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}
