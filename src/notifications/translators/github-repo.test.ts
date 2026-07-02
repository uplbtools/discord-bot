import { describe, expect, test } from "bun:test";
import { translateGitHubRepoWebhook } from "./github-repo.js";

describe("translateGitHubRepoWebhook", () => {
  test("maps issue opened", () => {
    const event = translateGitHubRepoWebhook(
      "issues",
      {
        action: "opened",
        repository: { full_name: "uplbtools/room-tba" },
        issue: {
          number: 42,
          title: "Fix map",
          html_url: "https://github.com/uplbtools/room-tba/issues/42",
          state: "open",
          user: { login: "dev" },
        },
      },
      "delivery-1",
    );
    expect(event?.type).toBe("github.issue");
    expect(event?.payload.number).toBe(42);
  });

  test("skips issue events for pull requests", () => {
    const event = translateGitHubRepoWebhook(
      "issues",
      {
        action: "opened",
        issue: { number: 1, pull_request: {} },
      },
      "delivery-2",
    );
    expect(event).toBeNull();
  });

  test("maps pull_request merged", () => {
    const event = translateGitHubRepoWebhook(
      "pull_request",
      {
        action: "closed",
        repository: { full_name: "uplbtools/room-tba" },
        pull_request: {
          number: 10,
          title: "Ship feature",
          html_url: "https://github.com/uplbtools/room-tba/pull/10",
          state: "closed",
          merged: true,
          user: { login: "dev" },
          base: { ref: "staging" },
          head: { ref: "feat/x" },
        },
      },
      "delivery-3",
    );
    expect(event?.type).toBe("github.pull_request");
    expect(event?.payload.merged).toBe(true);
  });

  test("maps push on staging only", () => {
    const event = translateGitHubRepoWebhook(
      "push",
      {
        ref: "refs/heads/staging",
        after: "abc1234567890",
        compare: "https://github.com/uplbtools/room-tba/compare/x",
        pusher: { name: "dev" },
        repository: { full_name: "uplbtools/room-tba" },
        commits: [{ message: "feat: thing" }],
      },
      "delivery-4",
    );
    expect(event?.type).toBe("github.push");
  });

  test("ignores push on feature branches", () => {
    const event = translateGitHubRepoWebhook(
      "push",
      {
        ref: "refs/heads/feat/noise",
        commits: [{ message: "wip" }],
      },
      "delivery-5",
    );
    expect(event).toBeNull();
  });
});
