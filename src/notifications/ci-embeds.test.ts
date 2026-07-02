import { describe, expect, test } from "bun:test";
import { channelIdForCiEvent, ciE2eEmbed } from "./ci-embeds.js";

describe("ciE2eEmbed", () => {
  test("builds PR failure embed", () => {
    const embed = ciE2eEmbed(
      "ci.e2e.failed",
      {
        workflow: "E2E",
        workflowUrl: "https://github.com/uplbtools/room-tba/actions/runs/1",
        branch: "feat/foo",
        commitSha: "abc1234567890",
        prNumber: 447,
        failedStep: "Playwright blocking tests",
        artifactName: "playwright-report-blocking-1",
      },
      "2026-07-03T21:00:00.000Z",
    );
    const data = embed.toJSON();
    expect(data.title).toBe("Room TBA E2E failed");
    expect(data.description).toContain("PR #447");
    expect(data.url).toBe("https://github.com/uplbtools/room-tba/actions/runs/1");
  });

  test("caps failed test list", () => {
    const embed = ciE2eEmbed(
      "ci.e2e.failed",
      {
        failedTests: Array.from({ length: 15 }, (_, i) => `spec-${i}`),
      },
      "2026-07-03T21:00:00.000Z",
    );
    const field = embed.toJSON().fields?.find((f) => f.name === "Failed tests");
    expect(field?.value).toContain("+5 more");
  });
});

describe("channelIdForCiEvent", () => {
  test("routes staging smoke to deploys", () => {
    expect(channelIdForCiEvent("ci.staging-smoke.failed")).toBe("deploys");
  });

  test("routes blocking e2e to development", () => {
    expect(channelIdForCiEvent("ci.e2e.failed")).toBe("development");
  });
});
