/**
 * Pull a FAQ out of a blog post's markdown so the page can emit FAQPage JSON-LD.
 * Convention: a "## Frequently asked questions" (or "## FAQ...") section where each
 * question is a "### Question?" heading followed by its answer paragraph(s).
 * Returns [] when the post has no such section (no FAQ schema is emitted).
 */
export type FaqItem = { question: string; answer: string };

function plain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFaq(content: string): FaqItem[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^##\s+(frequently asked questions|faqs?)\b/i.test(l.trim()));
  if (start === -1) return [];
  const items: FaqItem[] = [];
  let q: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (q) {
      const answer = plain(buf.join(' '));
      if (answer) items.push({ question: plain(q), answer });
    }
    buf = [];
  };
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (/^##\s/.test(line)) break; // next H2 ends the FAQ section
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) { flush(); q = h3[1]; continue; }
    if (q && line) buf.push(line);
  }
  flush();
  return items;
}
