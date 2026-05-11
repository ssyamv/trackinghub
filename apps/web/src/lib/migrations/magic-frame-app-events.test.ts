import { describe, expect, test } from "vitest";
import {
  magicFrameAppEventInventory,
  validateMagicFrameAppEventInventory,
} from "./magic-frame-app-events";

describe("magicFrameAppEventInventory", () => {
  test("describes Magic Frame App as the first formal TrackingHub project", () => {
    expect(magicFrameAppEventInventory.project.slug).toBe("magic_frame_app");
    expect(magicFrameAppEventInventory.project.name).toBe("Magic Frame App");
    expect(magicFrameAppEventInventory.project.platforms).toContain("flutter");
  });

  test("uses Magic Frame App environment names", () => {
    expect(
      magicFrameAppEventInventory.environments.map(
        (environment) => environment.name,
      ),
    ).toEqual(["test", "develop", "production"]);
  });

  test("contains Firebase and server-side push events from Magic Frame App", () => {
    const eventNames = magicFrameAppEventInventory.events.map(
      (event) => event.name,
    );

    expect(eventNames).toContain("frame_enter");
    expect(eventNames).toContain("template_detail_page_view");
    expect(eventNames).toContain("credits_package_exposure");
    expect(eventNames).toContain("activity_convert");
    expect(eventNames).toContain("magic_banner_click");
    expect(eventNames).toContain("help_support_contact_tapped");
    expect(eventNames).toContain("open");
    expect(eventNames).toContain("click");
    expect(eventNames).toContain("get_fcm_token_fail");
  });

  test("is safe to import into event_definitions", () => {
    const result = validateMagicFrameAppEventInventory(
      magicFrameAppEventInventory,
    );

    expect(result).toEqual({
      eventCount: magicFrameAppEventInventory.events.length,
      propertyCount: magicFrameAppEventInventory.events.reduce(
        (total, event) => total + event.properties.length,
        0,
      ),
      serverEventCount: 3,
    });
  });
});
