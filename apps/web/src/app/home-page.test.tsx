import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("home page", () => {
  it("places the project onboarding queue before integration health", async () => {
    const html = renderToStaticMarkup(await Home({ searchParams: {} }));

    expect(html.indexOf("项目接入队列")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("接入健康")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("项目接入队列")).toBeLessThan(
      html.indexOf("接入健康"),
    );
  });
});
