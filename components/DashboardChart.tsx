"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(142, 76%, 36%)"];
const STATUS_LABELS = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };

export function DashboardChart({
  tasksByStatus,
  totalTasks,
}: {
  tasksByStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  totalTasks: number;
}) {
  const data = [
    { name: STATUS_LABELS.TODO, value: tasksByStatus.TODO, color: COLORS[0] },
    { name: STATUS_LABELS.IN_PROGRESS, value: tasksByStatus.IN_PROGRESS, color: COLORS[1] },
    { name: STATUS_LABELS.DONE, value: tasksByStatus.DONE, color: COLORS[2] },
  ].filter((d) => d.value > 0);

  const donePercent = totalTasks > 0 ? Math.round((tasksByStatus.DONE / totalTasks) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Status Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          {donePercent}% of tasks completed
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] min-h-[250px] w-full min-w-0">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value?: number) => [
                    `${value ?? 0} (${
                      totalTasks > 0
                        ? Math.round(((value ?? 0) / totalTasks) * 100)
                        : 0
                    }%)`,
                    "",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No tasks to display
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
