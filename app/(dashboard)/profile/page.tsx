import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function getRoleLabel(role?: string | null) {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Project Manager";
  return "Member";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getProfileData(userId: string, role: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      managedProjects: {
        select: {
          id: true,
          name: true,
          updatedAt: true,
          _count: { select: { tasks: true, members: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      memberProjects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              updatedAt: true,
              _count: { select: { tasks: true, members: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      assignedTasks: {
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) return null;

  const projectMap = new Map<
    string,
    {
      id: string;
      name: string;
      updatedAt: Date;
      _count: { tasks: number; members: number };
    }
  >();

  user.managedProjects.forEach((project) => projectMap.set(project.id, project));
  user.memberProjects.forEach(({ project }) => projectMap.set(project.id, project));

  const visibleProjects = Array.from(projectMap.values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const completedTasks = user.assignedTasks.filter(
    (task) => task.status === "DONE"
  ).length;
  const inProgressTasks = user.assignedTasks.filter(
    (task) => task.status === "IN_PROGRESS"
  ).length;

  return {
    user,
    visibleProjects,
    completedTasks,
    inProgressTasks,
    openTasks: user.assignedTasks.length - completedTasks,
  };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getProfileData(
    session.user.id,
    session.user.role as string
  );

  if (!data) return null;

  const { user, visibleProjects, completedTasks, inProgressTasks, openTasks } =
    data;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your account details and project activity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{getRoleLabel(user.role)}</CardDescription>
            </div>
            <Badge variant="secondary" className="mt-2">
              {user.role}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border p-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="truncate text-sm font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Access level</p>
                <p className="text-sm font-medium">{getRoleLabel(user.role)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Projects</CardDescription>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{visibleProjects.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Open tasks</CardDescription>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{openTasks}</p>
                <p className="text-xs text-muted-foreground">
                  {inProgressTasks} in progress
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>Completed</CardDescription>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{completedTasks}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Projects connected to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibleProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserRound className="mb-3 h-10 w-10 text-muted-foreground/60" />
                  <p className="font-medium">No projects assigned yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assigned projects will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleProjects.slice(0, 6).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project._count.tasks} tasks · {project._count.members} members
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <span>Open</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
