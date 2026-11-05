/** Trim a meta description to Google's ~160-character snippet at a word boundary (adds "…" only when cut). */
export function clampDescription(s: string, max = 160): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\-–—]+$/, '') + '…';
}

/** Trim a document title to ~65 characters at a word boundary (adds "…" only when cut). */
export function clampTitle(s: string, max = 65): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  const base = (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[,;:\-–—|]+$/, '').trim();
  return `${base}…`;
}

/** Append a brand suffix only when the full title still fits in `max` characters. */
export function withBrandSuffix(base: string, suffix: string, max = 65): string {
  return base.length + suffix.length <= max ? `${base}${suffix}` : base;
}

/** Category index `<title>`. Drops `| HireAnyPro` when the count makes the branded form too long. */
export function categoryDocumentTitle(name: string, totalLabel: string): string {
  const head = `${/(companies|services)$/i.test(name) ? name : `${name} Pros`} in Florida: ${totalLabel} Listings by City`;
  return withBrandSuffix(head, ' | HireAnyPro');
}

/** /data trade page `<title>`. Drops "and Reviews" or "Data" so long trade names stay within ~65. */
export function dataCategoryTitle(name: string, max = 65): string {
  const options = [
    `Florida ${name} Ratings and Reviews by City (2026 Data)`,
    `Florida ${name} Ratings by City (2026 Data)`,
    `Florida ${name} Ratings by City (2026)`,
  ];
  return options.find((t) => t.length <= max) ?? options[options.length - 1];
}
