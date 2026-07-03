import { describe, expect, test } from "bun:test";
import { testInventoryEmbed } from "./test-inventory.js";

describe("testInventoryEmbed", () => {
  test("includes tier counts and doc link", () => {
    const embed = testInventoryEmbed(
      {
        repo: "uplbtools/room-tba",
        branch: "staging",
        commitSha: "abc1234567890",
        commitUrl: "https://github.com/uplbtools/room-tba/commit/abc1234567890",
        docUrl: "https://github.com/uplbtools/room-tba/blob/staging/docs/test-inventory.md",
        generated: "2026-07-03",
        total: 104,
        unit: 42,
        vitest: 17,
        integration: 5,
        e2eBlocking: 26,
        e2eAdvisory: 11,
        e2eStaging: 3,
      },
      "2026-07-03T00:00:00.000Z",
    );

    expect(embed.data.title).toBe("Room TBA test inventory");
    const fields = embed.data.fields ?? [];
    expect(fields.find((f) => f.name === "Total spec files")?.value).toBe("104");
    expect(fields.find((f) => f.name === "Unit (Bun)")?.value).toBe("42");
    expect(embed.data.url).toBe(
      "https://github.com/uplbtools/room-tba/blob/staging/docs/test-inventory.md",
    );
  });
});
