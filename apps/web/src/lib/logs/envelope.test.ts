import { describe, expect, it } from "vitest";

import { validateLogEnvelope } from "./envelope";

describe("validateLogEnvelope", () => {
  it("accepts a shared SDK log envelope", () => {
    expect(
      validateLogEnvelope({
        project_id: "project_x",
        environment: "production",
        source: "flutter",
        level: "error",
        message: "图片上传失败",
        logger: "upload",
        timestamp: 1710000000000,
        sdk_version: "0.1.0",
        user_id: "u_123",
        device_id: "device_456",
        trace_id: "trace_789",
        error_name: "UploadException",
        error_message: "timeout",
        stack: "UploadException: timeout",
        attributes: { upload_id: "upload_1" },
        context: { os_name: "iOS" },
      }),
    ).toEqual({
      ok: true,
      value: {
        project_id: "project_x",
        environment: "production",
        source: "flutter",
        level: "error",
        message: "图片上传失败",
        logger: "upload",
        timestamp: 1710000000000,
        sdk_version: "0.1.0",
        user_id: "u_123",
        device_id: "device_456",
        trace_id: "trace_789",
        error_name: "UploadException",
        error_message: "timeout",
        stack: "UploadException: timeout",
        attributes: { upload_id: "upload_1" },
        context: { os_name: "iOS" },
      },
    });
  });

  it("rejects invalid levels and non-object attributes", () => {
    expect(
      validateLogEnvelope({
        project_id: "project_x",
        environment: "prod",
        source: "web",
        level: "verbose",
        message: "",
        timestamp: "now",
        sdk_version: "0.1.0",
        attributes: [],
        context: null,
      }),
    ).toEqual({
      ok: false,
      errors: [
        "message is required",
        "level must be one of debug, info, warn, error, fatal",
        "timestamp must be an epoch millisecond number",
        "attributes must be an object",
        "context must be an object",
      ],
    });
  });
});
