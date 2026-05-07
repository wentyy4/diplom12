import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-center text-2xl">Access denied</CardTitle>
          <p className="text-center text-muted-foreground">
            You don&apos;t have permission to view or perform this action.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">Back to projects</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
