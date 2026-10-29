/** PostgREST returns at most 1,000 rows. Fetch a count, then those pages in parallel. */

const PAGE_SIZE = 1000;
const PAGE_CONCURRENCY = 5;

type PageError = { message: string } | null;

/**
 * One in-flight promise per key so concurrent callers in the same instance share a single read.
 * A failure clears the slot so the next caller retries instead of reusing a rejected scan.
 */
export function shareInflight<T>(inflight: Map<string, Promise<T>>, key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = run().finally(() => {
    if (inflight.get(key) === pending) inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

/**
 * Count matching rows, then read each 1,000-row page with bounded concurrency.
 * Callers must use the same filters on both queries and `.order('id')` on each page
 * so parallel ranges do not skip or repeat rows. Throws if the count or any page fails,
 * or if a non-final page is short, so a partial result is never cached.
 */
export async function fetchOrderedPages<T>(opts: {
  label: string;
  count: () => PromiseLike<{ count: number | null; error: PageError }>;
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PageError }>;
  concurrency?: number;
}): Promise<T[]> {
  const { count, error } = await opts.count();
  if (error) throw new Error(`${opts.label}: ${error.message}`);
  if (count == null) throw new Error(`${opts.label}: missing count`);
  if (count === 0) return [];

  const concurrency = opts.concurrency ?? PAGE_CONCURRENCY;
  const offsets: number[] = [];
  for (let from = 0; from < count; from += PAGE_SIZE) offsets.push(from);

  const pages: T[][] = new Array(offsets.length);
  for (let i = 0; i < offsets.length; i += concurrency) {
    const batch = offsets.slice(i, i + concurrency);
    const got = await Promise.all(batch.map(async (from, batchIndex) => {
      const to = from + PAGE_SIZE - 1;
      const { data, error: pageError } = await opts.page(from, to);
      if (pageError) throw new Error(`${opts.label}: ${pageError.message}`);
      if (!data) throw new Error(`${opts.label}: empty response at offset ${from}`);
      const isLast = from + PAGE_SIZE >= count;
      if (!isLast && data.length !== PAGE_SIZE) {
        throw new Error(`${opts.label}: short page at offset ${from} (${data.length} rows)`);
      }
      if (isLast && data.length === 0) {
        throw new Error(`${opts.label}: missing last page at offset ${from}`);
      }
      return { index: i + batchIndex, data };
    }));
    for (const part of got) pages[part.index] = part.data;
  }

  if (pages.some((page) => !page)) throw new Error(`${opts.label}: missing page`);
  return pages.flat();
}
