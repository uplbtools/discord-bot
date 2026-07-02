import { describe, expect, test } from "bun:test";
import { fetchLeaderboardWithOptions } from "./fetch-leaderboard.js";
import { LeaderboardNotReadyError } from "./types.js";

describe("fetchLeaderboardWithOptions", () => {
  test("throws when API URL unset", async () => {
    await expect(fetchLeaderboardWithOptions({ apiUrl: null })).rejects.toBeInstanceOf(
      LeaderboardNotReadyError,
    );
  });

  test("throws LeaderboardNotReadyError on 404", async () => {
    await expect(
      fetchLeaderboardWithOptions({
        apiUrl: "https://example.test/api/leaderboard",
        fetchImpl: async () => new Response("", { status: 404 }),
      }),
    ).rejects.toBeInstanceOf(LeaderboardNotReadyError);
  });

  test("returns parsed JSON on success", async () => {
    const body = {
      window: "month",
      entries: [{ rank: 1, displayName: "Ada", contributionCount: 5 }],
    };
    const result = await fetchLeaderboardWithOptions({
      apiUrl: "https://example.test/api/leaderboard",
      apiKey: "test-key",
      window: "month",
      fetchImpl: async (url, init) => {
        expect(String(url)).toContain("window=month");
        expect(init?.headers).toMatchObject({
          Authorization: "Bearer test-key",
        });
        return Response.json(body);
      },
    });
    expect(result.entries[0]?.displayName).toBe("Ada");
  });
});
