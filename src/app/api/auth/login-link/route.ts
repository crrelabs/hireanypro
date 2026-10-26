import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited, getClientIp } from '@/lib/rate-limit';
import { signToken, likeExact } from '@/lib/session';
import { sendMail } from '@/lib/mailer';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/** Email a one-click sign-in link to an owner. Always answers the same way so it can't be used to probe emails. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 });
  }
  let email = '';
  try {
    const body = await req.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch { /* ignore */ }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (isRateLimited(`login-email:${email}`, 3, 10 * 60_000)) {
    return NextResponse.json({ success: true });
  }

  const { data: profile } = await supabase.from('profiles').select('id').ilike('email', likeExact(email)).limit(1).maybeSingle();
  let hasListing = false;
  if (profile) {
    const { count } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id).eq('status', 'active');
    hasListing = (count || 0) > 0;
  }

  if (hasListing) {
    const url = `https://hireanypro.com/api/auth/callback?t=${encodeURIComponent(signToken(email, 'login'))}`;
    const ok = await sendMail({
      to: email,
      campaign: 'login_link', subject: 'Your HireAnyPro sign-in link',
      text: `Sign in to your HireAnyPro dashboard: ${url}\n\nThis link works for 24 hours. If you didn't ask for it, ignore this email.`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af;">Sign in to HireAnyPro</h2>
        <p>Click the button to open your business dashboard.</p>
        <div style="text-align: center; margin: 30px 0;"><a href="${url}" style="background: #1e40af; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Open My Dashboard</a></div>
        <p style="color: #666; font-size: 14px;">This link works for 24 hours. If you didn't ask for it, you can ignore this email.</p>
      </div>`,
    });
    if (!ok) console.error('Login link email failed');
  }
  return NextResponse.json({ success: true });
}
