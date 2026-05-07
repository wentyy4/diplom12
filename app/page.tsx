import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderKanban } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="flex justify-center">
          <FolderKanban className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">IT Projects</h1>
        <p className="text-muted-foreground text-lg">
          Development of an Information System for IT Project Management.
          Manage projects, tasks, and teams with a modern Kanban board.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Sign up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
