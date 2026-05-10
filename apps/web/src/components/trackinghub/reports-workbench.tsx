import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ReportTaskItem,
  ReportTemplateItem,
} from "@/lib/trackinghub/sample-data";

import { StatusBadge } from "./status-badge";

function taskTone(status: string) {
  if (status === "已排队") {
    return "success" as const;
  }

  if (status === "待确认") {
    return "warning" as const;
  }

  return "danger" as const;
}

export function ReportsWorkbench({
  templates,
  tasks,
}: {
  templates: ReportTemplateItem[];
  tasks: ReportTaskItem[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">报告模板</CardTitle>
          <CardDescription>
            报告围绕结构化查询结果生成，不进入热路径，不影响事件接收。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div
              className="rounded-lg border border-border bg-background p-4"
              key={template.type}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{template.type}</div>
                <span className="text-xs text-muted-foreground">
                  {template.cadence}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {template.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {template.inputs.map((input) => (
                  <span
                    className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                    key={input}
                  >
                    {input}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">Codex 任务队列</CardTitle>
          <CardDescription>
            管理日报、异常解释和漏斗掉点解释的生成状态。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.map((task) => (
            <div
              className="rounded-lg border border-border bg-background p-4"
              key={task.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{task.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {task.owner} · {task.schedule}
                  </div>
                </div>
                <StatusBadge tone={taskTone(task.status)}>{task.status}</StatusBadge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
