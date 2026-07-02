import { describe, expect, test } from "bun:test";
import { translateGitHubRelease, translateVercelWebhook } from "./translators/index.js";
import { notificationEventSchema } from "./types.js";

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

  test("rejects wrong schema version", () => {
    const result = notificationEventSchema.safeParse({
      schemaVersion: 2,
      type: "proposal.submitted",
      source: "room-tba",
      occurredAt: new Date().toISOString(),
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  test("accepts ci.e2e.failed envelope", () => {
    const result = notificationEventSchema.safeParse({
      schemaVersion: 1,
      type: "ci.e2e.failed",
      source: "github",
      occurredAt: new Date().toISOString(),
      idempotencyKey: "ci:e2e.failed:E2E:1",
      payload: { workflow: "E2E", workflowUrl: "https://example.com" },
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

  test("maps deployment.failed", () => {
    const event = translateVercelWebhook({
      type: "deployment.failed",
      payload: { deployment: { url: "https://x.vercel.app" } },
    });
    expect(event?.type).toBe("deploy.failed");
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

  test("ignores non-published actions", () => {
    expect(
      translateGitHubRelease({ action: "created", release: { tag_name: "v1" } }),
    ).toBeNull();
  });
});
