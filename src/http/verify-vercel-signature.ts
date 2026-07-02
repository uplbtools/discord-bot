import { createHmac, timingSafeEqual } from "node:crypto";

/** Vercel signs webhooks with HMAC-SHA1 of the raw body. */
export function verifyVercelSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string | null,
): boolean {
  if (!secret) return true;
  if (!rawBody || !signatureHeader) return false;
  const expected = createHmac("sha1", secret).update(rawBody).digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
