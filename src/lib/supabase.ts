import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
