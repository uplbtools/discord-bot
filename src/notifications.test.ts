import { describe, expect, test } from "bun:test";
import { notificationEventSchema } from "./notifications/types.js";
import {
  translateGitHubRelease,
  translateVercelWebhook,
} from "./notifications/translators/index.js";

describe("notificationEventSchema", () => {
  test("accepts proposal.submitted envelope", () => {
    const result = notificationEventSchema.safeParse({
      schemaVersion: 1,
      type: "proposal.submitted",
      source: "room-tba",
      occurredAt: new Date().toISOString(),
      idempotencyKey: "proposal:1:submitted",
      payload: { proposalId: 1 },
    });
    expect(result.success).toBe(true);
  });
});

describe("translateVercelWebhook", () => {
  test("maps deployment.succeeded", () => {
    const event = translateVercelWebhook({
      type: "deployment.succeeded",
      payload: {
        deployment: {
          url: "https://x.vercel.app",
          meta: { githubCommitRef: "main" },
        },
        project: { name: "room-tba" },
        target: "production",
      },
    });
    expect(event?.type).toBe("deploy.succeeded");
    expect(event?.source).toBe("vercel");
  });

  test("ignores unknown types", () => {
    expect(translateVercelWebhook({ type: "deployment.created" })).toBeNull();
  });
});

describe("translateGitHubRelease", () => {
  test("maps published release", () => {
    const event = translateGitHubRelease({
      action: "published",
      release: {
        tag_name: "v1.0.0",
        name: "v1.0.0",
        html_url: "https://github.com/x",
      },
    });
    expect(event?.type).toBe("release.published");
  });
});
