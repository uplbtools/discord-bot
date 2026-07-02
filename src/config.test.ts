import { describe, expect, test } from "bun:test";
import { loadBotConfigFromEnv } from "./config.js";

describe("loadBotConfigFromEnv", () => {
  test("reads unprefixed vars for solo deploy", () => {
    const cfg = loadBotConfigFromEnv({
      overrides: {
        token: "solo-token",
        clientId: "solo-client",
      },
    });
    expect(cfg.token).toBe("solo-token");
    expect(cfg.clientId).toBe("solo-client");
  });

  test("prefixed vars override unprefixed when envPrefix set", () => {
    process.env.UPLB_DISCORD_TOKEN = "prefixed-token";
    process.env.UPLB_DISCORD_CLIENT_ID = "prefixed-client";
    try {
      const cfg = loadBotConfigFromEnv({ envPrefix: "UPLB_" });
      expect(cfg.token).toBe("prefixed-token");
      expect(cfg.clientId).toBe("prefixed-client");
    } finally {
      delete process.env.UPLB_DISCORD_TOKEN;
      delete process.env.UPLB_DISCORD_CLIENT_ID;
    }
  });
});
