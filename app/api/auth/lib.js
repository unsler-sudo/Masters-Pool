// app/api/auth/lib.js — FINGERPRINT_ACCOUNTS
// Shared account helpers: users, passwords, sign-in tokens, rate limits, email, and linking pool entries.
//
// Redis keys (all global, not per pool):
//   user:{uid}            → { uid, name, email, phone, pw, google, apple, tv, created }
//   user:email:{email}    → uid      user:google:{sub} → uid      user:apple:{sub} → uid
//   pwreset:{uid}         → { code, tries }   (15 min)
//   oauth:{loginId}       → { status:'pending'|'done', token? }   (10 min — Google/Apple hand-off)
//   rl:{what}:{who}       → counter for rate limits
//
// Sign-in tokens are signed, not stored: base64url({u:uid, v:tokenVersion, x:expiry}).HMAC. Bumping a user's
// tv (password change, "sign out everywhere") invalidates every older token. Valid 90 days.
import { createHmac, randomBytes, scryptSync, timingSafeEqual, randomInt } from 'crypto';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com';

export async function redis(cmd, ...args) {
  const r = await fetch(REDIS_URL, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([cmd, ...args]),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const SECRET = () => process.env.AUTH_SECRET || process.env.MAGIC_LINK_SECRET || process.env.TEAM_SYNC_SECRET || '';

// ── validation ─────────────────────────────────────────────────────────────
export const normEmail = (e) => String(e || '').trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// Cell numbers: 10-digit US numbers become +1XXXXXXXXXX; anything starting with + is kept as international.
export function normPhone(p) {
  const raw = String(p || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}
export const cleanName = (n) => String(n || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

// ── passwords (scrypt, salted) ─────────────────────────────────────────────
export function hashPassword(pw) {
  const salt = randomBytes(16);
  return `s1$${salt.toString('base64url')}$${scryptSync(String(pw), salt, 32).toString('base64url')}`;
}
export function checkPassword(pw, stored) {
  try {
    const [v, s, h] = String(stored || '').split('$');
    if (v !== 's1') return false;
    const got = scryptSync(String(pw), Buffer.from(s, 'base64url'), 32), want = Buffer.from(h, 'base64url');
    return got.length === want.length && timingSafeEqual(got, want);
  } catch { return false; }
}

// ── tokens ─────────────────────────────────────────────────────────────────
export function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ u: user.uid, v: user.tv || 0, x: Date.now() + 90 * 864e5 })).toString('base64url');
  return `${payload}.${createHmac('sha256', SECRET()).update(payload).digest('base64url')}`;
}
export async function verifyToken(tok) {
  if (!tok || !SECRET()) return null;
  const [payload, sig] = String(tok).split('.');
  if (!payload || !sig) return null;
  const want = createHmac('sha256', SECRET()).update(payload).digest('base64url');
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let p;
  try { p = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
  if (!p?.u || !(Date.now() < p.x)) return null;
  const user = await getUser(p.u);
  return user && (user.tv || 0) === p.v ? user : null;
}

// ── users ──────────────────────────────────────────────────────────────────
export async function getUser(uid) { const r = await redis('GET', `user:${uid}`); return r ? JSON.parse(r) : null; }
export async function saveUser(u) { await redis('SET', `user:${u.uid}`, JSON.stringify(u)); }
export async function findUid(kind, key) { return key ? await redis('GET', `user:${kind}:${key}`) : null; }
export async function newUser({ name, email, phone = '', pw = '', google = '', apple = '' }) {
  const uid = 'u' + randomBytes(9).toString('base64url');
  if (!(await redis('SET', `user:email:${email}`, uid, 'NX'))) return null;      // email already has an account
  const u = { uid, name: cleanName(name) || email.split('@')[0], email, phone, pw, google, apple, tv: 0, created: new Date().toISOString() };
  await saveUser(u);
  if (google) await redis('SET', `user:google:${google}`, uid);
  if (apple) await redis('SET', `user:apple:${apple}`, uid);
  return u;
}
export const publicUser = (u) => u && ({
  uid: u.uid, name: u.name, email: u.email, phone: u.phone || '',
  hasPassword: !!u.pw, google: !!u.google, apple: !!u.apple, needsPhone: !u.phone,
});

// ── rate limits ────────────────────────────────────────────────────────────
export async function tooMany(key, max, secs) {
  const n = await redis('INCR', `rl:${key}`);
  if (n === 1) await redis('EXPIRE', `rl:${key}`, secs);
  return n > max;
}
export const sixDigits = () => String(randomInt(0, 1e6)).padStart(6, '0');

// ── email (Resend) ─────────────────────────────────────────────────────────
export async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Tuna Golf Pool <noreply@tunagolfpool.com>', to, subject, html }),
  });
  return r.ok;
}

