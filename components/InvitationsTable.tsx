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
import { Copy, Check, Trash2 } from "lucide-react";
import { revokeInvitation } from "@/lib/actions/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  inviter: { name: string };
  project: { name: string } | null;
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

function buildLink(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register?token=${encodeURIComponent(token)}`;
}

export function InvitationsTable({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No pending invitations.
      </p>
    );
  }

  async function copyLink(inv: Invitation) {
    try {
      await navigator.clipboard.writeText(buildLink(inv.token));
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error("Could not copy");
    }
  }

  function handleRevoke(inv: Invitation) {
    startTransition(async () => {
      const res = await revokeInvitation(inv.id);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Invitation revoked");
      router.refresh();
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead>Invited by</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-medium">{inv.email}</TableCell>
            <TableCell>
              <Badge variant={roleVariant[inv.role] ?? "outline"}>
                {inv.role}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {inv.project ? inv.project.name : "Firm"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {inv.inviter.name}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(inv.expiresAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyLink(inv)}
                >
                  {copiedId === inv.id ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy link
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => handleRevoke(inv)}
                  title="Revoke invitation"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
