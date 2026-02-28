#!/bin/bash
set -e
source /root/.config/openclaw/supabase_hireanypro.env

# Use Supabase SQL endpoint
SQL='
-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  parent_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now()
);

-- Listings
CREATE TABLE IF NOT EXISTS listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id),
  address text,
  city text,
  state text DEFAULT '"'"'FL'"'"',
  zip text,
  lat numeric,
  lng numeric,
  phone text,
  email text,
  website text,
  hours jsonb,
  photos text[] DEFAULT '"'"'{}'"'"',
  rating numeric DEFAULT 0,
  review_count int DEFAULT 0,
  claimed boolean DEFAULT false,
  owner_id uuid,
  tier text DEFAULT '"'"'free'"'"',
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read categories" ON categories;
  CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Public read listings" ON listings;
  CREATE POLICY "Public read listings" ON listings FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Public read reviews" ON reviews;
  CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);
  DROP POLICY IF EXISTS "Public insert reviews" ON reviews;
  CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
END $$;
'

echo "Creating tables..."
curl -s -X POST "https://${SUPABASE_PROJECT_REF}.supabase.co/pg/query" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}" | head -200

echo ""
echo "Done!"
