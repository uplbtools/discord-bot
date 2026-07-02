import { describe, expect, test } from "bun:test";
import { createUplbToolsRuntime } from "./runtime.js";

describe("createUplbToolsRuntime", () => {
  test("returns client, app, and lifecycle methods without starting", () => {
    const runtime = createUplbToolsRuntime({
      listen: false,
      config: {
        token: "test-token",
        clientId: "test-client",
        guildId: null,
        port: 3999,
        logLevel: "error",
        githubToken: null,
        maintainerRoleId: null,
        maintainerUserIds: [],
        channelDevelopmentId: null,
        channelDeploysId: null,
        channelAnnouncementsId: null,
        channelContributorsId: null,
        forumRoomTbaHelpId: null,
        forumGradesimHelpId: null,
        channelGithubId: null,
        notificationIngressSecret: null,
        vercelWebhookSecret: null,
        githubReleaseSecret: null,
        githubRepoWebhookSecret: null,
        roomTbaBaseUrl: "https://room-tba.uplbtools.me",
        roomTbaLeaderboardApiUrl: null,
        roomTbaBotApiKey: null,
        uplbToolsBaseUrl: "https://uplbtools.me",
        leaderboardDigestCron: "0 9 * * 1",
        triageCron: "0 9 * * 1",
      },
    });

    expect(runtime.client).toBeDefined();
    expect(runtime.app).toBeDefined();
    expect(typeof runtime.start).toBe("function");
    expect(typeof runtime.stop).toBe("function");
  });
});
