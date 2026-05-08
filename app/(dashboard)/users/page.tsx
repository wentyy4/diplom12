import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { canManageUsers } from "@/lib/rbac";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsersTable } from "@/components/UsersTable";
import { InvitationsTable } from "@/components/InvitationsTable";
import { InviteUserButton } from "@/components/InviteUserButton";
import { Users as UsersIcon } from "lucide-react";

async function getUsers(firmId: string) {
  return prisma.user.findMany({
    where: { firmMemberships: { some: { firmId } } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      firmMemberships: {
        where: { firmId },
        select: { role: true },
      },
      _count: { select: { managedProjects: true, assignedTasks: true } },
    },
    orderBy: { createdAt: "asc" },
  }).then((users) =>
    users.map((user) => ({
      ...user,
      role: user.firmMemberships[0]?.role ?? user.role,
      firmMemberships: undefined,
    }))
  );
}

async function getPendingInvitations(firmId: string) {
  return prisma.invitation.findMany({
    where: { firmId, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      inviter: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.firmId) return null;
  if (!canManageUsers(session.user.role as string)) {
    redirect("/forbidden");
  }

  const [users, invitations] = await Promise.all([
    getUsers(session.user.firmId),
    getPendingInvitations(session.user.firmId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-7 w-7 text-primary" />
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage firm members and pending invitations
          </p>
        </div>
        <InviteUserButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({users.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Everyone with an account in the firm
          </p>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} currentUserId={session.user.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations ({invitations.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Active invitation links waiting to be redeemed. Each link can be
            used once.
          </p>
        </CardHeader>
        <CardContent>
          <InvitationsTable invitations={invitations} />
        </CardContent>
      </Card>
    </div>
  );
}
