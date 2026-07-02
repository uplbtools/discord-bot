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

  test("maps release published", () => {
    const event = translateGitHubRepoWebhook(
      "release",
      {
        action: "published",
        repository: { full_name: "uplbtools/room-tba" },
        release: {
          tag_name: "v1.0.0",
          name: "v1.0.0",
          html_url: "https://github.com/uplbtools/room-tba/releases/v1.0.0",
        },
      },
      "delivery-6",
    );
    expect(event?.type).toBe("release.published");
  });

  test("maps workflow_run failure and skips E2E", () => {
    const ci = translateGitHubRepoWebhook(
      "workflow_run",
      {
        action: "completed",
        repository: { full_name: "uplbtools/room-tba" },
        workflow_run: {
          name: "CI",
          conclusion: "failure",
          html_url: "https://github.com/x/actions/runs/1",
          head_branch: "staging",
        },
      },
      "delivery-7",
    );
    expect(ci?.type).toBe("github.workflow_run.failed");

    const e2e = translateGitHubRepoWebhook(
      "workflow_run",
      {
        action: "completed",
        workflow_run: { name: "E2E", conclusion: "failure" },
      },
      "delivery-8",
    );
    expect(e2e).toBeNull();
  });

  test("maps pull_request_review submitted", () => {
    const event = translateGitHubRepoWebhook(
      "pull_request_review",
      {
        action: "submitted",
        repository: { full_name: "uplbtools/room-tba" },
        pull_request: { number: 5, title: "Fix", html_url: "https://github.com/x/pull/5" },
        review: { state: "approved", user: { login: "dev" }, html_url: "https://github.com/x#review" },
      },
      "delivery-9",
    );
    expect(event?.type).toBe("github.pull_request_review");
  });

  test("maps dependabot_alert created", () => {
    const event = translateGitHubRepoWebhook(
      "dependabot_alert",
      {
        action: "created",
        repository: { full_name: "uplbtools/room-tba" },
        alert: {
          severity: "high",
          html_url: "https://github.com/x/security/dependabot/1",
          dependency: { package: { name: "lodash" } },
          security_advisory: { summary: "Prototype pollution", ghsa_id: "GHSA-xxxx" },
        },
      },
      "delivery-10",
    );
    expect(event?.type).toBe("github.dependabot_alert");
  });
});
