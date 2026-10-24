import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { notifyNewClaim } from '@/lib/notify';
import { sendClaimVerification } from '@/lib/claim-email';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { listingId, turnstileToken, website, emailOptIn } = body;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (isBot(website)) {
      return NextResponse.json({ success: true });
    }

    // verifyTurnstile() accepts an empty token (the invisible check fires on first interaction or after 3s);
    // rejecting empty tokens here used to bounce owners who clicked "Claim" quickly.
    if (!(await verifyTurnstile(turnstileToken || ''))) {
      return NextResponse.json({ error: 'That was a little fast. Please wait a second and try again.' }, { status: 400 });
    }

    if (!listingId || !email) {
      return NextResponse.json({ error: 'Please enter your email address.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('id, claimed, name, slug')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.claimed) {
      return NextResponse.json({ error: 'This listing has already been claimed. If this is your business, email iris@hireanypro.com and we will sort it out.', alreadyClaimed: true }, { status: 400 });
    }

    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Existing pending claim for this listing+email: re-issue a fresh link instead of dead-ending the owner.
    // (Previously this returned "already sent" forever, even after the 24h link expired.)
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('listing_id', listingId)
      .ilike('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Create/get profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ email }, { onConflict: 'email' })
      .select('id')
      .single();

    if (emailOptIn && profile?.id) {
      await supabase.from('profiles').update({ email_opt_in: true, opted_in_at: new Date().toISOString() }).eq('id', profile.id);
    }

    if (existingClaim) {
      await supabase.from('claims')
        .update({ verification_token: verificationToken, expires_at: expiresAt })
        .eq('id', existingClaim.id);
    } else {
      await supabase.from('claims').insert({
        listing_id: listingId,
        email,
        verified: false,
        verification_token: verificationToken,
        expires_at: expiresAt,
      });
    }

    // Send verification email
    const ok = await sendClaimVerification(email, listing.name || 'your business', verificationToken);
    if (!ok) console.error('Verification email failed for claim', verificationToken.slice(0, 8));

    // Notify Carlos about the claim attempt (first attempt only; resends don't re-notify)
    if (!existingClaim) notifyNewClaim(listing.name || 'Unknown Business', email, listing.slug || '').catch(() => {});

    return NextResponse.json({
      success: true,
      pendingVerification: true,
      resent: !!existingClaim,
      message: `We've sent a verification email to ${email}. Click the link to complete your claim.`,
    });
  } catch (error: unknown) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
