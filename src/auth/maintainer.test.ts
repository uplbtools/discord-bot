import { describe, expect, test } from "bun:test";
import { memberRoleIds } from "./maintainer.js";

describe("memberRoleIds", () => {
  test("reads APIInteractionGuildMember roles array", () => {
    const interaction = {
      member: { roles: ["111", "222"] },
    } as Parameters<typeof memberRoleIds>[0];

    expect(memberRoleIds(interaction)).toEqual(["111", "222"]);
  });

  test("prefers GuildMember _roles when roles.cache is incomplete", () => {
    const interaction = {
      member: {
        _roles: ["maintainer-role-id", "@everyone"],
        roles: {
          cache: new Map([["guild-id", {}]]),
        },
      },
    } as Parameters<typeof memberRoleIds>[0];

    expect(memberRoleIds(interaction)).toEqual([
      "maintainer-role-id",
      "@everyone",
    ]);
  });
});
