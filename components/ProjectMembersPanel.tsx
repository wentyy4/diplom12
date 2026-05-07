"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeProjectMember } from "@/lib/actions/projects";
import { revokeInvitation } from "@/lib/actions/users";
import { toast } from "sonner";
import { Trash2, UserMinus } from "lucide-react";

type ProjectMember = {
  role: string;
  user: { id: string; name: string; email: string };
};

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  inviter: { name: string };
};

function roleLabel(role: string) {
  if (role === "PROJECT_MANAGER" || role === "MANAGER") return "Project manager";
  return "Member";
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectMembersPanel({
  projectId,
  managerId,
  members,
  pendingInvitations,
  canManage,
}: {
  projectId: string;
  managerId: string;
  members: ProjectMember[];
  pendingInvitations: PendingInvitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemoveMember(userId: string, name: string) {
    startTransition(async () => {
      const result = await removeProjectMember(projectId, userId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${name} removed from project`);
      router.refresh();
    });
  }

  function handleRevoke(invitationId: string) {
    startTransition(async () => {
      const result = await revokeInvitation(invitationId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation revoked");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Members</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isOwner = member.user.id === managerId;
                return (
                  <TableRow key={member.user.id}>
                    <TableCell className="font-medium">{member.user.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOwner || member.role === "PROJECT_MANAGER" ? "secondary" : "outline"}>
                        {isOwner ? "Owner" : roleLabel(member.role)}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pending || isOwner}
                          onClick={() =>
                            handleRemoveMember(member.user.id, member.user.name)
                          }
                          title={isOwner ? "Project owner cannot be removed" : "Remove from project"}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {canManage && (
          <div>
            <h3 className="text-sm font-medium mb-2">Pending invitations</h3>
            {pendingInvitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel(invitation.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invitation.inviter.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invitation.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          onClick={() => handleRevoke(invitation.id)}
                          title="Revoke invitation"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
