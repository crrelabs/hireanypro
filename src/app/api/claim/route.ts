import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { isBot } from '@/lib/honeypot';
import { notifyNewClaim } from '@/lib/notify';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTransporter() {
  const pass = process.env.HIREANYPRO_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: 'iris@hireanypro.com', pass },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 5)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { listingId, email, turnstileToken, website, emailOptIn } = await req.json();

    if (isBot(website)) {
      return NextResponse.json({ success: true });
    }

    if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
      return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
    }

    if (!listingId || !email) {
      return NextResponse.json({ error: 'Listing ID and email required' }, { status: 400 });
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
      return NextResponse.json({ error: 'This listing has already been claimed' }, { status: 400 });
    }

    // Check for existing pending claim
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('listing_id', listingId)
      .eq('email', email)
      .eq('verified', false)
      .single();

    if (existingClaim) {
      return NextResponse.json({ error: 'A verification email was already sent. Check your inbox (and spam folder).' }, { status: 400 });
    }

    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create/get profile
    const { data: profile } = await supabase
      .from('profiles')
      .upsert({ email }, { onConflict: 'email' })
      .select('id')
      .single();

    if (emailOptIn && profile?.id) {
      await supabase.from('profiles').update({ email_opt_in: true, opted_in_at: new Date().toISOString() }).eq('id', profile.id);
    }

    // Create unverified claim
    await supabase.from('claims').insert({
      listing_id: listingId,
      email,
      verified: false,
      verification_token: verificationToken,
      expires_at: expiresAt,
    });

    // Send verification email
    const verifyUrl = `https://hireanypro.com/verify-claim?token=${verificationToken}`;
    const transporter = getTransporter();

    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.RESEND_FROM_EMAIL || 'HireAnyPro <noreply@hireanypro.com>',
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
        console.error('Verification email failed:', e);
      }
    } else {
      console.log(`📧 VERIFY URL (no SMTP): ${verifyUrl}`);
    }

    // Notify Carlos about the claim attempt
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
