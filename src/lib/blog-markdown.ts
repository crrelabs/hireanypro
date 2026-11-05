export type BlogTocItem = { id: string; text: string; level: number };

/** Same id the markdown headings and the table of contents share. */
export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Drop a leading markdown heading that repeats the page `<h1>` (the template already renders post.title).
 * Also drops one blank line that followed it so the article doesn't open with an empty paragraph.
 */
export function stripDuplicateTitle(content: string, title: string): string {
  const target = normalizeHeading(title);
  if (!target) return content;
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  const heading = lines[i]?.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
  if (!heading || normalizeHeading(heading[1]) !== target) return content;
  const next = lines.slice(0, i).concat(lines.slice(i + 1));
  if (next[i] !== undefined && next[i].trim() === '') next.splice(i, 1);
  return next.join('\n');
}

/** TOC from raw markdown. Level-1 headings are treated as level-2 (they render as h2). A heading that repeats the page title is omitted. */
export function blogToc(content: string, pageTitle = ''): BlogTocItem[] {
  const body = stripDuplicateTitle(content, pageTitle);
  const titleKey = normalizeHeading(pageTitle);
  const headings = body.match(/^#{1,3}\s+.+$/gm) || [];
  const items: BlogTocItem[] = [];
  for (const h of headings) {
    const level = (h.match(/^#+/) || [''])[0].length;
    const text = h.replace(/^#+\s+/, '');
    if (titleKey && normalizeHeading(text) === titleKey) continue;
    items.push({ id: headingId(text), text, level: level === 1 ? 2 : level });
  }
  return items;
}
