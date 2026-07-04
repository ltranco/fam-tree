export const SESSION_COOKIE = 'fam-tree-session';

/**
 * Web Crypto (not Node's `crypto` module) so this works identically in both
 * the Edge middleware and Node API routes without a separate implementation.
 */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The cookie never stores the password itself, only a hash derived from it. */
export async function expectedSessionValue(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  return password ? sha256Hex(password) : null;
}

export async function isCorrectPassword(candidate: string): Promise<boolean> {
  const expected = await expectedSessionValue();
  return expected !== null && (await sha256Hex(candidate)) === expected;
}
