import { AccountSettingsPanel } from "@/components/trackinghub/account-settings-panel";
import { AppShell } from "@/components/trackinghub/app-shell";
import { PageHeader } from "@/components/trackinghub/page-header";
import { getCurrentUserFromCookieHeader } from "@/lib/api/auth";
import { assertCanRead } from "@/lib/auth/permissions";
import { pageShells } from "@/lib/trackinghub/page-shells";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUserFromCookieHeader(
    (await headers()).get("cookie"),
  );

  if (!user?.id || !user.email || !user.name) {
    redirect("/login");
  }

  assertCanRead(user);

  return (
    <AppShell activeHref="/settings">
      <PageHeader
        eyebrow={pageShells.settings.eyebrow}
        title={pageShells.settings.title}
      />
      <div className="mt-6">
        <AccountSettingsPanel
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }}
        />
      </div>
    </AppShell>
  );
}
