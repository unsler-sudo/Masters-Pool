// app/api/auth/google/route.js — FINGERPRINT_ACCOUNTS
// GET ?l=<loginId>         → send the player to Google
// GET ?code=…&state=<id>   → Google sends them back: confirm with Google, sign in, finish the hand-off
// Needs GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET. Authorised redirect URI in Google's console:
//   https://tunagolfpool.com/api/auth/google
import { redis, BASE_URL, finishOAuth, doneHtml } from '../lib';

export const dynamic = 'force-dynamic';
const REDIRECT = `${BASE_URL}/api/auth/google`;

export async function GET(request) {
  const url = new URL(request.url);
  const id = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return doneHtml(false, 'Google sign-in isn’t set up yet.');

  // 1) start: off to Google
  const l = url.searchParams.get('l');
  if (l) {
    const go = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    go.search = new URLSearchParams({ client_id: id, redirect_uri: REDIRECT, response_type: 'code',
      scope: 'openid email profile', state: l, prompt: 'select_account' }).toString();
    return Response.redirect(go.toString(), 302);
  }

  // 2) back from Google
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  if (url.searchParams.get('error')) return doneHtml(false, 'Google sign-in was cancelled. You can close this tab.');
  if (!code || !state) return doneHtml(false, 'Something was missing — please try again from the app.');
  const pending = await redis('GET', `oauth:${state}`);
  if (!pending) return doneHtml(false, 'This sign-in expired — please start again from the app.');
  try {
    const tok = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    }).then(r => r.json());
    if (!tok.access_token) throw new Error(tok.error_description || tok.error || 'no token');
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
    if (!info.sub) throw new Error('no account id');
    if (!info.email || info.email_verified === false) throw new Error('Your Google account’s email isn’t verified');
    const user = await finishOAuth({ provider: 'google', sub: info.sub, email: info.email, name: info.name, loginId: state, picture: info.picture });
    return doneHtml(true, `Welcome, ${user.name}! Go back to Tuna Golf Pool — you’re signed in there now.`);
  } catch (e) {
    console.error('[auth/google]', e.message);
    return doneHtml(false, `Google sign-in failed (${e.message}). Please try again.`);
  }
}
