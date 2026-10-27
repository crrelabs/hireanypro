import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { notifyNewClaim, notifyVerifiedClaim } from '@/lib/notify';
import { sendClaimVerification, sendClaimConfirmed } from '@/lib/claim-email';
import crypto from 'crypto';
import { recordSmsOptIn } from '@/lib/sms-leads';
import { verifyClaimLink } from '@/lib/claim-link';
import { setSessionCookie } from '@/lib/session';
import { revalidateListing } from '@/lib/revalidate';

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
      .select('id, claimed, name, slug, email')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.claimed) {
      return NextResponse.json({ error: 'This listing has already been claimed. If this is your business, email iris@hireanypro.com and we will sort it out.', alreadyClaimed: true }, { status: 400 });
    }

    // One-click claim: the owner opened a signed link we emailed to the address on file for this listing,
    // which proves inbox control just like the verification email does. Skip the second email round-trip.
    const link = verifyClaimLink(body.claimToken);
    const onFile = (listing.email || '').trim().toLowerCase();
    if (link && link.listingId === listing.id && link.email === email && onFile && onFile === email) {
      const { data: owner } = await supabase.from('profiles').upsert({ email }, { onConflict: 'email' }).select('id').single();
      if (!owner) return NextResponse.json({ error: 'Internal error' }, { status: 500 });
      if (emailOptIn) await supabase.from('profiles').update({ email_opt_in: true, opted_in_at: new Date().toISOString() }).eq('id', owner.id);
      if (body.smsOptIn === true && typeof body.phone === 'string' && body.phone.trim()) {
        await recordSmsOptIn(supabase, { listingId, phone: body.phone, source: 'claim_form' }).catch(() => false);
      }
      // Claim only if still unclaimed (guards against a race with another claim).
      const { data: updated } = await supabase.from('listings')
        .update({ claimed: true, owner_id: owner.id }).eq('id', listing.id).eq('claimed', false).select('id');
      if (!updated || updated.length === 0) {
        return NextResponse.json({ error: 'This listing has already been claimed. If this is your business, email iris@hireanypro.com and we will sort it out.', alreadyClaimed: true }, { status: 400 });
      }
      await supabase.from('claims').insert({ listing_id: listing.id, email, verified: true, verification_token: crypto.randomUUID(), expires_at: new Date().toISOString() });
      await supabase.from('subscriptions').insert({ listing_id: listing.id, profile_id: owner.id, plan: 'free', status: 'active' });
      notifyVerifiedClaim(listing.name || 'Unknown Business', email, listing.slug || '').catch(() => {});
      await revalidateListing(supabase, listing.id);
      if (listing.slug) await sendClaimConfirmed(email, listing.name || 'your business', listing.slug).catch(() => false);
      const res = NextResponse.json({ success: true, verified: true, listingId: listing.id });
      setSessionCookie(res, email);
      return res;
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

    // Standalone, optional SMS consent: record it only when the box was ticked and a phone was given.
    if (body.smsOptIn === true && typeof body.phone === 'string' && body.phone.trim()) {
      await recordSmsOptIn(supabase, { listingId, phone: body.phone, source: 'claim_form' }).catch(() => false);
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
