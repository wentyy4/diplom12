import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Folder,
  ListChecks,
  Clock,
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  Inbox,
} from "lucide-react";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardKanbanPreview } from "@/components/DashboardKanbanPreview";
import { DashboardChart } from "@/components/DashboardChart";
import { RecentTasks } from "@/components/RecentTasks";

async function getDashboardData(userId: string, role: string) {
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
      tasks: { include: { assignee: { select: { id: true, name: true } } } },
      manager: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
  });

  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
  );
  const totalProjects = projects.length;
  const totalTasks = allTasks.length;
  const inProgress = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const now = new Date();
  const overdue = allTasks.filter(
    (t) => t.deadline && t.deadline < now && t.status !== "DONE"
  ).length;
  const dueSoon = allTasks.filter((t) => {
    if (!t.deadline || t.status === "DONE") return false;
    const diff = (t.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 3;
  }).length;

  const recentTasks = [...allTasks]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  const tasksByStatus = {
    TODO: allTasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
    DONE: allTasks.filter((t) => t.status === "DONE").length,
  };

  return {
    projects,
    allTasks,
    stats: { totalProjects, totalTasks, inProgress, overdue, dueSoon },
    recentTasks,
    tasksByStatus,
  };
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { projects, allTasks, stats, recentTasks, tasksByStatus } =
    await getDashboardData(session.user.id, session.user.role as string);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s your project overview.
        </p>
      </div>

      {/* Stats cards with conditional coloring */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats stats={stats} />
      </Suspense>

      {/* Pie chart - tasks by status */}
      {stats.totalTasks > 0 && (
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[250px] w-full rounded" />
              </CardContent>
            </Card>
          }
        >
          <DashboardChart tasksByStatus={tasksByStatus} totalTasks={stats.totalTasks} />
        </Suspense>
      )}

      {/* Kanban board preview - aggregates ALL tasks, clickable columns */}
      <Card>
        <CardHeader>
          <CardTitle>Kanban Board Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks across all your projects • Click a column to open Kanban
          </p>
        </CardHeader>
        <CardContent>
          <DashboardKanbanPreview allTasks={allTasks} projects={projects} />
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Tasks</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your latest tasks across projects
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RecentTasks tasks={recentTasks} />
        </CardContent>
      </Card>

      {/* Projects list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Projects</CardTitle>
              <p className="text-sm text-muted-foreground">
                Projects you manage or are a member of
              </p>
            </div>
            <Button asChild>
              <Link href="/projects">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                Create your first project to start managing tasks and collaborating with your team.
              </p>
              <Button asChild>
                <Link href="/projects">Create project</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 group"
                >
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project._count.tasks} tasks · {project.manager.name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
