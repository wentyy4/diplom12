import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FolderKanban, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function searchData(userId: string, role: string, firmId: string, query: string) {
  if (!query?.trim() || query.trim().length < 2) {
    return { projects: [], tasks: [] };
  }

  const q = query.trim().toLowerCase();
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

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        projectAccessFilter,
        {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        },
      ],
    },
    include: {
      manager: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
    take: 10,
  });

  const tasks = await prisma.task.findMany({
    where: {
      project: projectAccessFilter,
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
      ],
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { name: true } },
    },
    take: 15,
  });

  return { projects, tasks };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) redirect("/login");

  const { q } = await searchParams;
  const { projects, tasks } = await searchData(
    session.user.id,
    session.user.role as string,
    session.user.firmId,
    q ?? ""
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">
          Find projects and tasks by name or description
        </p>
      </div>

      {(!q || q.length < 2) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm max-w-sm">
              Use the search icon in the top navbar to search across projects and tasks.
            </p>
          </CardContent>
        </Card>
      )}

      {q && q.length >= 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projects ({projects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  No projects match &quot;{q}&quot;
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p._count.tasks} tasks · {p.manager.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Tasks ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  No tasks match &quot;{q}&quot;
                </p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/projects/${t.project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.project.name}
                          {t.assignee && ` · ${t.assignee.name}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          t.priority === "HIGH"
                            ? "destructive"
                            : t.priority === "MEDIUM"
                            ? "warning"
                            : "success"
                        }
                        className="text-[10px]"
                      >
                        {t.priority?.toLowerCase()}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
