import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsub, suppress } from '@/lib/suppression';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const page = (body: string, status = 200) =>
  new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe | HireAnyPro</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#111">${body}<p style="color:#888;font-size:12px;margin-top:40px">HireAnyPro · CRRE Labs LLC · 12394 SW 82 Ave, Pinecrest FL 33156</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );

// GET: confirmation page (link scanners must not unsubscribe people by prefetching).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const email = verifyUnsub(token);
  if (!email) return page('<h2>Invalid unsubscribe link</h2><p>Reply to any of our emails with "unsubscribe" and we will remove you.</p>', 400);
  return page(`<h2>Unsubscribe from HireAnyPro emails</h2><p>Stop all marketing emails to <strong>${esc(email)}</strong>?</p>
<form method="POST" action="/api/unsubscribe?t=${encodeURIComponent(token!)}"><button type="submit" style="background:#1e40af;color:#fff;border:0;padding:12px 24px;border-radius:6px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`);
}

// POST: RFC 8058 one-click (body "List-Unsubscribe=One-Click") or the form above.
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const email = verifyUnsub(token);
  if (!email) return page('<h2>Invalid unsubscribe link</h2>', 400);
  const r = await suppress(email, 'unsubscribe');
  if (!r.supabase && !r.resend) return page('<h2>Something went wrong</h2><p>Please reply "unsubscribe" to our email and we will remove you.</p>', 500);
  return page(`<h2>You're unsubscribed</h2><p>${esc(email)} will not receive further marketing emails from HireAnyPro.</p>`);
}
