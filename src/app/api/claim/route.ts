import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { notifyNewClaim } from '@/lib/notify';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 per minute
    const ip = getClientIp(req);
    if (isRateLimited(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { listingId, email, turnstileToken, website, emailOptIn } = await req.json();

    // Honeypot check
    if (isBot(website)) {
      // Silently "succeed" to not tip off bots
      return NextResponse.json({ success: true });
    }

    // Turnstile verification
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
    }

    if (!listingId || !email) {
      return NextResponse.json({ error: 'Listing ID and email required' }, { status: 400 });
    }

    // Check listing exists
    const { data: listing } = await supabase
      .from('listings')
      .select('id, claimed, name, slug')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.claimed) {
      return NextResponse.json({ error: 'This listing has already been claimed' }, { status: 400 });
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // Create/get profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ email }, { onConflict: 'email' })
      .select('id')
      .single();

    // Store email opt-in on profile
    if (emailOptIn && profile?.id) {
      await supabase.from('profiles').update({ email_opt_in: true, opted_in_at: new Date().toISOString() }).eq('id', profile.id).then(() => {});
    }

    // Create claim — NOT auto-verified; pending email verification
    const { error: claimError } = await supabase.from('claims').insert({
      listing_id: listingId,
      email,
      verified: false,
      verification_token: verificationToken,
      expires_at: expiresAt,
    });

    // If columns don't exist, fall back to simple insert
    if (claimError && claimError.message?.includes('column')) {
      console.warn('Verification columns missing, falling back to auto-verify:', claimError.message);
      await supabase.from('claims').insert({
        listing_id: listingId,
        email,
        verified: true,
      });

      // Auto-verify path: update listing immediately
      await supabase
        .from('listings')
        .update({ claimed: true, owner_id: profile?.id })
        .eq('id', listingId);

      if (profile) {
        await supabase.from('subscriptions').insert({
          listing_id: listingId,
          profile_id: profile.id,
          plan: 'free',
          status: 'active',
        });
      }

      // Notify Carlos
      notifyNewClaim(listing.name || 'Unknown Business', email, listing.slug || '').catch(() => {});
      return NextResponse.json({ success: true, profileId: profile?.id, autoVerified: true });
    }

    // Send verification email via Resend
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hireanypro.com'}/verify-claim?token=${verificationToken}&claim_id=${listingId}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'HireAnyPro <onboarding@resend.dev>',
          to: email,
          subject: `Verify your claim for ${listing.name} on HireAnyPro`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e40af;">Verify Your Business Claim</h2>
              <p>You requested to claim <strong>${listing.name}</strong> on HireAnyPro.</p>
              <p>Click the button below to verify your email and complete your claim:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="background: #1e40af; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                  Verify &amp; Claim Your Listing
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">HireAnyPro — Find Trusted Home Service Professionals</p>
            </div>
          `,
        });
      } catch (e) {
        console.error('Resend email failed:', e);
        console.log(`📧 CLAIM VERIFICATION URL (send to ${email}): ${verifyUrl}`);
      }
    } else {
      console.log(`📧 CLAIM VERIFICATION URL (no RESEND_API_KEY): ${verifyUrl}`);
    }

    // Notify about the claim
    notifyNewClaim(listing.name || 'Unknown Business', email, listing.slug || '').catch(() => {});

    return NextResponse.json({
      success: true,
      pendingVerification: true,
      message: `We've sent a verification email to ${email}. Click the link to complete your claim.`,
    });
  } catch (error: unknown) {
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
