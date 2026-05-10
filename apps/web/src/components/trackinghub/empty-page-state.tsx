import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EmptyPageState({
  badge,
  title,
  description,
  actionLabel,
  sections,
}: {
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
  sections: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit" variant="secondary">
          {badge}
        </Badge>
        <CardTitle className="text-2xl tracking-normal">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-[15px] leading-7">
          {description}
        </CardDescription>
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
        <Button className="w-fit">{actionLabel}</Button>
      </CardContent>
    </Card>
  );
}
