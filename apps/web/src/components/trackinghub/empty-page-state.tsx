import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type EmptyPageStateProps = {
  badge: string;
  title: string;
  action?: ReactNode;
  sections: string[];
};

export function EmptyPageState({
  badge,
  title,
  action,
  sections,
}: EmptyPageStateProps) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit" variant="secondary">
          {badge}
        </Badge>
        <CardTitle className="text-2xl tracking-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <div
              className="rounded-lg border border-border bg-muted/40 px-4 py-4 text-sm font-semibold text-foreground"
              key={section}
            >
              {section}
            </div>
          ))}
        </div>
        {action ? <div className="w-fit">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
