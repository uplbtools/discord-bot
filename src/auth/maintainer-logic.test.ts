import { describe, expect, test } from "bun:test";
import { isMaintainerUser } from "./maintainer-logic.js";

describe("isMaintainerUser", () => {
  test("allows listed user IDs", () => {
    expect(
      isMaintainerUser({
        userId: "111",
        maintainerUserIds: ["111", "222"],
        maintainerRoleId: null,
        memberRoleIds: null,
      }),
    ).toBe(true);
  });

  test("allows maintainer role", () => {
    expect(
      isMaintainerUser({
        userId: "999",
        maintainerUserIds: [],
        maintainerRoleId: "role-maintainer",
        memberRoleIds: ["role-user", "role-maintainer"],
      }),
    ).toBe(true);
  });

  test("denies without role or allowlist", () => {
    expect(
      isMaintainerUser({
        userId: "999",
        maintainerUserIds: [],
        maintainerRoleId: "role-maintainer",
        memberRoleIds: ["role-user"],
      }),
    ).toBe(false);
  });
});
