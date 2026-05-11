import { LoginForm } from "@/components/trackinghub/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)] lg:items-center">
        <section className="space-y-5">
          <div className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
            TrackingHub
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground">
              统一管理埋点、验收和分析报告
            </h1>
          </div>
          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            {["事件字典", "Schema 验收", "分析报告"].map((item) => (
              <div
                className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
