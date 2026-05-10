const navItems = [
  "Home",
  "Projects",
  "Tracking Governance",
  "Analytics",
  "Reports",
  "Settings",
];

const statusCards = [
  { label: "Active projects", value: "4", detail: "Web 2, Flutter 2" },
  { label: "Active users today", value: "18.4k", detail: "+7.8% vs yesterday" },
  { label: "Event volume today", value: "2.7m", detail: "p95 ingest lag 1.8s" },
  { label: "Data anomalies", value: "3", detail: "2 schema, 1 volume" },
];

const acceptanceItems = [
  {
    event: "pay_button_click",
    project: "Magic Frame",
    source: "Web + Flutter",
    status: "Missing Flutter country",
  },
  {
    event: "campaign_card_view",
    project: "Homture",
    source: "Web",
    status: "Ready for acceptance",
  },
  {
    event: "subscription_success",
    project: "Magic Frame",
    source: "Flutter",
    status: "Schema mismatch",
  },
];

const reportItems = [
  "Daily product operations report queued for 09:30",
  "Campaign spring_sale conversion up 12.4%",
  "D7 retention dip needs channel breakdown",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#15171c]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-[#dde2ea] bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#537188]">
                TrackingHub
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal">
                Analytics Ops
              </h1>
            </div>
            <span className="rounded-md bg-[#e9f3ef] px-3 py-1 text-sm font-medium text-[#23614a]">
              MVP
            </span>
          </div>

          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => (
              <a
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  item === "Home"
                    ? "bg-[#1e2a36] text-white"
                    : "text-[#4b5563] hover:bg-[#f1f4f8] hover:text-[#15171c]"
                }`}
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex flex-col justify-between gap-4 border-b border-[#dde2ea] pb-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-[#637083]">
                Cross-project status
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-normal">
                Trusted tracking workflow for product, ops, and engineering
              </h2>
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border border-[#cfd7e3] bg-white px-4 py-2 text-sm font-semibold text-[#263241]">
                New request
              </button>
              <button className="rounded-md bg-[#23614a] px-4 py-2 text-sm font-semibold text-white">
                Ingest event
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statusCards.map((card) => (
              <article
                className="rounded-lg border border-[#dde2ea] bg-white p-5"
                key={card.label}
              >
                <p className="text-sm font-medium text-[#637083]">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-normal">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-[#637083]">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-lg border border-[#dde2ea] bg-white">
              <div className="border-b border-[#dde2ea] px-5 py-4">
                <h3 className="text-lg font-semibold tracking-normal">
                  Pending tracking acceptance
                </h3>
              </div>
              <div className="divide-y divide-[#edf0f4]">
                {acceptanceItems.map((item) => (
                  <div
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_150px_160px_190px] md:items-center"
                    key={`${item.project}-${item.event}`}
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold text-[#1e2a36]">
                        {item.event}
                      </p>
                      <p className="mt-1 text-sm text-[#637083]">
                        {item.project}
                      </p>
                    </div>
                    <p className="text-sm text-[#4b5563]">{item.source}</p>
                    <p className="text-sm text-[#4b5563]">staging + prod</p>
                    <span className="w-fit rounded-md bg-[#fff3d6] px-3 py-1 text-sm font-medium text-[#795b00]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#dde2ea] bg-[#1e2a36] p-5 text-white">
              <h3 className="text-lg font-semibold tracking-normal">
                Codex analysis summary
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#d3dbe4]">
                Event quality is broadly healthy. Prioritize campaign payload
                parity before accepting the current release batch.
              </p>
              <ul className="mt-5 grid gap-3">
                {reportItems.map((item) => (
                  <li
                    className="rounded-md bg-white/8 px-3 py-3 text-sm text-[#edf2f7]"
                    key={item}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
