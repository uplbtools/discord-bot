import { describe, expect, test } from "bun:test";
import { channelIdForGithubRoute, githubDiscordRoute } from "./github-routing.js";
import type { BotConfig } from "../config.js";

const cfg = {
  channelGithubId: "github-ch",
  channelPrsReviewsId: "prs-ch",
  channelDevelopmentId: "dev-ch",
  channelAnnouncementsId: "ann-ch",
  channelDeploysId: "deploy-ch",
  channelSecurityId: "sec-ch",
} as BotConfig;

describe("githubDiscordRoute", () => {
  test("routes tier 1 and 2 events", () => {
    expect(githubDiscordRoute("github.pull_request_review")).toBe("prs");
    expect(githubDiscordRoute("github.workflow_run.failed")).toBe("development");
    expect(githubDiscordRoute("release.published")).toBe("announcements");
    expect(githubDiscordRoute("github.dependabot_alert")).toBe("security");
    expect(githubDiscordRoute("github.deployment_status")).toBe("deploys");
  });
});

describe("channelIdForGithubRoute", () => {
  test("resolves channel ids", () => {
    expect(channelIdForGithubRoute(cfg, "prs")).toBe("prs-ch");
    expect(channelIdForGithubRoute(cfg, "security")).toBe("sec-ch");
  });
});
