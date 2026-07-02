import { describe, expect, test } from "bun:test";
import { verifySecret } from "./verify-secret.js";

describe("verifySecret", () => {
  test("passes when expected secret is unset", () => {
    expect(verifySecret(undefined, null)).toBe(true);
    expect(verifySecret("anything", null)).toBe(true);
  });

  test("requires exact match when secret configured", () => {
    expect(verifySecret("abc", "abc")).toBe(true);
    expect(verifySecret("wrong", "abc")).toBe(false);
    expect(verifySecret(undefined, "abc")).toBe(false);
  });
});
