import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FolderKanban } from "lucide-react";
import { canManageProject } from "@/lib/rbac";
import { ProjectsTable } from "@/components/ProjectsTable";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getProjects(userId: string, role: string) {
  return prisma.project.findMany({
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
      manager: { select: { name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const canManage = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const [projects, allUsers] = await Promise.all([
    getProjects(session.user.id, session.user.role as string),
    canManage ? getAllUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your IT projects
          </p>
        </div>
        {canManage && (
          <ProjectsTable
            projects={projects}
            userId={session.user.id}
            userRole={session.user.role as string}
            allUsers={allUsers}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <p className="text-sm text-muted-foreground">
            {projects.length} project(s) you have access to
          </p>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
              <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                Create your first project to start managing tasks and collaborating.
              </p>
              {canManage && (
                <ProjectsTable
                  projects={[]}
                  userId={session.user.id}
                  userRole={session.user.role as string}
                  allUsers={allUsers}
                  triggerLabel="Create your first project"
                />
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const currentMembership = project.members.find(
                    (member) => member.user.id === session.user.id
                  );
                  return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {project.description || "—"}
                    </TableCell>
                    <TableCell>{project.manager.name}</TableCell>
                    <TableCell>{project._count.tasks}</TableCell>
                    <TableCell>{project._count.members}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/projects/${project.id}`}>Open</Link>
                        </Button>
                        {canManageProject(
                          session.user.role as string,
                          project.managerId,
                          session.user.id,
                          currentMembership?.role
                        ) && (
                          <>
                            <ProjectsTable
                              projects={projects}
                              userId={session.user.id}
                              userRole={session.user.role as string}
                              allUsers={allUsers}
                              editProject={project}
                              triggerLabel="Edit"
                              variant="outline"
                              size="sm"
                            />
                            <DeleteProjectButton
                              projectId={project.id}
                              projectName={project.name}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
