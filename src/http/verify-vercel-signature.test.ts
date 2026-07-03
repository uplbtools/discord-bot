import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyVercelSignature } from "./verify-vercel-signature.js";

describe("verifyVercelSignature", () => {
  test("passes when secret is unset", () => {
    expect(verifyVercelSignature(Buffer.from("{}"), "anything", null)).toBe(true);
  });

  test("validates HMAC-SHA1 of raw body", () => {
    const secret = "test-secret";
    const body = Buffer.from('{"type":"deployment.succeeded"}');
    const sig = createHmac("sha1", secret).update(body).digest("hex");
    expect(verifyVercelSignature(body, sig, secret)).toBe(true);
    expect(verifyVercelSignature(body, "bad", secret)).toBe(false);
    expect(verifyVercelSignature(undefined, sig, secret)).toBe(false);
  });
});
