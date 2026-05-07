"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, Copy, Check } from "lucide-react";
import { createInvitation } from "@/lib/actions/users";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type InviteResult = {
  link: string;
  expiresAt: string;
  addedExistingUser?: boolean;
  projectName?: string;
};

export function InviteUserButton({
  projectId,
  projectName,
}: {
  projectId?: string;
  projectName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<"MANAGER" | "MEMBER">("MEMBER");

  function reset() {
    setResult(null);
    setError(null);
    setCopied(false);
    setRole("MEMBER");
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setResult(null);
    formData.set("role", role);
    if (projectId) formData.set("projectId", projectId);
    startTransition(async () => {
      const res = await createInvitation(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.success && res.addedExistingUser) {
        toast.success(`User added to ${res.projectName ?? "project"}`);
        setOpen(false);
        router.refresh();
        return;
      }
      if (res?.success && res.link) {
        setResult({
          link: res.link,
          expiresAt: res.expiresAt!,
          projectName: res.projectName,
        });
        toast.success("Invitation created");
        router.refresh();
      }
    });
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Invite user
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {projectId ? "Invite user to project" : "Invite user to the firm"}
          </DialogTitle>
          <DialogDescription>
            Generate a single-use registration link pinned to an email and role.
            The link is valid for 7 days.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="teammate@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) =>
                  setRole(v as "MANAGER" | "MEMBER")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="MANAGER">Project manager</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {projectId
                  ? `The recipient will join ${projectName ?? "this project"} with this role.`
                  : "The recipient will join the firm with this role."}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create invitation"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
              <p className="font-medium">Invitation link ready</p>
              <p className="text-muted-foreground">
                Copy the link below and send it to the recipient via email or chat.
                {result.projectName ? ` It grants access to ${result.projectName}.` : ""} It expires{" "}
                {new Date(result.expiresAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                .
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input value={result.link} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  reset();
                }}
              >
                Invite another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
