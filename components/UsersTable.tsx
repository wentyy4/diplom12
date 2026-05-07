"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { updateUserRole, deleteUser } from "@/lib/actions/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  _count: { managedProjects: number; assignedTasks: number };
};

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  MANAGER: "secondary",
  MEMBER: "outline",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No users yet.
      </p>
    );
  }

  function handleRoleChange(user: UserRow, newRole: string) {
    if (user.role === newRole) return;
    startTransition(async () => {
      const res = await updateUserRole(user.id, newRole);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`${user.name} is now ${newRole}`);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirmDelete) return;
    const user = confirmDelete;
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Deleted ${user.name}`);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}{" "}
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleVariant[u.role] ?? "outline"}>
                      {u.role}
                    </Badge>
                    <Select
                      disabled={pending}
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u, v)}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>{u._count.managedProjects}</TableCell>
                <TableCell>{u._count.assignedTasks}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(u.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending || isSelf}
                    onClick={() => setConfirmDelete(u)}
                    title={isSelf ? "You cannot delete yourself" : "Delete user"}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Permanently delete{" "}
            <span className="font-semibold">{confirmDelete?.name}</span>{" "}
            ({confirmDelete?.email})? Their managed projects will be deleted
            and tasks assigned to them will be unassigned.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
