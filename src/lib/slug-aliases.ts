import TRADE_ALIASES from '@/data/trade-aliases.json';

/**
 * URL recovery for guessed or alias URLs (AI answers, old links, people typing). Only used after the exact slug
 * missed, so it never changes a working URL. Callers 308 to the canonical page.
 */
export function tradeAlias(slug: string): string | null {
  const s = slug.toLowerCase();
  return (TRADE_ALIASES as Record<string, string>)[s] ?? null;
}

/** Candidate city slugs for a missed one, most likely first. */
export function cityAliasCandidates(slug: string): string[] {
  const s = slug.toLowerCase().replace(/-(fl|florida)$/, '');
  const out = new Set<string>();
  if (s !== slug) out.add(s);
  const swaps: [RegExp, string][] = [
    [/(^|-)saint-/, '$1st-'], [/(^|-)st-/, '$1saint-'], [/(^|-)ft-/, '$1fort-'], [/(^|-)fort-/, '$1ft-'],
    [/(^|-)mt-/, '$1mount-'], [/(^|-)n-/, '$1north-'], [/(^|-)s-/, '$1south-'], [/(^|-)w-/, '$1west-'],
  ];
  for (const [re, to] of swaps) if (re.test(s)) out.add(s.replace(re, to));
  out.add(`${s}-beach`); // Lake Worth became Lake Worth Beach (2019)
  out.delete(slug);
  return [...out];
}

/** Candidate county slugs ("st-johns-county" -> "st.-johns"), most likely first. */
export function countyAliasCandidates(slug: string): string[] {
  const s = slug.toLowerCase().replace(/-county(-fl|-florida)?$/, '').replace(/-(fl|florida)$/, '');
  const out = new Set<string>([s, s.replace(/^(st|saint)-/, 'st.-')]);
  out.delete(slug);
  return [...out];
}
