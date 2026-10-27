// "Find us on HireAnyPro" badge: owners paste this snippet on their own website.
// The <a> is a plain (do-follow) link to the owner's listing; the image comes from /api/badge/<slug>,
// which logs the referring site so we can see where badges are live.

const SITE = 'https://hireanypro.com';

export const BADGE_W = 200;
export const BADGE_H = 56;

const escAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function badgeListingUrl(slug: string): string {
  return `${SITE}/listing/${encodeURIComponent(slug)}`;
}

/** Copy-paste HTML for the owner's website. */
export function badgeSnippet(slug: string, name: string): string {
  const alt = escAttr(`${name} on HireAnyPro`);
  return `<a href="${badgeListingUrl(slug)}" title="${alt}" target="_blank"><img src="${SITE}/api/badge/${encodeURIComponent(slug)}" alt="Find us on HireAnyPro" width="${BADGE_W}" height="${BADGE_H}" style="border:0"></a>`;
}

export function badgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_W}" height="${BADGE_H}" viewBox="0 0 ${BADGE_W} ${BADGE_H}" role="img" aria-label="Find us on HireAnyPro">
<title>Find us on HireAnyPro</title>
<rect x="1" y="1" width="${BADGE_W - 2}" height="${BADGE_H - 2}" rx="10" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
<circle cx="29" cy="28" r="16" fill="#1e40af"/>
<path d="M21.5 28.5l5 5 10-11" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="54" y="23" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#4b5563">Find us on</text>
<text x="54" y="42" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="#1e40af">HireAny<tspan fill="#f97316">Pro</tspan></text>
</svg>`;
}
