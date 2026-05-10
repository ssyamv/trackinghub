import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-6 border-b border-border pb-6 xl:grid-cols-[1fr_auto] xl:items-end">
      <div>
        <p className="text-xs font-bold uppercase leading-4 text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-2 max-w-[820px] text-3xl font-bold leading-tight tracking-normal sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
