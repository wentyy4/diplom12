import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, ListChecks, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Stats = {
  totalProjects: number;
  totalTasks: number;
  inProgress: number;
  overdue: number;
  dueSoon: number;
};

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProjects}</div>
        </CardContent>
      </Card>

      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <ListChecks className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "transition-colors hover:bg-muted/30",
          stats.inProgress > 0 && "border-amber-500/30"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{stats.inProgress}</span>
            {stats.inProgress > 0 && (
              <Badge variant="warning" className="text-[10px]">
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "transition-colors hover:bg-muted/30",
          stats.overdue > 0 && "border-destructive/50"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              stats.overdue > 0 ? "text-destructive" : "text-muted-foreground"
            )}
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-2xl font-bold",
                stats.overdue > 0 && "text-destructive"
              )}
            >
              {stats.overdue}
            </span>
            {stats.dueSoon > 0 && stats.overdue === 0 && (
              <Badge variant="warning" className="text-[10px]">
                {stats.dueSoon} due soon (&lt;3 days)
              </Badge>
            )}
            {stats.overdue > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                Past deadline
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
