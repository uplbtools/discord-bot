import { describe, expect, test } from "bun:test";
import {
  buildTestInventoryEmbeds,
  testInventorySummaryEmbed,
  tierFileEmbeds,
} from "./test-inventory.js";

const samplePayload = {
  repo: "uplbtools/room-tba",
  branch: "staging",
  commitSha: "abc1234567890",
  commitUrl: "https://github.com/uplbtools/room-tba/commit/abc1234567890",
  docUrl: "https://github.com/uplbtools/room-tba/blob/staging/docs/test-inventory.md",
  generated: "2026-07-03",
  total: 4,
  unit: 2,
  vitest: 1,
  integration: 0,
  e2eBlocking: 1,
  e2eAdvisory: 0,
  e2eStaging: 0,
  tiers: {
    unit: ["src/lib/foo.test.ts", "src/lib/bar.test.ts"],
    store: ["src/lib/baz.store.test.ts"],
    component: [],
    integration: [],
    e2eBlockingSmoke: ["e2e/smoke/boot.spec.ts"],
    e2eBlockingBrowse: [],
    e2eBlockingAdmin: [],
    e2eAdvisory: [],
    e2eStaging: [],
  },
};

describe("testInventorySummaryEmbed", () => {
  test("includes tier counts and doc link", () => {
    const embed = testInventorySummaryEmbed(
      samplePayload,
      "2026-07-03T00:00:00.000Z",
    );

    expect(embed.data.title).toBe("Room TBA test inventory");
    const fields = embed.data.fields ?? [];
    expect(fields.find((f) => f.name === "Total spec files")?.value).toBe("4");
    expect(fields.find((f) => f.name === "Unit (Bun)")?.value).toBe("2");
    expect(embed.data.url).toBe(
      "https://github.com/uplbtools/room-tba/blob/staging/docs/test-inventory.md",
    );
  });
});

describe("buildTestInventoryEmbeds", () => {
  test("builds summary plus tier embeds without attachment", () => {
    const embeds = buildTestInventoryEmbeds(
      samplePayload,
      "2026-07-03T00:00:00.000Z",
    );

    expect(embeds.length).toBeGreaterThan(1);
    expect(embeds[0]?.data.title).toBe("Room TBA test inventory");
    expect(
      embeds.some((e) => e.data.title?.startsWith("Unit tests (Bun)")),
    ).toBe(true);
    expect(
      embeds.some((e) => e.data.description?.includes("src/lib/foo.test.ts")),
    ).toBe(true);
    expect(
      embeds.some((e) => e.data.title?.startsWith("E2E blocking — smoke")),
    ).toBe(true);
  });
});

describe("tierFileEmbeds", () => {
  test("chunks long file lists", () => {
    const files = Array.from({ length: 200 }, (_, i) => `src/lib/test-${i}.test.ts`);
    const embeds = tierFileEmbeds("Unit tests", files, 0x16a34a);
    expect(embeds.length).toBeGreaterThan(1);
    expect(embeds[0]?.data.title).toBe("Unit tests (1/2)");
  });
});
