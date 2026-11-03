/**
 * Serialize a JSON-LD object for a <script type="application/ld+json"> tag.
 * JSON.stringify does not escape "</script>", so owner-editable fields could break out
 * of the script tag (stored XSS). Escaping <, > and & as unicode keeps the JSON identical
 * for parsers while making it inert as HTML.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
