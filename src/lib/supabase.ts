import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Reads (GET/HEAD) retry twice on a network error or a 5xx/522 from Supabase. Public pages are ISR-cached, so one
 * failed read used to become a cached 404 or a short list for an hour (page numbers check saw 10-40 s and a 522 on Oct 28).
 * Writes are never retried.
 */
const retryingFetch: typeof fetch = async (input, init) => {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status < 500 || attempt >= 2) return res;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1) ** 2));
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: retryingFetch } });

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
};

export type Listing = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  hours: Record<string, string>;
  photos: string[];
  rating: number;
  review_count: number;
  claimed: boolean;
  owner_id: string | null;
  tier: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  categories?: Category;
};

export type Review = {
  id: string;
  listing_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};
