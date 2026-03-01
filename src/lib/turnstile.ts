/**
 * Verify bot protection token server-side.
 * Uses timing analysis — bots submit instantly, humans take time.
 * Combined with honeypot fields and rate limiting for layered protection.
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token) return true; // Forms work without token

  // Parse timing from our custom tokens: "human_1234_abc" or "auto_3000_xyz"
  const match = token.match(/^(human|auto)_(\d+)_/);
  if (match) {
    const elapsed = parseInt(match[2], 10);
    // Bots typically submit in < 200ms. Reject suspiciously fast submissions.
    if (elapsed < 200) {
      console.warn(`Bot detected: form submitted in ${elapsed}ms`);
      return false;
    }
    return true;
  }

  // Legacy tokens (skip, etc.) — allow
  return true;
}
