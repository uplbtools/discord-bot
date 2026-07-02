export function verifySecret(
  provided: string | undefined,
  expected: string | null,
): boolean {
  if (!expected) return true;
  return provided === expected;
}
