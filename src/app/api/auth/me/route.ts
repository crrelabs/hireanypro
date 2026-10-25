import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sessionEmail, likeExact } from '@/lib/session';

export const dynamic = 'force-dynamic';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim());

/** Signed-in owner's email and listings (used by /pricing to skip retyping). Nothing without a valid session. */
export async function GET(req: NextRequest) {
  const email = sessionEmail(req);
  if (!email) return NextResponse.json({ signedIn: false }, { headers: { 'Cache-Control': 'no-store' } });
  const { data: profile } = await supabase.from('profiles').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
  let listings: { id: string; name: string; slug: string; tier: string | null }[] = [];
  if (profile) {
    const { data: subs } = await supabase.from('subscriptions').select('listing_id').eq('profile_id', profile.id).eq('status', 'active');
    const ids = (subs || []).map((s) => s.listing_id).filter(Boolean);
    if (ids.length) {
      const { data } = await supabase.from('listings').select('id, name, slug, tier').in('id', ids);
      listings = data || [];
    }
  }
  return NextResponse.json({ signedIn: true, email, listings }, { headers: { 'Cache-Control': 'no-store' } });
}
