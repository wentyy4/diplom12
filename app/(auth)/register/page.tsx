import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderKanban, MailX, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvitationByToken } from "@/lib/actions/auth";
import { RegisterForm } from "@/components/RegisterForm";

type RegisterPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { token } = await searchParams;

  if (token) {
    const inv = await getInvitationByToken(token);
    if (!inv.ok) {
      return (
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <MailX className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invitation problem</CardTitle>
            <CardDescription>{inv.error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <FolderKanban className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Accept invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join as{" "}
            <span className="font-semibold">{inv.role}</span>
            {inv.project ? (
              <>
                {" "}
                in <span className="font-semibold">{inv.project.name}</span>
              </>
            ) : null}
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm
            mode="invitation"
            token={token}
            email={inv.email}
            role={inv.role}
            projectName={inv.project?.name}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <ShieldCheck className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create admin account</CardTitle>
        <CardDescription>
          Register freely. Your account will be created as an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm mode="admin" />
      </CardContent>
    </Card>
  );
}
