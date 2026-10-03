// app/api/auth/apple/route.js — FINGERPRINT_ACCOUNTS
// GET  ?l=<loginId>  → send the player to Apple
// POST (form)        → Apple sends them back (response_mode=form_post): confirm with Apple, sign in, finish hand-off
// Needs (Apple Developer account): APPLE_CLIENT_ID (the Services ID), APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY (the .p8 key's text; line breaks may be written as \n). Return URL in Apple's console:
//   https://tunagolfpool.com/api/auth/apple
import { createPrivateKey, sign } from 'crypto';
import { redis, BASE_URL, finishOAuth, doneHtml } from '../lib';

export const dynamic = 'force-dynamic';
const REDIRECT = `${BASE_URL}/api/auth/apple`;
const env = () => ({ id: process.env.APPLE_CLIENT_ID, team: process.env.APPLE_TEAM_ID, kid: process.env.APPLE_KEY_ID,
  key: (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n') });
const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

// Apple's "client secret" is a short-lived JWT signed with your private key (ES256)
function clientSecret({ id, team, kid, key }) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u({ alg: 'ES256', kid }), body = b64u({ iss: team, iat: now, exp: now + 3600, aud: 'https://appleid.apple.com', sub: id });
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key: createPrivateKey(key), dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${sig.toString('base64url')}`;
}

export async function GET(request) {
  const e = env();
  if (!e.id || !e.team || !e.kid || !e.key) return doneHtml(false, 'Apple sign-in isn’t set up yet.');
  const l = new URL(request.url).searchParams.get('l');
  if (!l) return doneHtml(false, 'Please start Apple sign-in from the app.');
  const go = new URL('https://appleid.apple.com/auth/authorize');
  go.search = new URLSearchParams({ client_id: e.id, redirect_uri: REDIRECT, response_type: 'code',
    response_mode: 'form_post', scope: 'name email', state: l }).toString();
  return Response.redirect(go.toString(), 302);
}

export async function POST(request) {
  const e = env();
  if (!e.id || !e.key) return doneHtml(false, 'Apple sign-in isn’t set up yet.');
  let form;
  try { form = await request.formData(); } catch { return doneHtml(false, 'Something was missing — please try again from the app.'); }
  if (form.get('error')) return doneHtml(false, 'Apple sign-in was cancelled. You can close this tab.');
  const code = form.get('code'), state = form.get('state');
  if (!code || !state) return doneHtml(false, 'Something was missing — please try again from the app.');
  if (!(await redis('GET', `oauth:${state}`))) return doneHtml(false, 'This sign-in expired — please start again from the app.');
  try {
    const tok = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: e.id, client_secret: clientSecret(e), code, grant_type: 'authorization_code', redirect_uri: REDIRECT }),
    }).then(r => r.json());
    if (!tok.id_token) throw new Error(tok.error || 'no token');
    // The id_token came straight from Apple over HTTPS in exchange for our signed secret, so its claims are trusted.
    const claims = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url').toString());
    if (claims.aud !== e.id || claims.iss !== 'https://appleid.apple.com') throw new Error('token not for this app');
    // Apple sends the person's name only the FIRST time they sign in to this app
    let name = '';
    try { const u = JSON.parse(form.get('user') || '{}'); name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(' '); } catch {}
    const user = await finishOAuth({ provider: 'apple', sub: claims.sub, email: claims.email, name, loginId: state });
    return doneHtml(true, `Welcome, ${user.name}! Go back to Tuna Golf Pool — you’re signed in there now.`);
  } catch (err) {
    console.error('[auth/apple]', err.message);
    return doneHtml(false, `Apple sign-in failed (${err.message}). Please try again.`);
  }
}
