import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setup() {
  // Create tables via SQL
  const { error: schemaError } = await supabase.rpc('exec_sql', { sql: '' }).maybeSingle();
  
  // Use raw SQL via the REST API
  const sql = `
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
      state text DEFAULT 'FL',
      zip text,
      lat numeric,
      lng numeric,
      phone text,
      email text,
      website text,
      hours jsonb,
      photos text[] DEFAULT '{}',
      rating numeric DEFAULT 0,
      review_count int DEFAULT 0,
      claimed boolean DEFAULT false,
      owner_id uuid,
      tier text DEFAULT 'free',
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

    DROP POLICY IF EXISTS "Public read categories" ON categories;
    CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read listings" ON listings;
    CREATE POLICY "Public read listings" ON listings FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read reviews" ON reviews;
    CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public insert reviews" ON reviews;
    CREATE POLICY "Public insert reviews" ON reviews FOR INSERT WITH CHECK (true);
  `;

  // Execute via postgres function or direct
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
    }
  });

  console.log('Using SQL endpoint...');
  
  // Split and execute via pg_net or use the SQL editor endpoint
  const sqlRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
    },
    body: JSON.stringify({ query: sql })
  });
  
  console.log('SQL response:', sqlRes.status);
}

setup().catch(console.error);
