import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 10)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { listingId, authorName, rating, comment, turnstileToken, website } = await req.json();

    if (isBot(website)) {
      return NextResponse.json({ success: true });
    }

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return NextResponse.json({ error: 'CAPTCHA verification failed.' }, { status: 400 });
    }

    if (!listingId || !authorName || !rating || !comment) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const { error } = await supabase.from('reviews').insert({
      listing_id: listingId,
      author_name: authorName.trim(),
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Review insert error:', error);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