// ── Google / Apple: find or create the account, then hand the token to the waiting app ──
// The app starts sign-in with a loginId and polls for it; this marks it done. That hand-off is what makes
// Google/Apple work in the iPhone Home Screen app, whose storage is separate from Safari's.
export async function finishOAuth({ provider, sub, email, name, loginId }) {
  email = normEmail(email);
  let user = null;
  const byProvider = await findUid(provider, sub);
  if (byProvider) user = await getUser(byProvider);
  if (!user && email) {                       // same email as an existing account → attach this sign-in to it
    const byEmail = await findUid('email', email);
    if (byEmail) {
      user = await getUser(byEmail);
      if (user) { user[provider] = sub; await saveUser(user); await redis('SET', `user:${provider}:${sub}`, user.uid); }
    }
  }
  if (!user) {
    if (!email) throw new Error(`${provider} didn't share an email address`);
    user = await newUser({ name, email, [provider]: sub });
    if (!user) throw new Error('Please try again');
  }
  if (loginId) await redis('SETEX', `oauth:${loginId}`, 600, JSON.stringify({ status: 'done', token: makeToken(user) }));
  return user;
}
// A small page shown in the sign-in tab once Google/Apple finishes.
export function doneHtml(ok, message) {
  const safe = String(message).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tuna Golf Pool</title><style>body{font-family:-apple-system,system-ui,sans-serif;background:#f6f3ea;color:#1a4d2e;
display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:24px}
.c{background:#fff;border-radius:16px;padding:28px 22px;max-width:360px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{font-size:22px;margin:8px 0}p{color:#5a6b4e;font-size:15px;line-height:1.5}</style></head><body><div class="c">
<div style="font-size:44px">${ok ? '✅' : '⚠️'}</div><h1>${ok ? "You're signed in" : 'Sign-in didn\u2019t finish'}</h1>
<p>${safe}</p></div><script>setTimeout(function(){try{window.close()}catch(e){}},1500)</script></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ── link this user's entries in a pool (by account, or by the email they entered with) ──
// Returns the user's entries there with their codes, so the page can use the existing name+code features
// (chat, Cup picks, notifications, editing) without the player ever seeing a code.
export async function linkPoolEntries(poolId, user) {
  const key = `pool:${poolId}:entries`;
  const r = await redis('GET', key);
  const entries = r ? JSON.parse(r) : [];
  let changed = false;
  const mine = [];
  for (const e of entries) {
    const byEmail = !e.uid && normEmail(e.email) && normEmail(e.email) === user.email;
    if (e.uid === user.uid || byEmail) {
      if (e.uid !== user.uid) { e.uid = user.uid; changed = true; }
      mine.push({ name: e.name, code: e.editCode });
    }
  }
  if (changed) await redis('SET', key, JSON.stringify(entries));
  if (mine.length) await addUserPool(user.uid, poolId);
  return mine;
}

// FINGERPRINT_ACCOUNTS_OWNER — "My pools" index, and pool ownership.
// user:{uid}:pools is a set of poolIds the user runs or has entered. A pool's owner is meta.ownerUid; pools
// made before accounts are claimed automatically when the account's email matches the commissioner email.
export async function addUserPool(uid, poolId) { try { await redis('SADD', `user:${uid}:pools`, poolId); } catch {} }
export async function linkPoolOwner(poolId, user) {
  const raw = await redis('GET', `pool:${poolId}:meta`);
  if (!raw) return false;
  const meta = JSON.parse(raw);
  if (!meta.ownerUid && normEmail(meta.commissionerEmail) && normEmail(meta.commissionerEmail) === user.email) {
    meta.ownerUid = user.uid;
    await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
  }
  const owner = meta.ownerUid === user.uid;
  if (owner) await addUserPool(user.uid, poolId);
  return owner;
}
