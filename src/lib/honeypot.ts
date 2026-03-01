/**
 * Check if the honeypot field was filled (indicates bot submission).
 * Returns true if it's a bot (should reject silently).
 */
export function isBot(honeypotValue: string | undefined | null): boolean {
  return !!honeypotValue;
}
