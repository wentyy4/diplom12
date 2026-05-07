"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type RegisterFormProps = {
  mode: "admin" | "invitation";
  token?: string;
  email?: string;
  role?: "ADMIN" | "MANAGER" | "MEMBER";
  projectName?: string;
};

export function RegisterForm({ mode, token, email, role, projectName }: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    if (token) formData.set("token", token);
    const result = await register(formData);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="John Doe" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required={mode === "admin"}
          readOnly={mode === "invitation"}
          defaultValue={email}
          className={mode === "invitation" ? "bg-muted" : undefined}
        />
        {mode === "invitation" && (
          <p className="text-xs text-muted-foreground">
            Email is fixed by the invitation.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
        />
        <p className="text-xs text-muted-foreground">At least 6 characters.</p>
      </div>

      {mode === "invitation" && role && (
        <div className="space-y-2">
          <Label>Role</Label>
          <div>
            <Badge variant="secondary">{role}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {projectName
              ? `Assigned for ${projectName} by the administrator who invited you.`
              : "Assigned by the administrator who invited you."}
          </p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting
          ? "Creating account…"
          : mode === "admin"
            ? "Create admin account"
            : "Accept & create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
