/** "plumbing" -> "plumbing pros", but "moving companies" stays "moving companies" (no "moving companies pros"). Client-safe. */
export function prosLabel(lc: string): string {
  return /(companies|services)$/i.test(lc.trim()) ? lc : `${lc} pros`;
}
