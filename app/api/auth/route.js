// app/api/auth/route.js — FINGERPRINT_ACCOUNTS
// Account actions (POST { action, ... }). Sign-in tokens go in `auth`.
import { randomBytes } from 'crypto';
import {
  redis, BASE_URL, normEmail, validEmail, normPhone, cleanName, hashPassword, checkPassword,
  makeToken, verifyToken, getUser, saveUser, findUid, newUser, publicUser, tooMany, sixDigits,
  sendEmail, linkPoolEntries, linkPoolOwner,
} from './lib';

export const dynamic = 'force-dynamic';
const bad = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status });
const signedIn = (user) => Response.json({ ok: true, token: makeToken(user), user: publicUser(user) });

// Which buttons the page should show
export async function GET() {
  return Response.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY),
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad('Bad request'); }
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const a = body.action;

  try {
    // ── create an account ──
    if (a === 'signup') {
      const name = cleanName(body.name), email = normEmail(body.email), phone = normPhone(body.phone);
      const pw = String(body.password || '');
      if (name.length < 2) return bad('Enter your name');
      if (!validEmail(email)) return bad('Enter a valid email');
      if (!phone) return bad('Enter a valid cell number (10 digits, or +country code)');
      if (pw.length < 8) return bad('Password must be at least 8 characters');
      if (await tooMany(`signup:${ip}`, 10, 3600)) return bad('Too many sign-ups from here — try again later', 429);
      const user = await newUser({ name, email, phone, pw: hashPassword(pw) });
      if (!user) return bad('There’s already an account with that email — sign in instead', 409, { exists: true });
      return signedIn(user);
    }

    // ── sign in with email + password ──
    if (a === 'login') {
      const email = normEmail(body.email);
      if (await tooMany(`login:${email}`, 10, 900)) return bad('Too many attempts — wait 15 minutes, or reset your password', 429);
      const uid = await findUid('email', email);
      const user = uid ? await getUser(uid) : null;
      if (user && !user.pw) return bad(`This account signs in with ${user.google ? 'Google' : user.apple ? 'Apple' : 'a code'} — use that button, or “Forgot password” to set one`);
      if (!user || !checkPassword(body.password, user.pw)) return bad('Wrong email or password', 401);
      await redis('DEL', `rl:login:${email}`);
      return signedIn(user);
    }

    // ── forgot password: email a 6-digit code ──
    if (a === 'reset-request') {
      const email = normEmail(body.email);
      if (!validEmail(email)) return bad('Enter a valid email');
      if (await tooMany(`reset:${email}`, 5, 3600)) return bad('Too many requests — try again later', 429);
      const uid = await findUid('email', email);
      if (uid) {
        const code = sixDigits();
        await redis('SETEX', `pwreset:${uid}`, 900, JSON.stringify({ code, tries: 0 }));
        await sendEmail(email, `Your Tuna Golf Pool code: ${code}`,
          `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a4d2e">
            <h2 style="margin:0 0 8px">Reset your password</h2>
            <p style="color:#5a6b4e">Enter this code in the app. It works for 15 minutes.</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:6px;background:#f6f3ea;border-radius:12px;padding:14px;text-align:center">${code}</div>
            <p style="color:#8a9580;font-size:12px;margin-top:16px">Didn’t ask for this? You can ignore it — your password hasn’t changed.</p></div>`);
      }
      return Response.json({ ok: true });     // same reply either way, so nobody can test which emails have accounts
    }
    if (a === 'reset-confirm') {
      const email = normEmail(body.email), pw = String(body.password || '');
      if (pw.length < 8) return bad('Password must be at least 8 characters');
      const uid = await findUid('email', email);
      const raw = uid ? await redis('GET', `pwreset:${uid}`) : null;
      if (!raw) return bad('That code has expired — request a new one');
      const rec = JSON.parse(raw);
      if (rec.tries >= 5) { await redis('DEL', `pwreset:${uid}`); return bad('Too many wrong codes — request a new one', 429); }
      if (String(body.code || '').trim() !== rec.code) {
        rec.tries++; await redis('SETEX', `pwreset:${uid}`, 900, JSON.stringify(rec));
        return bad('Wrong code', 401);
      }
      await redis('DEL', `pwreset:${uid}`);
      const user = await getUser(uid);
      user.pw = hashPassword(pw); user.tv = (user.tv || 0) + 1;            // signs out every other device
      await saveUser(user);
      await redis('DEL', `rl:login:${email}`);
      return signedIn(user);
    }

    // ── Google / Apple hand-off ──
    if (a === 'oauth-start') {
      if (!['google', 'apple'].includes(body.provider)) return bad('Unknown provider');
      const loginId = randomBytes(18).toString('base64url');
      await redis('SETEX', `oauth:${loginId}`, 600, JSON.stringify({ status: 'pending' }));
      return Response.json({ ok: true, loginId, url: `${BASE_URL}/api/auth/${body.provider}?l=${loginId}` });
    }
    if (a === 'oauth-poll') {
      const raw = body.loginId ? await redis('GET', `oauth:${body.loginId}`) : null;
      if (!raw) return Response.json({ ok: false, expired: true });
      const rec = JSON.parse(raw);
      if (rec.status !== 'done') return Response.json({ ok: false, pending: true });
      await redis('DEL', `oauth:${body.loginId}`);
      const user = await verifyToken(rec.token);
      return user ? Response.json({ ok: true, token: rec.token, user: publicUser(user) }) : Response.json({ ok: false, expired: true });
    }

    // ── everything below needs a signed-in user ──
    const user = await verifyToken(body.auth);
    if (!user) return bad('Please sign in', 401, { signedOut: true });

    if (a === 'me') return Response.json({ ok: true, user: publicUser(user) });

    if (a === 'update-profile') {
      if (body.name !== undefined) { const n = cleanName(body.name); if (n.length < 2) return bad('Enter your name'); user.name = n; }
      if (body.phone !== undefined) { const p = normPhone(body.phone); if (!p) return bad('Enter a valid cell number (10 digits, or +country code)'); user.phone = p; }
      await saveUser(user);
      return Response.json({ ok: true, user: publicUser(user) });
    }

    if (a === 'change-password') {
      const pw = String(body.password || '');
      if (pw.length < 8) return bad('Password must be at least 8 characters');
      if (user.pw && !checkPassword(body.current, user.pw)) return bad('Your current password is wrong', 401);
      user.pw = hashPassword(pw); user.tv = (user.tv || 0) + 1;            // other devices are signed out
      await saveUser(user);
      return signedIn(user);
    }

    if (a === 'signout-all') {
      user.tv = (user.tv || 0) + 1; await saveUser(user);
      return Response.json({ ok: true });
    }

    // your entries in this pool (links any made with your email), with their codes for the page to use
    if (a === 'account-pool') {
      const poolId = String(body.poolId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!poolId) return bad('Missing pool');
      const [entries, owner] = await Promise.all([linkPoolEntries(poolId, user), linkPoolOwner(poolId, user)]);
      return Response.json({ ok: true, entries, owner });
    }

    // the pools you run or have entered, newest first
    if (a === 'my-pools') {
      const ids = (await redis('SMEMBERS', `user:${user.uid}:pools`)) || [];
      if (!ids.length) return Response.json({ ok: true, pools: [] });
      const metas = await redis('MGET', ...ids.map(id => `pool:${id}:meta`));
      const pools = ids.map((id, i) => { try { const m = JSON.parse(metas[i] || 'null'); return m && {
          poolId: id, name: m.poolName || 'Golf pool', owner: m.ownerUid === user.uid,
          event: m.currentPgatourEvent || '', mode: m.major || '', created: m.createdAt || '' }; } catch { return null; } })
        .filter(Boolean).sort((x, y) => (y.owner - x.owner) || String(y.created).localeCompare(String(x.created)));
      return Response.json({ ok: true, pools });
    }

    return bad('Unknown action');
  } catch (e) {
    console.error('[auth]', a, e.message);
    return bad('Something went wrong — please try again', 500);
  }
}
