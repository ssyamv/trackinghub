import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatusCard } from "@/lib/trackinghub/sample-data";

const toneClassName: Record<StatusCard["tone"], string> = {
  blue: "bg-chart-1/20",
  green: "bg-chart-2/20",
  purple: "bg-chart-5/20",
  red: "bg-destructive/20",
};

export function MetricCard({ label, value, detail, tone }: StatusCard) {
  return (
    <Card className="min-h-[154px] overflow-hidden">
      <CardHeader className="gap-4 pb-2">
        <div className={cn("h-2 w-16 rounded-full", toneClassName[tone])} />
        <CardDescription className="font-semibold">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-[34px] leading-none tracking-normal">
          {value}
        </CardTitle>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
