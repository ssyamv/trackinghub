import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ProjectEnvironmentItem,
  ProjectItem,
  SdkKeyItem,
  StatusCard,
} from "@/lib/trackinghub/sample-data";

import { MetricCard } from "./metric-card";
import { StatusBadge } from "./status-badge";

export type ProjectManagementWorkbenchProps = {
  summaryCards: StatusCard[];
  projects: ProjectItem[];
  environments: ProjectEnvironmentItem[];
  sdkKeys: SdkKeyItem[];
};

function statusTone(status: string) {
  if (status === "启用" || status === "运行中") {
    return "success" as const;
  }

  if (status === "停用") {
    return "danger" as const;
  }

  return "warning" as const;
}

export function ProjectManagementWorkbench({
  summaryCards,
  projects,
  environments,
  sdkKeys,
}: ProjectManagementWorkbenchProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <MetricCard
            detail={item.detail}
            key={item.label}
            label={item.label}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl tracking-normal">项目列表</CardTitle>
          <CardDescription>
            以内部产品为单位管理平台来源、负责人、治理事件和运行状态。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>事件</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.slug}>
                  <TableCell className="min-w-64 whitespace-normal">
                    <div className="font-semibold">{project.name}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {project.slug}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {project.description}
                    </p>
                  </TableCell>
                  <TableCell>{project.platforms}</TableCell>
                  <TableCell>{project.owner}</TableCell>
                  <TableCell>{project.events}</TableCell>
                  <TableCell>
                    <StatusBadge tone={statusTone(project.status)}>
                      {project.status}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">环境配置</CardTitle>
            <CardDescription>
              跟踪 dev、staging、prod 的接收状态和写入开关。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {environments.map((environment) => (
                <div
                  className="rounded-lg border border-border p-4"
                  key={`${environment.project}-${environment.name}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{environment.project}</div>
                      <div className="mt-1 font-mono text-sm text-muted-foreground">
                        {environment.name}
                      </div>
                    </div>
                    <StatusBadge
                      tone={environment.enabled ? "success" : "danger"}
                    >
                      {environment.enabled ? "已启用" : "已停用"}
                    </StatusBadge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">最近事件</dt>
                      <dd className="mt-1 font-medium">{environment.lastEventAt}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">写入 Key</dt>
                      <dd className="mt-1 font-medium">
                        {environment.writeKeyStatus}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl tracking-normal">SDK Key 状态</CardTitle>
            <CardDescription>
              区分 Web 与 Flutter 写入密钥，优先处理轮换和停用状态。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sdkKeys.map((key) => (
                  <TableRow key={`${key.project}-${key.environment}-${key.source}`}>
                    <TableCell className="whitespace-normal">
                      <div className="font-semibold">{key.project}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {key.environment}
                      </div>
                    </TableCell>
                    <TableCell>{key.source}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {key.maskedKey}
                      <div className="mt-1 text-muted-foreground">{key.lastUsed}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone(key.status)}>
                        {key.status}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
