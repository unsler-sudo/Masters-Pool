import { createHmac, timingSafeEqual } from 'crypto';   // FINGERPRINT_V191_MAGIC_LINKS
import webpush from 'web-push';                            // FINGERPRINT_V193_PUSH
import tzlookup from 'tz-lookup';                          // FINGERPRINT_V201_TZ
import { verifyToken, addUserPool } from '../auth/lib';    // FINGERPRINT_V202_ACCOUNTS
export const dynamic = 'force-dynamic';
// build: recap-v213-20261004-1500

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const VALID_MAJORS = ['players','masters','pga','usopen','open','pgatour','dpworld'];
// FINGERPRINT_V165_DPWORLD — tour modes share one code path; only the DataGolf tour differs.
const SRV_TOUR_OF = { pgatour:'pga', dpworld:'euro' };
const srvIsTourMode = (m) => m === 'pgatour' || m === 'dpworld';
const srvTour = (m) => SRV_TOUR_OF[m] || 'pga';

// ─── SERVER-SIDE EARNINGS ENGINE (v34) ───────────────────────────────────────
// FINGERPRINT_V34_SERVER_EARNINGS
// Mirrors the frontend's calcEarnings so the rotation can compute final earnings itself
// from DataGolf's in-play feed, instead of depending on someone having the pool open when
// the tournament finished. Makes the archive save correct even unattended.
const SRV_PAYOUT_PGATOUR = {
  1:0.18,2:0.109,3:0.069,4:0.049,5:0.041,6:0.03625,7:0.03375,8:0.03125,9:0.02925,10:0.02725,
  11:0.02525,12:0.02325,13:0.02125,14:0.01925,15:0.0183,16:0.01735,17:0.0164,18:0.01545,19:0.0145,20:0.01355,
  21:0.0126,22:0.01165,23:0.0108,24:0.00995,25:0.00915,26:0.00835,27:0.00805,28:0.00775,29:0.00745,30:0.00715,
  31:0.00685,32:0.00655,33:0.00625,34:0.006,35:0.00575,36:0.0055,37:0.00525,38:0.00505,39:0.00485,40:0.00465,
  41:0.00445,42:0.00425,43:0.00405,44:0.00385,45:0.00365,46:0.00345,47:0.00325,48:0.00305,49:0.00292,50:0.0028,
  51:0.0027,52:0.00262,53:0.00256,54:0.0025,55:0.00245,56:0.0024,57:0.00236,58:0.00232,59:0.00228,60:0.00225,
  61:0.00222,62:0.00219,63:0.00216,64:0.00213,65:0.00211
};
const SRV_PAYOUT_SIGNATURE = {
  1:0.20,2:0.11,3:0.07,4:0.05,5:0.042,6:0.038,7:0.035,8:0.0323,9:0.03,10:0.0278,
  11:0.0257,12:0.0236,13:0.0215,14:0.01945,15:0.01845,16:0.01745,17:0.01645,18:0.01545,19:0.01445,20:0.01345,
  21:0.0125,22:0.01165,23:0.0108,24:0.01,25:0.0092,26:0.0084,27:0.00805,28:0.0077,29:0.00735,30:0.007,
  31:0.00665,32:0.0063,33:0.00595,34:0.0057,35:0.00545,36:0.0052,37:0.00495,38:0.0047,39:0.0045,40:0.0043,
  41:0.0041,42:0.0039,43:0.0037,44:0.0035,45:0.0033,46:0.0031,47:0.0029,48:0.0028,49:0.0027,50:0.0026,
  51:0.00255,52:0.0025,53:0.00245,54:0.0024,55:0.00235,56:0.0023,57:0.00225,58:0.0022,59:0.00215,60:0.0021,
  61:0.00205,62:0.002,63:0.0019,64:0.00185,65:0.0018
};
const SRV_SIGNATURE_KEYS = ['sentry','pebble beach','genesis invitational','arnold palmer','rbc heritage','truist','memorial','travelers','st. jude','st jude','fedex st','bmw championship','tour championship'];
// FINGERPRINT_V145_SRV_NOCUT — no-cut signature events (Sentry, Travelers): 18% winner, all 72 paid.
const SRV_PAYOUT_SIGNATURE_NOCUT = {
  1:0.18,2:0.108,3:0.068,4:0.048,5:0.04,6:0.036,7:0.0335,8:0.031,9:0.029,10:0.027,
  11:0.025,12:0.023,13:0.021,14:0.019,15:0.018,16:0.017,17:0.016,18:0.015,19:0.014,20:0.013,
  21:0.012,22:0.01115,23:0.010375,24:0.0095,25:0.00875,26:0.00795,27:0.007625,28:0.0073,29:0.007,30:0.0067,
  31:0.006425,32:0.006125,33:0.005825,34:0.00555,35:0.005325,36:0.005075,37:0.004825,38:0.004625,39:0.004425,40:0.0042,
  41:0.004,42:0.0038,43:0.0036,44:0.0034,45:0.0032,46:0.003,47:0.0028,48:0.00265,49:0.0025,50:0.00245,
  51:0.0024,52:0.00235,53:0.0023,54:0.0023,55:0.002275,56:0.00225,57:0.002225,58:0.0022,59:0.002175,60:0.00215,
  61:0.002125,62:0.0021,63:0.002075,64:0.00205,65:0.002025,66:0.002,67:0.001975,68:0.00195,69:0.0019,70:0.001875,71:0.00185,72:0.0018
};
const SRV_NOCUT_KEYS = ['sentry','pebble beach','rbc heritage','truist','travelers','st. jude','st jude','fedex st','bmw championship','tour championship'];
// FINGERPRINT_V148_SRV_TOURCHAMP — Tour Championship: 30 players, $40M, 25% winner, its own table.
// FINGERPRINT_V164_SRV_DPWORLD — DP World Tour: fixed 17%-winner ladder, 69 positions, scales to
// any purse. Verified vs 2026 Omega European Masters ($3.75M). USD.
const SRV_PAYOUT_DPWORLD = {
  1:0.17,2:0.11,3:0.063,4:0.05,5:0.0424,6:0.035,7:0.03,8:0.025,9:0.0224,10:0.02,
  11:0.0184,12:0.0172,13:0.0161,14:0.0153,15:0.0147,16:0.0141,17:0.0135,18:0.0129,19:0.0124,20:0.012,
  21:0.0116,22:0.0113,23:0.011,24:0.0107,25:0.0104,26:0.0101,27:0.0098,28:0.0095,29:0.0092,30:0.0089,
  31:0.0086,32:0.0083,33:0.008,34:0.0077,35:0.0074,36:0.0071,37:0.0069,38:0.0067,39:0.0065,40:0.0063,
  41:0.0061,42:0.0059,43:0.0057,44:0.0055,45:0.0053,46:0.0051,47:0.0049,48:0.0047,49:0.0045,50:0.0043,
  51:0.0041,52:0.0039,53:0.0037,54:0.0035,55:0.0034,56:0.0033,57:0.0032,58:0.0031,59:0.003,60:0.0029,
  61:0.0028,62:0.0027,63:0.0026,64:0.0025,65:0.0024,66:0.0023,67:0.0022,68:0.0021,69:0.002,70:0.0019,
  71:0.0015,72:0.00149961
};

// FINGERPRINT_V162_SRV_ST_JUDE — FedEx St. Jude: $20M, 18% winner, ~70-player playoff field.
const SRV_PAYOUT_ST_JUDE = {
  1:0.18,2:0.108,3:0.068,4:0.048,5:0.04,6:0.036,7:0.0335,8:0.03105,9:0.02905,10:0.02705,
  11:0.02505,12:0.02305,13:0.02105,14:0.01905,15:0.01805,16:0.01705,17:0.01605,18:0.01505,19:0.01405,20:0.01305,
  21:0.01205,22:0.011225,23:0.010425,24:0.009625,25:0.008825,26:0.008025,27:0.007725,28:0.007425,29:0.007125,30:0.006825,
  31:0.006525,32:0.006225,33:0.005925,34:0.005675,35:0.005425,36:0.005175,37:0.004925,38:0.004725,39:0.004525,40:0.004325,
  41:0.004125,42:0.003925,43:0.003725,44:0.003525,45:0.003325,46:0.003125,47:0.002925,48:0.002765,49:0.002625,50:0.00255,
  51:0.00249,52:0.00243,53:0.00239,54:0.00235,55:0.00233,56:0.00231,57:0.00229,58:0.00227,59:0.00225,60:0.00223,
  61:0.00221,62:0.00219,63:0.00217,64:0.00215,65:0.00213,66:0.00211,67:0.00209,68:0.00207,69:0.00205,70:0.00203
};
function srvIsStJude(eventName){ const n=(eventName||'').toLowerCase(); return n.includes('st. jude')||n.includes('st jude'); }

// FINGERPRINT_V160_SRV_BMW — BMW Championship: $20M, 18% winner, 50-player playoff field.
const SRV_PAYOUT_BMW = {
  1:0.18,2:0.108,3:0.068,4:0.0495,5:0.0415,6:0.0375,7:0.03475,8:0.032,9:0.03,10:0.028,
  11:0.026,12:0.024,13:0.02205,14:0.0201,15:0.0191,16:0.0181,17:0.0171,18:0.0161,19:0.0151,20:0.0141,
  21:0.0131,22:0.01225,23:0.01145,24:0.01065,25:0.00985,26:0.00905,27:0.0087,28:0.00835,29:0.008,30:0.00765,
  31:0.0073,32:0.00695,33:0.0066,34:0.00635,35:0.0061,36:0.00585,37:0.0056,38:0.0054,39:0.0052,40:0.005,
  41:0.0048,42:0.0046,43:0.0044,44:0.0042,45:0.004,46:0.0038,47:0.0036,48:0.0035,49:0.0034,50:0.0033
};
function srvIsBMW(eventName){ return (eventName||'').toLowerCase().includes('bmw championship'); }

// FINGERPRINT_V163_TC_SIX_PICKS
// Required entry size depends on the event: the TOUR Championship is a 30-player field, so it uses
// 2/2/2 = 6 picks; everything else uses the standard 2/4/4 = 10. Mirrors the frontend's TIERS.
// FINGERPRINT_V171_TEAM_EVENTS
// Presidents Cup / Ryder Cup: team match play, no individual prize money. Pools score MATCH
// POINTS (1 win / ½ halve / 0 loss, 0–5 per player), pick 6, and archive points rather than
// running the money ladder. Points are stored once per event (global, not per pool) so every pool
// on that event shares the same official results.
const SRV_TEAM_EVENT_KEYS = ['presidents cup', 'ryder cup'];
function srvIsTeamEvent(n) { const s = (n || '').toLowerCase(); return SRV_TEAM_EVENT_KEYS.some(k => s.includes(k)); }
function srvTeamKey(eventName, year) {
  const slug = (eventName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `teampoints:${slug}_${year}`;
}
async function srvGetTeamPoints(eventName) {
  try { const r = await redis('GET', srvTeamKey(eventName, new Date().getFullYear())); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
// FINGERPRINT_V172_TEAM_SESSIONS — per-session results, mirroring DataGolf's session tabs.
// Shape: { thu: { 'Scottie Scheffler': 'W', ... }, fri: {...}, ... }  W=1 · H=½ · L=0.
// Totals are always DERIVED from these server-side, so a mistyped running total is impossible.
const SRV_TEAM_SESSION_KEYS = ['thu', 'fri', 'friam', 'fripm', 'satam', 'satpm', 'sun'];
const SRV_TEAM_RESULT = { W: 1, H: 0.5, L: 0 };
function srvTeamSessionsKey(eventName, year) { return srvTeamKey(eventName, year).replace(/^teampoints:/, 'teamsessions:'); }
async function srvGetTeamSessions(eventName) {
  try { const r = await redis('GET', srvTeamSessionsKey(eventName, new Date().getFullYear())); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

// FINGERPRINT_V173_MATCH_PICKEM
// Team events are a MATCH PICK'EM: before each session locks, entries pick USA or the other side in
// every match. Correct pick = 1; a HALVED match = ½ to every entry that picked it. Sessions lock at
// their first tee (set by the commissioner with the matches) and the lock is enforced HERE.
//  • teammatches:{event}_{year}   GLOBAL  { [session]: { lockAt, matches:[{id, usa:[..], intl:[..], result}] } }
//  • pool:{id}:teampicks          PER POOL { [entryName]: { [session]: { [matchId]: 'USA'|'INT' } } }
function srvTeamMatchesKey(eventName, year) { return srvTeamKey(eventName, year).replace(/^teampoints:/, 'teammatches:'); }
async function srvGetTeamMatches(eventName) {
  try { const r = await redis('GET', srvTeamMatchesKey(eventName, new Date().getFullYear())); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
// FINGERPRINT_V181_PICKS_PER_EVENT — picks are stored PER EVENT (pool:{id}:teampicks:{event}_{year}).
// They used to live under one unscoped key, keyed by entry name + session + match number, which would
// have carried this Cup's picks into the next one for anyone reusing a name. The 2026 Presidents Cup
// picks were saved under the old key, so that one event reads it once as a bridge; the first save
// then moves them to the new key.
function srvTeamPicksKey(poolId, ev, year) {
  const slug = (ev || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return k(poolId, `teampicks:${slug}_${year}`);
}
async function srvGetTeamPicks(poolId, ev) {
  const year = new Date().getFullYear();
  try {
    const r = await redis('GET', srvTeamPicksKey(poolId, ev, year));
    if (r) return JSON.parse(r);
    if (/presidents cup/i.test(ev || '') && year === 2026) {
      const old = await redis('GET', k(poolId, 'teampicks'));
      return old ? JSON.parse(old) : {};
    }
    return {};
  } catch { return {}; }
}
// FINGERPRINT_V192_MATCH_LOCKS — picks lock MATCH BY MATCH, not per session.
// Each match locks at its own tee time, but never sooner than 15 minutes after its session was posted
// (and never more than 15 minutes past its tee). Why: at the 2026 Presidents Cup DataGolf posted the Sat PM
// pairings at 2:12 PM ET for a 2:15 lock — ~3 minutes to pick. Each session stores postedAt; each match
// stores teeAt + lockAt (worked out here, on posting and on commissioner saves). sess.lockAt stays the
// session's first tee. Tee spacing mirrors the page's (official 2024/2026 Presidents Cup times).
const SRV_TEAM_SPANS = { presidents: { thu: 72, fri: 56, satam: 54, satpm: 42, sun: 137 } };
const SRV_PICK_GRACE_MS = 15 * 60 * 1000;
function srvMatchTeeMs(ev, sk, sv, idx) {
  const base = new Date(sv?.lockAt).getTime();
  if (!Number.isFinite(base)) return null;
  if (idx <= 0) return base;
  const span = /ryder/i.test(ev || '') ? null : SRV_TEAM_SPANS.presidents[sk];
  const n = (sv?.matches || []).length;
  return (!span || n < 2) ? base : base + Math.round(idx * span / (n - 1)) * 60000;
}
function srvApplyMatchLocks(ev, sk, sv) {
  const posted = new Date(sv?.postedAt || 0).getTime();
  (sv?.matches || []).forEach((m, i) => {
    const tee = srvMatchTeeMs(ev, sk, sv, i);
    if (!Number.isFinite(tee)) return;
    const lock = posted > 0 ? Math.min(Math.max(tee, posted + SRV_PICK_GRACE_MS), tee + SRV_PICK_GRACE_MS) : tee;
    m.teeAt = new Date(tee).toISOString();
    m.lockAt = new Date(lock).toISOString();
  });
  return sv;
}
const srvMatchLockMs = (sess, m) => new Date(m?.lockAt || sess?.lockAt).getTime();
const srvMatchLocked = (sess, m) => { const t = srvMatchLockMs(sess, m); return Number.isFinite(t) && Date.now() >= t; };
// a session counts as LOCKED only once every one of its matches has locked
const srvSessionLocked = (sess) => !!sess && ((sess.matches || []).length
  ? sess.matches.every(m => srvMatchLocked(sess, m))
  : !!(sess.lockAt && Date.now() >= new Date(sess.lockAt).getTime()));
const srvNextOpenLockMs = (sess) => {
  const t = (sess?.matches || []).map(m => srvMatchLockMs(sess, m)).filter(x => Number.isFinite(x) && x > Date.now());
  return t.length ? Math.min(...t) : null;
};
// Picks stay private until THAT MATCH locks — revealed match by match.
function srvLockedPicksOnly(picks, matches) {
  const out = {};
  for (const [name, bySess] of Object.entries(picks || {})) {
    for (const [sk, sel] of Object.entries(bySess || {})) {
      const sess = matches[sk];
      if (!sess) continue;
      for (const [mid, v] of Object.entries(sel || {})) {
        const m = (sess.matches || []).find(x => x.id === mid);
        if (m && srvMatchLocked(sess, m)) ((out[name] = out[name] || {})[sk] = out[name][sk] || {})[mid] = v;
      }
    }
  }
  return out;
}
function srvMatchScore(entryPicks, matches) {
  let t = 0;
  for (const [sk, sess] of Object.entries(matches || {})) {
    for (const m of (sess.matches || [])) {
      const pick = entryPicks?.[sk]?.[m.id];
      if (!pick || !m.result) continue;
      if (m.result === 'H') t += 0.5; else if (pick === m.result) t += 1;
    }
  }
  return t;
}
// FINGERPRINT_V191_MAGIC_LINKS — email buttons sign the entry straight in. The link carries a signed
// token, never the code: token = base64url({p:pool, n:entry, x:expiry}) + "." + HMAC(secret, payload|code).
// Valid only for that entry in that pool, for 10 days, and only while their code is unchanged.
function srvMagicSecret() { return process.env.MAGIC_LINK_SECRET || process.env.TEAM_SYNC_SECRET || ''; }
function srvMagicToken(poolId, entry, days = 10) {
  const secret = srvMagicSecret();
  if (!secret || !entry?.name || !entry?.editCode) return null;
  const payload = Buffer.from(JSON.stringify({ p: poolId, n: entry.name, x: Date.now() + days * 864e5 })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload + '|' + String(entry.editCode).toUpperCase()).digest('base64url').slice(0, 32);
  return `${payload}.${sig}`;
}
function srvMagicLink(poolUrl, poolId, entry, tab) {
  const t = srvMagicToken(poolId, entry);
  return t ? `${poolUrl}?t=${t}${tab ? '&tab=' + tab : ''}` : poolUrl;
}
function srvMagicVerify(poolId, token, entries) {
  const secret = srvMagicSecret();
  const dot = String(token || '').lastIndexOf('.');
  if (!secret || dot < 1) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  let data; try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!data || data.p !== poolId || !(data.x > Date.now())) return null;
  const entry = (entries || []).find(e => e.name.toLowerCase() === String(data.n || '').toLowerCase());
  if (!entry?.editCode) return null;
  const expect = createHmac('sha256', secret).update(payload + '|' + String(entry.editCode).toUpperCase()).digest('base64url').slice(0, 32);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  return entry;
}

// FINGERPRINT_V193_PUSH — phone/desktop notifications (Web Push). Each device that turns notifications on
// is stored against its entry in pool:{id}:pushsubs = { entryName: [subscription, …] } (max 5 devices each).
// Sent at the same moments as the emails. Dead subscriptions (404/410) are pruned automatically.
// Needs VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (+ optional VAPID_SUBJECT) in Vercel; without them this is a no-op.
function srvPushReady() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@tunagolfpool.com',
      process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    return true;
  } catch (e) { console.log('[push] bad VAPID keys:', e.message); return false; }
}
// items: [{ name, payload }] — each goes to every device that entry has turned notifications on for
async function srvPushMany(poolId, items) {
  if (!items.length || !srvPushReady()) return 0;
  const key = k(poolId, 'pushsubs');
  let subs = {};
  try { const r = await redis('GET', key); if (r) subs = JSON.parse(r); } catch {}
  let sent = 0, pruned = false;
  const jobs = [];
  for (const { name, payload, type } of items) {
    for (const sub of (subs[name] || [])) {
      if (type && !srvPushWants(sub, type)) continue;          // FINGERPRINT_V194 — this device opted out
      jobs.push(webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 })
        .then(() => { sent++; })
        .catch(err => {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            subs[name] = (subs[name] || []).filter(x => x.endpoint !== sub.endpoint); pruned = true;
          } else console.log('[push] send failed:', err?.statusCode || err?.message);
        }));
    }
  }
  await Promise.all(jobs);
  if (pruned) await redis('SET', key, JSON.stringify(subs));
  return sent;
}

// FINGERPRINT_V198_PRIVACY — what visitors may see. Every entries list sent to a browser goes through
// srvPublicEntries (no emails, no edit codes; a masked email hint instead; NO picks while picks are hidden),
// and pool settings go through srvPublicMeta (no admin password, no join code). Checks of codes, the join
// code and the admin password all happen here on the server, never in the browser.
const srvMaskEmail = (em) => { const x = String(em || ''), at = x.indexOf('@'); return at > 0 ? x[0] + '***' + x.slice(at) : ''; };
function srvPublicEntries(list, hidePicks = false) {
  return (list || []).map(e => {
    const { editCode, email, ...rest } = e || {};
    const out = { ...rest, hasEmail: !!email, emailHint: srvMaskEmail(email) };
    if (hidePicks) out.picks = [];
    return out;
  });
}
function srvPublicMeta(m) {
  if (!m) return m;
  const o = { ...m };
  delete o.adminPassword; delete o.joinCode;
  for (const kk of Object.keys(o)) if (/password|secret|token|api_?key/i.test(kk)) delete o[kk];
  return o;
}

// FINGERPRINT_V199_HIDE_UNTIL_TEE — "Hide picks" means hidden UNTIL THE FIRST TEE (the page has always
// applied that part). The stored flag stays on all week, so the server must check the first tee too, or
// picks vanish mid-tournament (v198 did exactly that — nothing was deleted, just not sent).
// First tee = earliest Round 1 tee time from DataGolf + the venue's time zone, worked out once per event
// and cached for 10 days (only ever computed for pools with Hide picks on and entries not yet locked).
async function srvFirstTeeMs(meta) {
  const evName = srvIsTourMode(meta?.major) ? (meta?.currentPgatourEvent || '') : (SRV_MAJOR_LABEL[meta?.major] || '');
  if (!evName) return null;
  const tour = srvTour(meta.major);
  const key = `firsttee:${tour}:${srvNormEv(evName).replace(/\s/g, '')}`;
  try { const c = await redis('GET', key); if (c) return +c; } catch {}
  try { if (await redis('GET', key + ':miss')) return null; } catch {}     // asked DataGolf <10 min ago, not out yet
  const miss = async () => { try { await redis('SETEX', key + ':miss', 600, '1'); } catch {} return null; };
  try {
    const dk = process.env.DATAGOLF_API_KEY;
    const fu = await fetch(`https://feeds.datagolf.com/field-updates?tour=${tour}&file_format=json&key=${dk}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).then(r => r.json());
    if (!srvEvMatch(fu?.event_name, evName)) return await miss();
    const tees = (fu.field || []).flatMap(p => (p.teetimes || []).filter(t => +t.round_num === 1).map(t => String(t.teetime || '')))
      .filter(x => /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}/.test(x)).sort();
    if (!tees.length) return await miss();
    const sch = await fetch(`https://feeds.datagolf.com/get-schedule?tour=${tour}&file_format=json&key=${dk}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) }).then(r => r.json());
    const sev = (sch?.schedule || []).find(x => srvEvMatch(x.event_name, evName));
    const ms = srvLocalToUtcMs(tees[0], srvTourTZ(sev?.latitude, sev?.longitude));
    if (ms) await redis('SETEX', key, 10 * 86400, String(ms));
    return ms;
  } catch { return null; }
}
// FINGERPRINT_V200_LATE_ENTRIES — has this pool's event teed off? (unknown → no). Cup weeks are skipped:
// their joining deadline is the first session, handled on the page.
async function srvPastFirstTee(meta) {
  if (!meta || srvIsTeamEvent(meta.currentPgatourEvent)) return false;
  const t = await srvFirstTeeMs(meta);
  return !!(t && Date.now() >= t);
}
// Should picks be withheld from visitors right now?
async function srvHidePicksNow(poolId, picksHidden, locked, meta) {
  if (picksHidden === undefined) picksHidden = await getPicksHidden(poolId);
  if (!picksHidden) return false;
  if (locked === undefined) locked = await getLocked(poolId);
  if (locked) return false;
  const t = await srvFirstTeeMs(meta || await getPoolMeta(poolId));
  return !(t && Date.now() >= t);
}

// FINGERPRINT_V194_NOTIFY_PREFS — what each device wants. Opt-ins default OFF; the rest default ON.
const SRV_PUSH_DEFAULTS = { picksOpen: true, pickReminder: true, lockSoon: true, poolOpen: true, cut: true, recap: true,
  final: true, leadChange: false, golferMoment: false, chatMention: false, newEntry: true, unpaid: true };
const srvPushWants = (dev, type) => (dev?.prefs && typeof dev.prefs[type] === 'boolean') ? dev.prefs[type] : SRV_PUSH_DEFAULTS[type] !== false;
const srvCleanPrefs = (p) => { const o = {}; for (const kk of Object.keys(SRV_PUSH_DEFAULTS)) if (typeof p?.[kk] === 'boolean') o[kk] = p[kk]; return o; };
const srvPrefsView = (dev) => { const o = {}; for (const kk of Object.keys(SRV_PUSH_DEFAULTS)) o[kk] = srvPushWants(dev, kk); return o; };

// FINGERPRINT_V194_NOTIFY_ENGINE — normal-week notifications, checked every 5 minutes (piggybacks on the
// droplet's year-round status check). Only pools in the `pushpools` set are looked at, and each needs just
// one MGET for meta + devices + state, so it's light on the free Redis tier. Per-event state lives in
// pool:{id}:notifystate so each notice goes once.
const SRV_MAJOR_LABEL = { masters: 'The Masters', pga: 'PGA Championship', usopen: 'U.S. Open', open: 'The Open', players: 'THE PLAYERS' };
function srvTourTZ(lat, lng) {                       // FINGERPRINT_V201_TZ — exact zone (same as the page)
  if (lat == null || lng == null || lat === '' || lng === '') return 'America/New_York';
  const la = Number(lat), lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return 'America/New_York';
  try { return tzlookup(la, lo); } catch { return 'America/New_York'; }
}
function srvLocalToUtcMs(str, tz) {                  // "YYYY-MM-DD HH:MM" in venue time → UTC ms
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/);
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(naive);
  const l = f.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (!l) return null;
  const asLocal = Date.UTC(+l[3], +l[1] - 1, +l[2], +l[4] % 24, +l[5]);
  return naive - (asLocal - naive);
}
const srvNormEv = (x) => String(x || '').toLowerCase().replace(/^the\s+/, '').replace(/\s+\d{4}$/, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const srvEvMatch = (a, b) => { const x = srvNormEv(a), y = srvNormEv(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };
const srvBig = (n) => n >= 1e6 ? '$' + (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : '$' + Math.round((n || 0) / 1000) + 'K';
const srvOrd = (n) => n + (['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

// FINGERPRINT_V211_MAKECUT — same rule as the page: once EVERY golfer's live make-cut % is exactly 0 or 100,
// anyone at exactly 0 who has finished their round has missed the cut (DataGolf labels CUT later).
function srvApplyMakeCut(players) {
  const mcOf = (p) => { const v = p.make_cut; if (v == null || v === '' || isNaN(+v)) return null; const n = +v; return n > 1 ? n / 100 : n; };
  const live = players.filter(p => !/WD|DQ/i.test(String(p.current_pos || '')) && mcOf(p) != null);
  if (live.length < 30 || !live.every(p => mcOf(p) === 0 || mcOf(p) >= 0.9999)) return players;
  return players.map(p => {
    const t = parseInt(p.thru, 10), midRound = t >= 1 && t <= 17;
    return mcOf(p) === 0 && !midRound && !/CUT|WD|DQ|MC/i.test(String(p.current_pos || '')) ? { ...p, current_pos: 'CUT' } : p;
  });
}

// FINGERPRINT_V212_ARCHIVE_LOCK — the page saves archives automatically ('auto'). Two rules keep it from
// clobbering History (it overwrote the hand-rebuilt Masters + PGA Championship weeks):
//  1. an auto save may only write the event the pool is ACTUALLY on (its current mode) — a PGA Tour pool's page
//     can never write a major's week, e.g. during the moment it briefly assumes 'pga' while loading;
//  2. an auto save can't change a FINISHED week: it gets 12 hours after the first save to settle (late payout
//     fixes), then the week is frozen. Weeks restored/rebuilt by hand are `locked` and never auto-touched.
// Saves made with the admin password (Admin's "Save Final Results", rebuild/import) are always allowed.
async function srvAutoArchiveBlock(poolId, major, archiveKey) {
  const meta = await getPoolMeta(poolId);
  if (!meta || major !== meta.major) return `auto save for '${major}' but this pool is on '${meta?.major}'`;
  let ex = null;
  try { const r = await redis('GET', archiveKey); if (r) ex = JSON.parse(r); } catch {}
  if (!ex) return null;
  if (ex.locked) return 'this week was fixed by hand (locked)';
  const first = Date.parse(ex.firstSavedAt || '');
  if (!Number.isFinite(first) || Date.now() - first > 12 * 3600e3) return 'this week is finished (frozen)';
  return null;
}

// FINGERPRINT_V213 — season standings as a function (the 'season' request and the recap email both use it)
async function srvSeason(poolId, yearIn) {
  const year = +yearIn || new Date().getFullYear();
  const meta = await getPoolMeta(poolId);
  const raceOf = (a) => a.major === 'dpworld' ? 'dpworld' : (a.major === 'pgatour' || a.major === 'players') ? 'pgatour'
    : ['masters', 'pga', 'usopen', 'open'].includes(a.major) ? 'majors' : null;
  const keys = [];
  for (const m of ['players', 'masters', 'pga', 'usopen', 'open']) for (let y = 2024; y <= new Date().getFullYear() + 1; y++) keys.push(k(poolId, `archive:${m}_${y}`));
  try {
    let cursor = '0';
    do {
      const res = await redis('SCAN', cursor, 'MATCH', k(poolId, 'archive:*-*'), 'COUNT', 100);
      if (!Array.isArray(res) || res.length !== 2) break;
      cursor = res[0]; (res[1] || []).forEach(x => keys.push(x));
    } while (cursor !== '0');
  } catch {}
  const raws = keys.length ? await redis('MGET', ...keys) : [];
  const all = raws.map(r => { try { return r ? JSON.parse(r) : null; } catch { return null; } }).filter(a => a && raceOf(a));
  // FINGERPRINT_V207 — always offer the current season too, so last season stays reachable on Jan 1
  const years = [...new Set([new Date().getFullYear(), year, ...all.map(a => +a.year).filter(Boolean)])].sort((a, b) => b - a);
  const weeks = all.filter(a => +a.year === year);
  const norm = (e) => String(e || '').trim().toLowerCase();
  const emails = [...new Set(weeks.flatMap(a => (a.entries || []).filter(e => !e.uid && e.email).map(e => norm(e.email))))];
  const uidByEmail = {};
  if (emails.length) { const r = await redis('MGET', ...emails.map(e => `user:email:${e}`)); emails.forEach((e, i) => { if (r[i]) uidByEmail[e] = r[i]; }); }
  const uids = [...new Set(weeks.flatMap(a => (a.entries || []).map(e => e.uid || uidByEmail[norm(e.email)]).filter(Boolean)))];
  const acctName = {};
  if (uids.length) { const r = await redis('MGET', ...uids.map(u => `user:${u}`)); uids.forEach((u, i) => { try { const x = JSON.parse(r[i] || 'null'); if (x?.name) acctName[u] = x.name; } catch {} }); }
  const races = { majors: { events: 0, rows: {} }, pgatour: { events: 0, rows: {} }, dpworld: { events: 0, rows: {} } };
  for (const a of weeks.sort((x, y) => new Date(x.archivedAt || 0) - new Date(y.archivedAt || 0))) {
    const earnings = a.earnings || {};
    const ranked = (a.entries || []).map(e => ({ e, total: a.entryTotals ? (+a.entryTotals[e.name] || 0) : (e.picks || []).reduce((t, n) => t + (earnings[n] || 0), 0) }))
      .filter(x => a.entryTotals || (x.e.picks && x.e.picks.length > 0)).sort((x, y) => y.total - x.total);
    const fee = a.entryFee || 0, n = (a.entries || []).length, pot = n * fee;
    const wta = n <= 4 || meta?.payoutMode === 'winner-take-all';
    const prizes = a.prizes ? [a.prizes.first || 0, a.prizes.second || 0, a.prizes.third || 0]
      : (fee > 0 && n >= 1 ? (wta ? [pot, 0, 0] : [pot - fee * 3, fee * 2, fee]) : []);
    const tieSplit = (a.scoring === 'points' || a.scoring === 'matchpicks');
    const split = tieSplit ? (() => { const out = ranked.map(() => 0); for (let i = 0; i < ranked.length;) { let j = i; while (j + 1 < ranked.length && Math.abs(ranked[j + 1].total - ranked[i].total) < 1e-9) j++; let p = 0; for (let q = i; q <= j; q++) p += (prizes[q] || 0); for (let q = i; q <= j; q++) out[q] = p / (j - i + 1); i = j + 1; } return out; })() : null;
    const race = races[raceOf(a)];
    race.events++;
    const seenThisWeek = new Set(), bestGolf = {};       // FINGERPRINT_V205 — golfer $: best entry per person per week
    ranked.forEach((x, i) => {
      const em = norm(x.e.email), uid = x.e.uid || uidByEmail[em] || null;
      const key = uid ? 'u:' + uid : em ? 'e:' + em : 'n:' + String(x.e.name || '').toLowerCase();
      const row = race.rows[key] = race.rows[key] || { name: '', uid, winnings: 0, golfer: 0, events: 0, entries: 0, wins: 0, cashes: 0, best: null };
      row.name = uid && acctName[uid] ? acctName[uid] : x.e.name;
      const won = tieSplit ? (split[i] || 0) : (i < 3 ? (prizes[i] || 0) : 0);
      const place = 1 + ranked.filter(r => r.total > x.total).length;
      row.winnings += won; row.entries++;
      if (!seenThisWeek.has(key)) { row.events++; seenThisWeek.add(key); }
      if (place === 1 && x.total > 0) row.wins++;
      if (won > 0) row.cashes++;
      row.best = row.best == null ? place : Math.min(row.best, place);
      if (!tieSplit) bestGolf[key] = Math.max(bestGolf[key] || 0, x.total);   // money weeks only (Cup weeks are points)
    });
    for (const [key, v] of Object.entries(bestGolf)) race.rows[key].golfer += v;
  }
  const out = {};
  for (const [rk, r] of Object.entries(races))
    // FINGERPRINT_V206 — only players with an account are listed (their earlier weeks count, matched by email)
    out[rk] = { events: r.events, rows: Object.values(r.rows).filter(x => x.uid).map(x => ({ ...x, winnings: Math.round(x.winnings * 100) / 100, golfer: Math.round(x.golfer) }))
      .sort((x, y) => y.winnings - x.winnings || y.wins - x.wins || (x.best ?? 99) - (y.best ?? 99) || y.events - x.events) };
  return { year, years, races: out };
}

// FINGERPRINT_V213_RECAP — the end-of-event recap email to everyone in the pool.
// Ranks the finished week with History's exact rules (same as the season standings), then sends ONE email per
// person (all their entries in it): winner + top 5 with prizes, their own finish and best golfer, and their
// season position if they have an account. Sent once per event (a marker in Redis), from the Sunday-night final
// save or — as a backup — the Tuesday rotation. Never from hand restores (import/rebuild), so fixing History
// never emails anyone.
function srvArchiveResults(a, meta) {
  const earnings = a.earnings || {};
  const pts = a.scoring === 'points' || a.scoring === 'matchpicks';
  const ranked = (a.entries || []).map(e => ({ e, total: a.entryTotals ? (+a.entryTotals[e.name] || 0) : (e.picks || []).reduce((t, n) => t + (earnings[n] || 0), 0) }))
    .filter(x => a.entryTotals || (x.e.picks && x.e.picks.length > 0)).sort((x, y) => y.total - x.total);
  const fee = a.entryFee || 0, n = (a.entries || []).length, pot = n * fee;
  const wta = n <= 4 || meta?.payoutMode === 'winner-take-all';
  const prizes = a.prizes ? [a.prizes.first || 0, a.prizes.second || 0, a.prizes.third || 0]
    : (fee > 0 && n >= 1 ? (wta ? [pot, 0, 0] : [pot - fee * 3, fee * 2, fee]) : []);
  const split = ranked.map(() => 0);
  if (pts) for (let i = 0; i < ranked.length;) { let j = i; while (j + 1 < ranked.length && Math.abs(ranked[j + 1].total - ranked[i].total) < 1e-9) j++;
    let p = 0; for (let q = i; q <= j; q++) p += (prizes[q] || 0); for (let q = i; q <= j; q++) split[q] = p / (j - i + 1); i = j + 1; }
  return ranked.map((x, i) => ({
    entry: x.e, total: x.total, place: 1 + ranked.filter(r => r.total > x.total).length,
    prize: pts ? split[i] : (i < 3 ? (prizes[i] || 0) : 0),
    best: pts ? null : (x.e.picks || []).reduce((b, pk) => (earnings[pk] || 0) > (b ? b.v : 0) ? { p: pk, v: earnings[pk] } : b, null),
  }));
}
const srvEscHtml = (x) => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function srvSendRecap(poolId, archiveKey) {
  if (!process.env.RESEND_API_KEY) return 0;
  const raw = await redis('GET', archiveKey);
  if (!raw) return 0;
  const a = JSON.parse(raw);
  if (a.manuallyImported || a.locked) return 0;                       // hand restores never email
  const meta = await getPoolMeta(poolId);
  const res = srvArchiveResults(a, meta);
  const pts = a.scoring === 'points' || a.scoring === 'matchpicks';
  if (!res.length || (!pts && !res.some(r => r.total > 0))) return 0;   // nothing real to report yet
  if (!(await redis('SET', `${archiveKey}:recap`, '1', 'NX', 'EX', String(60 * 86400)))) return 0;   // once only
  const label = a.eventName || SRV_MAJOR_LABEL[a.major] || 'the tournament';
  const poolName = meta?.poolName || 'Your pool';
  const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
  const amt = (t) => pts ? `${t} pt${t === 1 ? '' : 's'}` : (t > 0 ? srvBig(t) : '$0');
  const usd = (n) => '$' + (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2));
  const last = (pk) => String(pk || '').split(',')[0].trim();
  const winners = res.filter(r => r.place === 1).map(r => r.entry.name);
  const subject = `🏆 ${winners.join(' & ')} ${winners.length > 1 ? 'share' : 'wins'} the ${label} pool`;
  const top = res.slice(0, 5).map(r => `<tr><td style="padding:6px 8px;color:#6b7280;width:28px">${r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : r.place}</td>
    <td style="padding:6px 8px;font-weight:700;color:#1a4d2e">${srvEscHtml(r.entry.name)}</td><td style="padding:6px 8px;text-align:right">${amt(r.total)}</td>
    <td style="padding:6px 8px;text-align:right;color:#15803d;font-weight:700">${r.prize > 0 ? '💰 ' + usd(r.prize) : ''}</td></tr>`).join('');
  // season standings for account holders (one calculation for the whole send)
  const race = a.major === 'dpworld' ? 'dpworld' : (a.major === 'pgatour' || a.major === 'players') ? 'pgatour' : ['masters', 'pga', 'usopen', 'open'].includes(a.major) ? 'majors' : null;
  const raceName = { majors: 'Majors', pgatour: 'PGA Tour', dpworld: 'DP World' }[race];
  let seasonRows = [];
  try { if (race) seasonRows = (await srvSeason(poolId, a.year)).races[race].rows; } catch {}
  const uidByEmail = {};
  const emails = [...new Set(res.map(r => String(r.entry.email || '').toLowerCase().trim()).filter(Boolean))];
  if (emails.length) { const u = await redis('MGET', ...emails.map(e => `user:email:${e}`)); emails.forEach((e, i) => { if (u[i]) uidByEmail[e] = u[i]; }); }
  const out = [];
  for (const email of emails) {
    const mine = res.filter(r => String(r.entry.email || '').toLowerCase().trim() === email);
    const first = String(mine[0].entry.name || '').split(/\s+/)[0];
    const lines = mine.map(r => `<div style="margin:4px 0"><b>${srvEscHtml(r.entry.name)}</b> — ${srvOrd(r.place)} of ${res.length} · ${amt(r.total)}`
      + (r.prize > 0 ? ` · <span style="color:#15803d;font-weight:700">won ${usd(r.prize)}</span>` : '')
      + (r.best && r.best.v > 0 ? `<div style="font-size:13px;color:#6b7280">${srvEscHtml(last(r.best.p))} led your team with ${srvBig(r.best.v)}</div>` : '') + `</div>`).join('');
    const uid = mine.map(r => r.entry.uid).find(Boolean) || uidByEmail[email];
    const si = uid ? seasonRows.findIndex(x => x.uid === uid) : -1;
    const season = si >= 0 ? `<p style="font-size:14px;color:#374151;margin:14px 0 0">📈 Season: you're <b>${srvOrd(si + 1)}</b> in the ${raceName} standings with <b>${usd(seasonRows[si].winnings)}</b> won.</p>` : '';
    out.push({ from: 'Tuna Golf Pool <noreply@tunagolfpool.com>', to: email, subject, html:
`<div style="font-family:-apple-system,system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="font-size:12px;font-weight:700;color:#1a4d2e;letter-spacing:.6px">⛳ ${srvEscHtml(poolName).toUpperCase()}</div>
  <h2 style="margin:6px 0 4px;color:#1a4d2e;font-size:22px">${srvEscHtml(label)} — final results</h2>
  <p style="font-size:15px;margin:10px 0 14px">Hi ${srvEscHtml(first)}, ${winners.length > 1 ? `it's a tie at the top — ${srvEscHtml(winners.join(' & '))} share it` : `<b>${srvEscHtml(winners[0])}</b> wins the pool`}! 🏆</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f6f3ea;border-radius:10px">${top}</table>
  <div style="margin-top:16px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px"><div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#6b7280;margin-bottom:4px">YOUR FINISH</div>${lines}</div>
  ${season}
  <p style="margin:22px 0"><a href="${poolUrl}?tab=history" style="background:#1a4d2e;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">See full results →</a></p>
  <p style="font-size:11px;color:#9ca3af">You're getting this because you entered ${srvEscHtml(poolName)}.</p></div>` });
  }
  const sent = await srvResendBatch(out);
  console.log(`[recap] ${poolId} ${label}: ${sent} sent`);
  return sent;
}

async function srvNotifyTick() {
  if (!srvPushReady()) return { skipped: 'no VAPID keys' };
  let pids = [];
  try { pids = (await redis('SMEMBERS', 'pushpools')) || []; } catch {}
  if (!pids.length) return { pools: 0 };
  const cache = {};
  const dg = async (path) => {
    if (cache[path] !== undefined) return cache[path];
    try {
      const r = await fetch(`https://feeds.datagolf.com/${path}${path.includes('?') ? '&' : '?'}file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
        { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      cache[path] = r.ok ? await r.json() : null;
    } catch { cache[path] = null; }
    return cache[path];
  };
  const vals = await redis('MGET', ...pids.flatMap(p => [k(p, 'meta'), k(p, 'pushsubs'), k(p, 'notifystate')]));
  const out = {};
  for (let i = 0; i < pids.length; i++) {
    try {
      const meta = JSON.parse(vals[i * 3] || 'null'), subs = JSON.parse(vals[i * 3 + 1] || '{}'), st = JSON.parse(vals[i * 3 + 2] || '{}');
      if (!meta || !Object.values(subs).some(v => (v || []).length)) continue;
      out[pids[i]] = await srvNotifyPool(pids[i], meta, subs, st, dg);
    } catch (e) { out[pids[i]] = 'error: ' + e.message; }
  }
  return out;
}

async function srvNotifyPool(pid, meta, subs, st, dg) {
  const tourMode = srvIsTourMode(meta.major);
  const evName = tourMode ? (meta.currentPgatourEvent || '') : (SRV_MAJOR_LABEL[meta.major] || '');
  if (!evName || srvIsTeamEvent(evName)) return 'skip';               // Cup weeks have their own notices
  const poolName = meta.poolName || 'Your pool';
  const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${pid}`;
  const evKey = `${meta.major}|${evName}`.toLowerCase();
  const people = Object.keys(subs).filter(n => n !== '__admin__' && (subs[n] || []).length);
  const items = [];
  const push = (name, type, title, body, tag) => items.push({ name, type, payload: { title, body, url: poolUrl, tag: tag || `${type}-${evKey}` } });
  let changed = false;
  // 📢 a new event → the pool is open (not on the very first check, which just records where we are)
  if (!st.evKey) { st = { evKey, ev: {} }; changed = true; }
  else if (st.evKey !== evKey) {
    st = { evKey, ev: {} }; changed = true;
    people.forEach(n => push(n, 'poolOpen', `${evName} is open ⛳`, `${poolName} — get your picks in before the first tee.`));
  }
  const ev = st.ev = st.ev || {};
  const entries = await getEntries(pid);
  const entered = new Set(entries.map(e => e.name.toLowerCase()));
  const tour = srvTour(meta.major), now = Date.now();
  // ⏰ first tee (worked out once per event from DataGolf's tee times + the venue's time zone)
  if (!ev.firstTee) {
    const fu = await dg(`field-updates?tour=${tour}`);
    if (fu && srvEvMatch(fu.event_name, evName)) {
      const tees = (fu.field || []).flatMap(p => (p.teetimes || []).filter(t => +t.round_num === 1).map(t => String(t.teetime || '')))
        .filter(x => /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}/.test(x)).sort();
      if (tees.length) {
        const sch = await dg(`get-schedule?tour=${tour}`);
        const sev = (sch?.schedule || []).find(x => srvEvMatch(x.event_name, evName));
        const ms = srvLocalToUtcMs(tees[0], srvTourTZ(sev?.latitude, sev?.longitude));
        if (ms) { ev.firstTee = ms; changed = true; }
      }
    }
  }
  if (ev.firstTee && !ev.lockSoon && now >= ev.firstTee - 60 * 60000 && now < ev.firstTee) {
    ev.lockSoon = true; changed = true;
    const t = new Date(ev.firstTee).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
    people.filter(n => !entered.has(n.toLowerCase()))
      .forEach(n => push(n, 'lockSoon', `⏰ ${poolName} locks at ${t}`, `You're not in yet for the ${evName} — make your picks before the first tee.`));
    const payments = await getPayments(pid);
    const unpaid = entries.filter(e => !payments[e.name]).length, pot = entries.length * (meta.entryFee || 0);
    push('__admin__', 'unpaid', `${evName}: ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${pot ? ` · $${pot} pot` : ''}`,
      unpaid ? `${unpaid} still unpaid — the pool locks at ${t}.` : `Everyone's paid ✓ — the pool locks at ${t}.`);
  }
  // 🏁 live: round recaps, the cut, the final result, lead changes, golfer moments
  if (entries.length && (!ev.firstTee || now >= ev.firstTee)) {
    const ip = await dg(`preds/in-play?tour=${tour}&dead_heat=no&odds_format=percent`);
    const players = srvApplyMakeCut(ip?.data || ip?.players || []);
    if (players.length && srvEvMatch(ip?.info?.event_name, evName)) {
      const round = +(ip?.info?.current_round) || 0;
      const active = players.filter(p => !/CUT|WD|DQ|MC/i.test(String(p.current_pos || '')));
      const roundDone = round > 0 && active.length > 0 && active.every(p => String(p.thru).toUpperCase() === 'F' || +p.thru === 18);
      const purse = meta?.purses?.[meta.major] || meta?.purses?.pgatour || (meta.major === 'dpworld' ? 3750000
        : srvIsTourChampionship(evName) ? 40000000 : (srvIsSignature(evName.toLowerCase(), null) ? 20000000 : 9000000));
      const byPick = srvEarningsByPick(entries, srvComputeEarnings(players, purse, evName.toLowerCase(), meta.major));
      const table = entries.map(e => ({ name: e.name, picks: e.picks || [], total: (e.picks || []).reduce((sum, pk) => sum + (byPick[pk] || 0), 0) }))
        .sort((a, b) => b.total - a.total);
      const leader = table[0];
      const placeOf = (row) => 1 + table.filter(x => x.total > row.total).length;
      if (roundDone && !ev['r' + round]) {
        ev['r' + round] = true; changed = true;
        const hasCut = players.some(p => /CUT|MC/i.test(String(p.current_pos || '')));
        // FINGERPRINT_V195_CUT_ROUND — the cut report goes after whichever round the cut actually happens:
        // Round 2 normally, Round 3 at the Dunhill Links (54-hole cut). No-cut events just get recaps.
        const cutNow = hasCut && !ev.cutSent && round < 4;
        if (cutNow) ev.cutSent = true;
        for (const n of people) {
          const row = table.find(x => x.name.toLowerCase() === n.toLowerCase());
          if (!row) continue;
          const pl = placeOf(row);
          const standing = pl === 1 ? `You lead the pool with ${srvBig(row.total)}` : `You're ${srvOrd(pl)} with ${srvBig(row.total)} — ${leader.name} leads with ${srvBig(leader.total)}`;
          if (round >= 4) push(n, 'final', pl === 1 ? `🏆 You won the ${evName} pool!` : `🏁 Final: ${leader.name} wins the pool`,
            pl === 1 ? `${srvBig(row.total)} in earnings — congratulations!` : `You finished ${srvOrd(pl)} with ${srvBig(row.total)}.`);
          else if (cutNow) push(n, 'cut', `✂️ The cut's in — ${row.picks.filter(pk => (byPick[pk] || 0) > 0).length} of ${row.picks.length} made it`, `${standing}.`);
          else push(n, 'recap', `🏁 After Round ${round}: you're ${srvOrd(pl)}`, `${standing}.`);
        }
      }
      // 🔥 Sunday lead changes (opt-in), at most one an hour
      if (round === 4 && !roundDone && leader && leader.total > 0) {
        if (ev.leader && ev.leader !== leader.name && now - (ev.leaderAt || 0) >= 60 * 60000) {
          people.forEach(n => push(n, 'leadChange', `🔥 ${leader.name} takes the lead`, `${srvBig(leader.total)} in the ${evName} pool.`, `lead-${evKey}`));
          ev.leaderAt = now;
        }
        if (ev.leader !== leader.name) { ev.leader = leader.name; changed = true; }
      }
      // ⛳ one of your golfers takes the outright lead (opt-in), rounds 3–4, once per golfer per round
      if (round >= 3 && !roundDone) {
        ev.gm = ev.gm || {};
        for (const g of players.filter(p => String(p.current_pos || '') === '1')) {
          const key = `${round}:${srvNormalizeName(g.player_name)}`;
          if (ev.gm[key]) continue;
          ev.gm[key] = true; changed = true;
          const vars = new Set(srvNameVariants(g.player_name));
          const disp = String(g.player_name || '').includes(',') ? g.player_name.split(',').reverse().map(x => x.trim()).join(' ') : g.player_name;
          for (const row of table) if (row.picks.some(pk => vars.has(srvNormalizeName(pk))))
            push(row.name, 'golferMoment', `⛳ ${disp} leads the ${evName}`, `One of your picks is out in front in Round ${round}.`, `gm-${key}`);
        }
      }
    }
  }
  let sent = 0;
  if (items.length) sent = await srvPushMany(pid, items);
  if (changed) await redis('SET', k(pid, 'notifystate'), JSON.stringify(st));
  return { event: evName, queued: items.length, sent };
}

// FINGERPRINT_V190_BATCH — send many emails as Resend BATCH requests (up to 100 per request, counted as
// ONE request against the 5-per-second limit). Returns how many were accepted.
async function srvResendBatch(emails) {
  if (!process.env.RESEND_API_KEY || !emails.length) return 0;
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    try {
      const r = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (r.ok) { const d = await r.json().catch(() => null); sent += Array.isArray(d?.data) ? d.data.length : chunk.length; }
      else console.log('[resend batch] HTTP', r.status, (await r.text().catch(() => '')).slice(0, 200));
    } catch (e) { console.log('[resend batch] failed:', e.message); }
    if (i + 100 < emails.length) await new Promise(res => setTimeout(res, 400));
  }
  return sent;
}

// FINGERPRINT_V175_PICKS_OPEN_EMAIL / FINGERPRINT_V176_TEAM_AUTOSYNC
// "Picks are open" email for one session, to every entry in one pool. Sends at most once per
// session per pool (tracked in pool:{id}:teamnotified), and never after the session has locked.
// Used by the commissioner's manual save AND by the automatic poster, so both send the same email.
async function srvNotifyPicksOpen(poolId, ev, year, sk, sessNow) {
  let emailed = 0;
  if (!sessNow || srvSessionLocked(sessNow) || !process.env.RESEND_API_KEY) return 0;
  const notifKey = k(poolId, 'teamnotified');
  let notified = {};
  try { const r = await redis('GET', notifKey); if (r) notified = JSON.parse(r); } catch {}
  const tag = `${ev}_${year}_${sk}`.toLowerCase();
  if (notified[tag]) return 0;
  const esc = (x) => String(x || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LABEL = { thu:'Thursday', fri:'Friday', friam:'Friday morning', fripm:'Friday afternoon',
                  satam:'Saturday morning', satpm:'Saturday afternoon', sun:'Sunday singles' };
  const FMT = { fourball:'four-ball', foursomes:'foursomes', singles:'singles' };
  const label = (LABEL[sk] || sk).replace(/ singles$/, '') + (sessNow.format && !(sk === 'sun' && sessNow.format === 'singles') ? ` ${FMT[sessNow.format]}` : (sk === 'sun' ? ' singles' : ''));
  const other = /ryder/i.test(ev) ? 'Europe' : 'International';
  const lockTxt = new Date(srvNextOpenLockMs(sessNow) || sessNow.lockAt).toLocaleString('en-US',
    { timeZone:'America/New_York', weekday:'long', hour:'numeric', minute:'2-digit' }) + ' ET';
  const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
  const rows = sessNow.matches.map((m, i) =>
    `<tr><td style="padding:6px 8px;color:#888;font-size:12px">${i+1}</td>` +
    `<td style="padding:6px 8px">🇺🇸 ${esc(m.usa.join(' & '))}</td>` +
    `<td style="padding:6px 4px;color:#aaa">v</td>` +
    `<td style="padding:6px 8px">${esc(m.intl.join(' & '))}</td></tr>`).join('');
  // Mark first, so two overlapping calls (manual save + auto-poster) can't double-send.
  notified[tag] = new Date().toISOString();
  await redis('SET', notifKey, JSON.stringify(notified));
  const entries = await getEntries(poolId);
  const targets = entries.filter(e => e.email);
  // FINGERPRINT_V190_BATCH — one Resend batch request (≤100 emails) instead of bursts of single sends:
  // Resend allows 5 requests/second with no burst, so bursts of 6 were silently rejected.
  const emails = targets.map(e => ({
      from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
      to: e.email,
      subject: `${ev}: ${label} pairings are out — make your picks ⛳`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2a3a1e">
          <h2 style="margin:0 0 6px">${esc(label)} pairings are out</h2>
          <p style="margin:0 0 14px">Hi ${esc(e.name)} — pick the winner of each match. Each match locks at its tee time — the first at <b>${esc(lockTxt)}</b>.</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">
            <tr style="background:#f4f4ef"><td></td><td style="padding:6px 8px;font-weight:700">USA</td>
              <td></td><td style="padding:6px 8px;font-weight:700">${other}</td></tr>
            ${rows}
          </table>
          <p><a href="${srvMagicLink(poolUrl, poolId, e, 'picks')}" style="background:#1a2a5c;color:#fff;padding:11px 22px;text-decoration:none;border-radius:6px;display:inline-block">Make your picks →</a></p>
          <p style="font-size:13px;color:#666;margin-top:18px">Your entry: <b>${esc(e.name)}</b> — the button signs you straight in.</p>
          <p style="font-size:12px;color:#999">1 pt per correct pick · a halved match gives ½ to everyone who picked it.</p>
        </div>`,
}));
  emailed = await srvResendBatch(emails);
  // FINGERPRINT_V193_PUSH — and a notification to every entry that has them turned on
  try {
    const first = new Date(srvNextOpenLockMs(sessNow) || sessNow.lockAt).toLocaleString('en-US',
      { timeZone:'America/New_York', hour:'numeric', minute:'2-digit' }) + ' ET';
    await srvPushMany(poolId, entries.map(e => ({ name: e.name, payload: {
      title: `${label} pairings are out ⛳`,
      body: `Make your picks — the first match locks at ${first}.`,
      url: `${poolUrl}?tab=picks`, tag: `open-${tag}` }, type: 'picksOpen' })));
  } catch (e) { console.log('[push] picks-open failed:', e.message); }
  return emailed;
}
// FINGERPRINT_V176_TEAM_AUTOSYNC
// Fully automatic posting. The droplet scrapes DataGolf's live-model page every 5 minutes and sends
// each session's text here. A session is posted only if EVERY guard passes — otherwise nothing is
// posted and the commissioner is emailed. Lock times are the official first tees (UTC).
// 2026 Presidents Cup, Medinah (CDT = UTC-5): Thu 11:35, Fri 1:05p, Sat 7:02a / 1:15p, Sun 11:02 CT.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// BUILT (v192 backend / v270 page): per-match locks + a late-pairings grace window — see
// FINGERPRINT_V192_MATCH_LOCKS. Origin: 2026 Presidents Cup Sat PM, DataGolf posted the pairings at 2:12 PM ET
// for a 2:15 lock. Each match now locks at its own tee, never sooner than 15 min after its session was posted
// (capped at tee + 15); live score and win chance are hidden while a teed-off match is still open; picks are
// revealed per match. Posting from Admin as soon as pairings are announced still gets players the most time.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SRV_TEAM_SCHEDULE = {
  'presidents cup_2026': {
    thu:   { lockAt: '2026-09-24T16:35:00Z', count: 5,  size: 2 },
    fri:   { lockAt: '2026-09-25T18:05:00Z', count: 5,  size: 2 },
    satam: { lockAt: '2026-09-26T12:02:00Z', count: 4,  size: 2 },
    satpm: { lockAt: '2026-09-26T18:15:00Z', count: 4,  size: 2 },
    sun:   { lockAt: '2026-09-27T16:02:00Z', count: 12, size: 1 },
  },
};
function srvTeamScheduleFor(ev, year) {
  const n = (ev || '').toLowerCase();
  const key = Object.keys(SRV_TEAM_SCHEDULE).find(kk => { const [nm, y] = kk.split('_'); return n.includes(nm) && +y === year; });
  return key ? SRV_TEAM_SCHEDULE[key] : null;
}
// Same segmentation as the admin paste button, plus AMBIGUITY detection: a surname shared by two
// rostered players (the two Kims) is only certain when both land in the same match.
function srvParseMatchText(text, roster) {
  const norm = (x) => String(x || '').toUpperCase().replace(/[^A-Z]/g, '');
  const dict = new Map();
  roster.forEach(p => {
    const w = p.name.split(/\s+/).filter(Boolean);
    // FINGERPRINT_V186_NAME_ORDERS — DataGolf's desktop layout writes USA players surname-first
    // ("SCHEFFLER SCOTTIE") and the other side first-name-first ("MIN WOO LEE"); the phone layout shows
    // surnames only. Accept all three. Full names also settle shared surnames (the two Kims) exactly.
    new Set([norm(w[w.length - 1]), norm(w.slice(-2).join('')), norm(p.name),
             norm(w[w.length - 1] + w.slice(0, -1).join(''))]).forEach(kk => {
      if (kk.length >= 2) { if (!dict.has(kk)) dict.set(kk, []); dict.get(kk).push(p); }
    });
  });
  const used = new Set(), matches = [], keyUse = new Map();
  // only sections with THRU are match rows (skips each match's hidden "Match Preview" popup)
  String(text || '').split(/MATCH\s*PREVIEW/i).slice(1).filter(c => /THRU/i.test(c)).forEach((chunk, mi) => {
    const blob = norm(chunk.split(/THRU/i)[0]);
    const best = Array(blob.length + 1).fill(null); best[0] = [];
    for (let i = 0; i < blob.length; i++) {
      if (!best[i]) continue;
      for (const kk of dict.keys()) if (blob.startsWith(kk, i)) {
        const c = [...best[i], kk], j = i + kk.length;
        if (!best[j] || best[j].length > c.length) best[j] = c;
      }
    }
    const seg = best[blob.length];
    if (!seg) { matches.push(null); return; }
    const players = [];
    for (const kk of seg) {
      const cand = dict.get(kk);
      if (cand.length > 1) { if (!keyUse.has(kk)) keyUse.set(kk, []); keyUse.get(kk).push(mi); }
      const pick = cand.find(x => !used.has(x.name) && !players.includes(x)) || cand[0];
      players.push(pick); used.add(pick.name);
    }
    matches.push({ usa: players.filter(x => x.country === 'USA').map(x => x.name),
                   intl: players.filter(x => x.country !== 'USA').map(x => x.name) });
  });
  const ambiguous = new Set();
  for (const [kk, uses] of keyUse) {
    const sameMatch = uses.every(u => u === uses[0]);
    if (!(sameMatch && uses.length === dict.get(kk).length)) uses.forEach(u => ambiguous.add(u + 1));
  }
  return { matches, ambiguous: [...ambiguous].sort((a, b) => a - b) };
}
// FINGERPRINT_V180_LIVE_STATUS
// Read "thru N" and the margin from a match that's in progress. DataGolf's text can run numbers
// together ("THRU F4 & 3" on finished matches), so "THRU 142 UP" must be split by what's POSSIBLE:
// thru 1–18, margin 1–10 and never more than the holes played. If more than one reading fits (or
// none), return null and the page simply shows "In progress". Leader side comes from the flag.
function srvLiveStatus(block, flagsTrusted) {
  if (!block || block.final) return null;
  const t = String(block.text || '').replace(/\s+/g, ' ');
  const mm = t.match(/THRU\s*([0-9][^L]*?)(?:LIVE|$)/i);
  if (!mm) return null;
  const s = mm[1].replace(/[\s—–-]+/g, '').toUpperCase();          // e.g. "142UP", "9AS", "0"
  if (/^0(?!\d)/.test(s)) return null;                                // not started
  const cands = [];
  for (const k of [1, 2]) {
    const thru = +s.slice(0, k), rem = s.slice(k);
    if (!(thru >= 1 && thru <= 18) || s.length < k) continue;
    if (/^(AS|ALLSQUARE|A\/S)/.test(rem)) cands.push({ thru, margin: 0 });
    const up = rem.match(/^([1-9]\d?)UP/);                        // a margin never has a leading zero
    if (up) { const mg = +up[1]; if (mg >= 1 && mg <= Math.min(thru, 10)) cands.push({ thru, margin: mg }); }
  }
  if (cands.length !== 1) return null;
  const f = block.flags || {}, u = (f.USA || 0) > 0, i = (f.INT || 0) > 0;
  const leader = cands[0].margin && flagsTrusted && u !== i ? (u ? 'USA' : 'INT') : null;
  return { ...cands[0], leader };
}

// FINGERPRINT_V183_SESSION_FORMAT — DataGolf prints "SESSION FORMAT: FOURBALLS" above each session's
// matches, and the scraper already sends that part of the page. Only trusted when the same scrape
// also read that session's OWN matches (otherwise the page may still be showing another session).
function srvSessionFormat(sessionScrape) {
  if (!sessionScrape || !/MATCH\s*PREVIEW/i.test(sessionScrape.text || '')) return null;
  const plain = String(sessionScrape.html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const m = plain.match(/SESSION\s*FORMAT:?\s*(FOUR[\s-]*BALLS?|FOUR[\s-]*SOMES|SINGLES)/i);
  if (!m) return null;
  const f = m[1].toUpperCase().replace(/[\s-]/g, '');
  return f.startsWith('FOURBALL') ? 'fourball' : f.startsWith('FOURSOME') ? 'foursomes' : 'singles';
}

// FINGERPRINT_V184_MATCH_PROB — DataGolf's win probability for a match that isn't finished:
// "LIVE PROBABILITY 56.2%31.6%HALVE: 12.2%" → USA 56.2, other side 31.6, halve 12.2. The first number
// is the USA side (names are listed USA first, and it matches DataGolf making the USA favourites).
// Accepted only if the three add up to ~100, so a misread can never produce nonsense.
function srvMatchProb(block) {
  if (!block || block.final) return null;
  const t = String(block.text || '').replace(/\s+/g, ' ');
  const m = t.match(/PROBABILITY\s*([\d.]+)\s*%\s*([\d.]+)\s*%\s*HALVE:?\s*([\d.]+)\s*%/i);
  if (!m) return null;
  const usa = +m[1], intl = +m[2], halve = +m[3];
  if (![usa, intl, halve].every(Number.isFinite) || Math.abs(usa + intl + halve - 100) > 1.5) return null;
  return { usa, intl, halve };
}

// FINGERPRINT_V187_MATCH_ROWS — the scraper now reads each match row's own markup: players' DataGolf IDs,
// "THRU 3", the scorebox ("1UP" / "AS" / "4&3" / "HALVED") and which side DataGolf's win caret points at
// (usa-win-caret / eur-win-caret) — that caret is how the page marks the leader, and the winner at the end.
function srvRowState(row) {
  const thru = String(row?.thru || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const score = String(row?.score || '').toUpperCase().replace(/\s+/g, '');
  const final = /THRU\s*F\b/.test(thru) || thru === 'F' || /&/.test(score) || /HALVED/.test(score);
  const sq = /^(AS|A\/S|ALLSQUARE)$/.test(score);
  const up = (score.match(/^(\d{1,2})UP/) || [])[1];
  return { final, halved: /HALVED/.test(score) || (final && sq), holes: +(thru.match(/THRU\s*(\d{1,2})/) || [])[1] || 0,
           margin: sq ? 0 : (up ? +up : null), lead: row?.lead === 'USA' || row?.lead === 'INT' ? row.lead : null };
}

// FINGERPRINT_V189_FINAL_SCORE — the margin a finished match was won by, as DataGolf shows it:
// "4 & 3" → "4&3", "1UP" → "1 UP". Halved matches have none.
function srvFinalScore(score) {
  const s = String(score || '').toUpperCase().replace(/\s+/g, '');
  if (/^\d{1,2}&\d{1,2}$/.test(s)) return s;
  const up = s.match(/^(\d{1,2})UP$/);
  return up ? `${up[1]} UP` : null;
}

async function srvTeamRoster() {
  const r = await fetch(`https://feeds.datagolf.com/field-updates?tour=pga&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
    { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('field-updates ' + r.status);
  const d = await r.json();
  // Names built exactly as the pool page builds its field ("Last, First" → "First Last")
  const roster = (d.field || []).filter(p => p.player_name).map(p => ({
    name: p.player_name.includes(',') ? p.player_name.split(',').reverse().map(x => x.trim()).join(' ') : p.player_name,
    country: p.country || '', dg_id: +p.dg_id || null }));
  return { event: d.event_name || '', roster };
}
// FINGERPRINT_V179_TEAM_SUPERVISOR — SCAN + a single MGET (2 Redis commands however many pools),
// since the droplet now asks this every 5 minutes all year and Upstash is on the free tier.
async function srvTeamEventPools() {
  const keys = []; let cursor = '0'; let guard = 0;
  do {
    const res = await redis('SCAN', cursor, 'MATCH', 'pool:*:meta', 'COUNT', '500');
    if (!Array.isArray(res) || res.length !== 2) break;
    cursor = String(res[0]);
    keys.push(...(res[1] || []));
  } while (cursor !== '0' && ++guard < 50);
  if (!keys.length) return [];
  const vals = await redis('MGET', ...keys);
  const pools = [];
  (vals || []).forEach((raw, ix) => {
    try {
      const m = JSON.parse(raw);
      if (srvIsTourMode(m?.major) && srvIsTeamEvent(m?.currentPgatourEvent)) pools.push({ poolId: keys[ix].split(':')[1], meta: m });
    } catch {}
  });
  return pools;
}
async function srvAlertCommissioners(pools, tag, subject, html) {
  if (!process.env.RESEND_API_KEY) return;
  let sent = {};
  try { const r = await redis('GET', 'teamauto:alerts'); if (r) sent = JSON.parse(r); } catch {}
  if (sent[tag]) return;                     // each distinct problem alerts once, not every 5 minutes
  sent[tag] = new Date().toISOString();
  await redis('SET', 'teamauto:alerts', JSON.stringify(sent));
  const to = [...new Set(pools.map(p => p.meta?.commissionerEmail).filter(Boolean))];
  await Promise.all(to.map(addr => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Tuna Golf Pool <noreply@tunagolfpool.com>', to: addr, subject,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">${html}</div>` }),
  }).catch(() => {})));
}

// FINGERPRINT_V181_ARCHIVE_DETAIL — what a pick'em archive keeps: each entry's final score, the
// event's matches with results, and this pool's picks (only for entries in the pool), so History can
// show the cup score and each entry's picks session by session — not just a total.
async function srvTeamArchive(poolId, eventName, entries) {
  const [matches, picks] = await Promise.all([srvGetTeamMatches(eventName), srvGetTeamPicks(poolId, eventName)]);
  const entryTotals = {}, teamPicks = {};
  (entries || []).forEach(e => { entryTotals[e.name] = srvMatchScore(picks[e.name], matches); if (picks[e.name]) teamPicks[e.name] = picks[e.name]; });
  const teamMatches = {};
  for (const [sk, sv] of Object.entries(matches || {}))
    teamMatches[sk] = { lockAt: sv.lockAt, matches: (sv.matches || []).map(m => ({ id: m.id, usa: m.usa, intl: m.intl, result: m.result || null })) };
  return { entryTotals, teamMatches, teamPicks };
}
// FINGERPRINT_V190_PICK_REMINDERS — about an hour before a session locks, email each entry that hasn't
// finished picking it. At most once per entry per session (tracked in pool:{id}:teamreminded); never
// to anyone who's done; nothing once the session has locked.
async function srvSendPickReminders(pools, ev, year, all) {
  if (!process.env.RESEND_API_KEY) return 0;
  const now = Date.now(), WINDOW = 60 * 60 * 1000;
  const due = Object.entries(all || {}).filter(([, sv]) => {
    const t = srvNextOpenLockMs(sv);
    return t && t - now <= WINDOW && (sv.matches || []).length;
  });
  if (!due.length) return 0;
  const esc = (x) => String(x || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LABEL = { thu:'Thursday', fri:'Friday', friam:'Friday morning', fripm:'Friday afternoon',
                  satam:'Saturday morning', satpm:'Saturday afternoon', sun:'Sunday singles' };
  let sent = 0;
  for (const pl of pools) {
    const remKey = k(pl.poolId, 'teamreminded');
    let rem = {};
    try { const r = await redis('GET', remKey); if (r) rem = JSON.parse(r); } catch {}
    const [entries, picks] = await Promise.all([getEntries(pl.poolId), srvGetTeamPicks(pl.poolId, ev)]);
    const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${pl.poolId}`;
    const jobs = [], pushes = [];
    for (const [sk, sv] of due) {
      const tag = `${ev}_${year}_${sk}`.toLowerCase();
      const done = rem[tag] = rem[tag] || {};
      const ids = new Set(sv.matches.map(m => m.id)), total = ids.size;
      const lockTxt = new Date(srvNextOpenLockMs(sv) || sv.lockAt).toLocaleString('en-US', { timeZone:'America/New_York', hour:'numeric', minute:'2-digit' }) + ' ET';
      const openIds = sv.matches.filter(m => !srvMatchLocked(sv, m)).map(m => m.id);
      const label = LABEL[sk] || sk;
      for (const e of entries) {
        if (!e.email || done[e.name]) continue;
        const mine = (picks[e.name] || {})[sk] || {};
        const n = Object.keys(mine).filter(id => ids.has(id)).length;
        if (!openIds.some(id => !mine[id])) continue;      // nothing left for them to pick
        done[e.name] = new Date().toISOString();        // mark first — never double-send
        pushes.push({ name: e.name, payload: {
          title: `⏰ ${label} locks soon`,
          body: `You've picked ${n} of ${total} — the next match locks at ${lockTxt}.`,
          url: `${poolUrl}?tab=picks`, tag: `rem-${tag}` }, type: 'pickReminder' });
        jobs.push({
            from: 'Tuna Golf Pool <noreply@tunagolfpool.com>', to: e.email,
            subject: `⏰ ${ev}: ${label} locks at ${lockTxt} — you've picked ${n} of ${total}`,
            html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2a3a1e">
              <h2 style="margin:0 0 6px">${esc(label)} picks lock in about an hour</h2>
              <p>Hi ${esc(e.name)} — you've picked <b>${n} of ${total}</b> ${esc(label)} matches. Picks lock at <b>${esc(lockTxt)}</b>,
                and any match you haven't picked scores nothing.</p>
              <p><a href="${srvMagicLink(poolUrl, pl.poolId, e, 'picks')}" style="background:#1a2a5c;color:#fff;padding:11px 22px;text-decoration:none;border-radius:6px;display:inline-block">Make your picks →</a></p>
              <p style="font-size:13px;color:#666;margin-top:18px">Your entry: <b>${esc(e.name)}</b> — the button signs you straight in.</p>
            </div>` });
      }
    }
    await redis('SET', remKey, JSON.stringify(rem));
    sent += await srvResendBatch(jobs);
    try { await srvPushMany(pl.poolId, pushes); } catch (e) { console.log('[push] reminders failed:', e.message); }
  }
  return sent;
}

async function srvTeamEntryTotals(poolId, eventName, entries) {
  const [matches, picks] = await Promise.all([srvGetTeamMatches(eventName), srvGetTeamPicks(poolId, eventName)]);
  const totals = {};
  (entries || []).forEach(e => { totals[e.name] = srvMatchScore(picks[e.name], matches); });
  return totals;
}

async function srvRequiredPicks(poolId) {
  try {
    const raw = await redis('GET', k(poolId, 'meta'));
    if (!raw) return 10;
    const meta = JSON.parse(raw);
    const evName = srvIsTourMode(meta.major)
      ? (meta.currentPgatourEvent || '')
      : (meta.major === 'tourchamp' ? 'tour championship' : '');
    if (srvIsTeamEvent(evName)) return 0;   // FINGERPRINT_V173 — match pick'em: no player picks
    return srvIsTourChampionship(evName) ? 6 : 10;
  } catch { return 10; }
}

// FINGERPRINT_V161_SRV_TOUR_CHAMP_EXACT — $40M, 30 players, winner $10M (25%). Exact ladder.
const SRV_PAYOUT_TOUR_CHAMP = {
  1:0.25,2:0.125,3:0.092625,4:0.08,5:0.06875,6:0.0475,7:0.035,8:0.026625,9:0.0225,10:0.018375,
  11:0.017375,12:0.0165,13:0.015625,14:0.01475,15:0.014,16:0.012625,17:0.01225,18:0.011875,19:0.0115,20:0.011125,
  21:0.01075,22:0.010375,23:0.01,24:0.00975,25:0.0095,26:0.009375,27:0.00925,28:0.009125,29:0.009,30:0.008875
};
function srvIsTourChampionship(eventName){ return (eventName||'').toLowerCase().includes('tour championship'); }
// FINGERPRINT_V152_SRV_SCOTTISH — Genesis Scottish Open (co-sanctioned): $9M, 17.5% winner, pays to 90.
const SRV_PAYOUT_SCOTTISH = {
  1:0.175,2:0.1095,3:0.06565,4:0.049,5:0.0415,6:0.0358,7:0.03195,8:0.0282,9:0.0259,10:0.0237,
  11:0.0219,12:0.02025,13:0.0187,14:0.0173,15:0.0165,16:0.0157,17:0.0149,18:0.0141,19:0.01335,20:0.01265,
  21:0.01195,22:0.0114,23:0.01085,24:0.0103,25:0.00975,26:0.0092,27:0.0089,28:0.0086,29:0.0083,30:0.008,
  31:0.0077,32:0.0074,33:0.0071,34:0.006825,35:0.00655,36:0.006275,37:0.00605,38:0.00585,39:0.00565,40:0.00545,
  41:0.00525,42:0.00505,43:0.00485,44:0.00465,45:0.00445,46:0.00425,47:0.00405,48:0.00387,49:0.0037,50:0.00356,
  51:0.00343,52:0.0033,53:0.00318,54:0.00306,55:0.003,56:0.00294,57:0.00288,58:0.00282,59:0.00276,60:0.0027,
  61:0.00264,62:0.00258,63:0.00252,64:0.00246,65:0.0024,66:0.0022,67:0.00218,68:0.00216,69:0.00214,70:0.00212,
  71:0.0021,72:0.00208,73:0.00206,74:0.00204,75:0.00202,76:0.002,77:0.00198,78:0.00196,79:0.00194,80:0.00192,
  81:0.0019,82:0.00188,83:0.00186,84:0.00184,85:0.00182,86:0.0018,87:0.00178,88:0.00176,89:0.00174,90:0.00172
};
function srvIsScottishOpen(eventName){ return (eventName||'').toLowerCase().includes('scottish open'); }
function srvIsSignature(eventName, purse) {
  const n = (eventName||'').toLowerCase();
  if (SRV_SIGNATURE_KEYS.some(k => n.includes(k))) return true;
  if (purse && purse >= 15000000) return true;
  return false;
}
function srvIsNoCutSignature(eventName) {
  const n = (eventName||'').toLowerCase();
  return SRV_NOCUT_KEYS.some(k => n.includes(k));
}
function srvNormalizeName(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[.,'']/g,'').replace(/\s+/g,' ').trim();
}
function srvNameVariants(dgName) {
  const variants = new Set();
  const raw = (dgName||'').trim();
  if (!raw) return variants;
  variants.add(srvNormalizeName(raw));
  if (raw.includes(',')) {
    const [last, first] = raw.split(',').map(s=>s.trim());
    if (first && last) {
      variants.add(srvNormalizeName(`${first} ${last}`));
      variants.add(srvNormalizeName(`${last} ${first}`));
    }
  } else {
    const parts = raw.split(' ');
    if (parts.length >= 2) {
      const last = parts[parts.length-1];
      const first = parts.slice(0,-1).join(' ');
      variants.add(srvNormalizeName(`${last}, ${first}`));
      variants.add(srvNormalizeName(`${last} ${first}`));
    }
  }
  return variants;
}
function srvParsePos(pos) {
  if (pos == null) return null;
  const s = String(pos).replace(/^T/i,'').trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}
function srvComputeEarnings(players, purse, eventName, major) {
  const useSig = srvIsSignature(eventName, purse);
  // FINGERPRINT_V145_SRV_NOCUT / FINGERPRINT_V148_SRV_TOURCHAMP
  // Tour Championship has its own 25% table; else no-cut (Sentry/Travelers/St.Jude/BMW) vs cut sig.
  let table;
  if (major === 'dpworld') {
    // FINGERPRINT_V165_DPWORLD — DP World uses one fixed 17%-winner ladder for every event.
    table = SRV_PAYOUT_DPWORLD;
  } else if (useSig && srvIsTourChampionship(eventName)) {
    table = SRV_PAYOUT_TOUR_CHAMP;
  } else if (useSig && srvIsBMW(eventName)) {
    // FINGERPRINT_V160_SRV_BMW — 50-player playoff field, distinct from generic no-cut signature.
    table = SRV_PAYOUT_BMW;
  } else if (useSig && srvIsStJude(eventName)) {
    // FINGERPRINT_V162_SRV_ST_JUDE — 70-player playoff field, own distribution.
    table = SRV_PAYOUT_ST_JUDE;
  } else if (useSig) {
    table = srvIsNoCutSignature(eventName) ? SRV_PAYOUT_SIGNATURE_NOCUT : SRV_PAYOUT_SIGNATURE;
  } else if (srvIsScottishOpen(eventName)) {
    // FINGERPRINT_V152_SRV_SCOTTISH — co-sanctioned: 17.5% winner, pays to 90.
    table = SRV_PAYOUT_SCOTTISH;
  } else {
    table = SRV_PAYOUT_PGATOUR;
  }
  const maxPos = Math.max(...Object.keys(table).map(Number));
  const g = {};
  players.forEach(p => {
    const posRaw = String(p.current_pos || p.pos || '');
    if (/CUT|WD|DQ|MC/i.test(posRaw)) return;
    const pos = srvParsePos(posRaw);
    if (!pos || pos > maxPos) return;
    if (!g[pos]) g[pos] = [];
    g[pos].push(p);
  });
  const earnings = {};
  Object.entries(g).forEach(([ps, pls]) => {
    const pos = +ps;
    let total = 0;
    for (let i = 0; i < pls.length; i++) total += table[pos + i] || 0;
    const each = Math.round(total / pls.length * purse);
    pls.forEach(p => {
      const nm = p.player_name || p.name || '';
      srvNameVariants(nm).forEach(v => { earnings[v] = each; });
    });
  });
  return earnings;
}
function srvEarningsByPick(entries, earningsMap) {
  const out = {};
  (entries||[]).forEach(e => {
    (e.picks||[]).forEach(pick => {
      const key = srvNormalizeName(pick);
      out[pick] = earningsMap[key] != null ? earningsMap[key] : 0;
    });
  });
  return out;
}
// ──────────────────────────────────────────────────────────────────────────────

// ─── Major Schedule — calculated dynamically, works forever ──────────────────
const UNLOCK_DAYS_BEFORE = 7;

function nthWeekday(year, month, weekday, n) {
  const d = new Date(Date.UTC(year, month, 1));
  let count = 0;
  while (d.getMonth() === month) {
    if (d.getUTCDay() === weekday) { count++; if (count === n) return new Date(d); }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return null;
}

function buildFallbackSchedule(year) {
  const THU = 4;
  const majors = [
    { key:'players', month:2, nth:2, hour:12 },
    { key:'masters', month:3, nth:2, hour:11 },
    { key:'pga',     month:4, nth:2, hour:11 },
    { key:'usopen',  month:5, nth:3, hour:11 },
    { key:'open',    month:6, nth:3, hour:5  },
  ];
  const now = Date.now();
  return majors.map(({ key, month, nth, hour }) => {
    // FINGERPRINT_V158_ROLL_PAST_MAJORS
    // Use next year's date for any major whose current-year running is already OVER. Otherwise a
    // past-dated major keeps endTime in the past, so autoManage sees "tournament over" on every
    // request and re-fires the Tuesday rotation — advancing the major on each refresh. Rolling the
    // date forward puts endTime in the future so the pool holds steady on the upcoming edition.
    let y = year;
    let thu = nthWeekday(y, month, THU, nth);
    if (thu) {
      const end = new Date(thu); end.setUTCDate(end.getUTCDate() + 5);
      if (end.getTime() < now) { y = year + 1; thu = nthWeekday(y, month, THU, nth); }
    }
    if (!thu) return null;
    const teeTime = new Date(thu); teeTime.setUTCHours(hour, 0, 0, 0);
    const endDate = new Date(thu); endDate.setUTCDate(endDate.getUTCDate() + 5); endDate.setUTCHours(12, 0, 0, 0);
    return { key, teeTime: teeTime.toISOString(), endDate: endDate.toISOString() };
  }).filter(Boolean);
}

const DG_EVENT_IDS = { 11:'players', 14:'masters', 33:'pga', 26:'usopen', 100:'open' };

async function getMajorSchedule() {
  const year = new Date().getFullYear();
  const fallback = buildFallbackSchedule(year);
  try {
    const res = await fetch(
      `https://feeds.datagolf.com/get-schedule?tour=pga&season=${year}&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
      { cache:'no-store', signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error('schedule fetch failed');
    const data = await res.json();
    const events = data.schedule || data.events || data || [];
    const apiMap = {};
    for (const ev of events) {
      const majorKey = DG_EVENT_IDS[ev.event_id];
      if (!majorKey || !ev.start_date) continue;
      const teeTime = `${ev.start_date}T11:00:00Z`;
      const end = ev.end_date || ev.start_date;
      const endDate = new Date(new Date(end).getTime() + 2*24*60*60*1000).toISOString().slice(0,10) + 'T12:00:00Z';
      // FINGERPRINT_V158_ROLL_PAST_MAJORS — ignore an API event whose running is already over; the
      // rolled fallback (next year's date) is the correct "next" edition to schedule against.
      if (new Date(endDate).getTime() < Date.now()) continue;
      apiMap[majorKey] = { key: majorKey, teeTime, endDate };
    }
    return fallback.map(fb => apiMap[fb.key] || fb);
  } catch {
    return fallback;
  }
}

// ─── Redis helpers ────────────────────────────────────────────────────────────
async function redis(cmd, ...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([cmd, ...args]),
    cache: 'no-store',
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Redis ${res.status}: ${t}`); }
  return (await res.json()).result;
}

// ─── Per-pool key helpers ─────────────────────────────────────────────────────
const k = (poolId, key) => `pool:${poolId}:${key}`;

async function getEntries(pid)     { try { const r=await redis('GET',k(pid,'entries'));     return r?JSON.parse(r):[]; } catch { return []; } }
async function saveEntries(pid,e)  { await redis('SET',k(pid,'entries'),JSON.stringify(e)); }
async function getLocked(pid)      { try { return (await redis('GET',k(pid,'locked')))==='true'; } catch { return false; } }
async function getPicksHidden(pid) { try { const r=await redis('GET',k(pid,'picks_hidden')); return r===null?true:r==='true'; } catch { return true; } }
async function getPaymentsHidden(pid) { try { return (await redis('GET',k(pid,'payments_hidden')))==='true'; } catch { return false; } }
async function getPayments(pid)    { try { const r=await redis('GET',k(pid,'payments')); return r?JSON.parse(r):{}; } catch { return {}; } }
async function savePayments(pid,p) { await redis('SET',k(pid,'payments'),JSON.stringify(p)); }
async function getMajor(pid)       { try { const r=await redis('GET',k(pid,'major')); return VALID_MAJORS.includes(r)?r:'pga'; } catch { return 'pga'; } }
async function getPoolMeta(pid)    { try { const r=await redis('GET',k(pid,'meta')); return r?JSON.parse(r):null; } catch { return null; } }

// FINGERPRINT_V141_ROSTER
// Persistent player roster — accumulates {name,email,editCode,lastSeen} across ALL events.
// Never cleared on rotation (separate key), so the commissioner can invite past players to the
// next week's pool. Keyed by lowercased email so the same person stays one entry week to week.
async function getRoster(pid)      { try { const r=await redis('GET',k(pid,'roster')); return r?JSON.parse(r):[]; } catch { return []; } }
async function saveRoster(pid,r)   { await redis('SET',k(pid,'roster'),JSON.stringify(r)); }
async function upsertRoster(pid, name, email, editCode) {
  if (!email) return;
  try {
    const roster = await getRoster(pid);
    const em = email.trim().toLowerCase();
    const idx = roster.findIndex(p => p.email === em);
    const rec = { name: name?.trim()||'', email: em, editCode: editCode||null, lastSeen: Date.now() };
    if (idx >= 0) roster[idx] = { ...roster[idx], ...rec }; else roster.push(rec);
    await saveRoster(pid, roster);
  } catch (e) { console.error('roster upsert failed:', e.message); }
}

// ─── Auto-manage per pool ─────────────────────────────────────────────────────
async function autoManage(poolId) {
  try {
    const now = Date.now();

    // ── Auto-delete abandoned unpaid pools older than 24 hours ────────────────
    // Only deletes pools that have NEVER been paid (no paidAt history).
    // Pools that paid for a previous event and need to repay for current event are NOT deleted.
    const meta = await getPoolMeta(poolId);
    if (meta && !meta.paid && !meta.paidAt && !meta.everPaid) {
      const age = now - new Date(meta.createdAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        const keys = ['meta','entries','payments','locked','picks_hidden','major'];
        await Promise.all(keys.map(k2 => redis('DEL', `pool:${poolId}:${k2}`)));
        await redis('SREM', 'pools:index', poolId);
        console.log(`[autoManage] Deleted abandoned pool ${poolId} (never paid)`);
        return null;
      }
    }

    // ── PGA Tour Mode: weekly auto-rotation, mirrors major rotation logic ─────
    const _curMajorKey = await redis('GET', `pool:${poolId}:major`);
    if (meta?.pgaTourMode || srvIsTourMode(_curMajorKey)) {
      // FINGERPRINT_V165_DPWORLD — which tour this pool is running (pgatour | dpworld)
      const tourKey = srvIsTourMode(meta?.major) ? meta.major : (srvIsTourMode(_curMajorKey) ? _curMajorKey : 'pgatour');
      try {
        const year = new Date().getFullYear();
        const schedRes = await fetch(
          `https://feeds.datagolf.com/get-schedule?tour=${srvTour(tourKey)}&season=${year}&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (!schedRes.ok) return tourKey;
        const schedData = await schedRes.json();
        const events = (schedData.schedule || schedData.events || []).filter(e => e.start_date);

        // Find what event was active when this pool was last paid
        // We track the active event name on meta.currentPgatourEvent
        const ptRes = await fetch(
          `https://feeds.datagolf.com/preds/pre-tournament?tour=${srvTour(tourKey)}&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (!ptRes.ok) return tourKey;
        const ptData = await ptRes.json();
        const dgCurrentEventName = (ptData.event_name || '').toLowerCase();

        // What event did the pool last activate for? (stored when commissioner paid)
        const poolEventName = (meta?.currentPgatourEvent || '').toLowerCase();

        // First-time activation: just record current DG event and exit
        if (!poolEventName && dgCurrentEventName) {
          meta.currentPgatourEvent = ptData.event_name;
          await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
          return tourKey;
        }

        // If DataGolf's current event ≠ pool's locked-in event, time to rotate
        if (dgCurrentEventName && poolEventName && dgCurrentEventName !== poolEventName) {
          // Allow rotation under either condition:
          //   (A) Tuesday morning 6-11 AM ET (default safe window)
          //   (B) The prior event is definitively concluded per in-play (all leaders done, no live data)
          const nowDate = new Date(now);
          const etHour = (nowDate.getUTCHours() - 4 + 24) % 24;
          const isTuesday = nowDate.getUTCDay() === 2;
          const isMorning = etHour >= 6 && etHour < 12;
          const inTuesdayWindow = isTuesday && isMorning;

          // Check if prior event is fully concluded via in-play
          // Conditions: top players have R4 strokes recorded, OR in-play data is stale (>12 hr since update)
          let priorEventConcluded = false;
          let finalInPlayPlayers = null; // capture the final leaderboard for server-side earnings
          try {
            const inPlayUrl = `https://feeds.datagolf.com/preds/in-play?tour=${srvTour(tourKey)}&dead_heat=no&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`;
            const ipRes = await fetch(inPlayUrl, { cache:'no-store', signal: AbortSignal.timeout(5000) });
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              finalInPlayPlayers = ipData.data || ipData.players || [];
              // Filter to players who made the cut (have valid position, didn't WD/DQ/MC) then sort by position
              const madeCut = finalInPlayPlayers.filter(p => {
                const pos = String(p.current_pos || '').replace('T','');
                const posNum = parseInt(pos, 10);
                return !isNaN(posNum) && posNum > 0;
              });
              madeCut.sort((a, b) => {
                const ap = parseInt(String(a.current_pos||'').replace('T',''), 10) || 999;
                const bp = parseInt(String(b.current_pos||'').replace('T',''), 10) || 999;
                return ap - bp;
              });
              const topPlayers = madeCut.slice(0, 10);
              const allR4Done = topPlayers.length >= 5 && topPlayers.every(p =>
                p.R4 != null // R4 stroke count recorded (player completed R4)
              );
              // FINGERPRINT_V149_PLAYOFF_GUARD
              // A playoff is NOT over just because R4 is done: the leaders finish R4 tied, then play
              // extra holes. If 2+ players are tied at the lead (position 1 / "T1"), the winner isn't
              // decided yet — do NOT conclude/archive. DataGolf resolves the tie to a single "1" (and
              // "2", "T3", etc.) once the playoff finishes; only then is it safe to archive.
              const leadersTiedAtOne = (() => {
                const atOne = madeCut.filter(p => parseInt(String(p.current_pos||'').replace('T',''),10) === 1);
                return atOne.length > 1; // 2+ players showing position 1 = unresolved (playoff or tie for win)
              })();
              // Also check timestamp — if last_updated > 12 hours ago, event is definitely over
              const lastUpdated = ipData.last_updated ? new Date(ipData.last_updated).getTime() : 0;
              const hoursStale = (now - lastUpdated) / (1000 * 60 * 60);
              const dataIsStale = lastUpdated > 0 && hoursStale > 12;
              // Conclude only if R4 done AND the win is resolved (no tie at the top), OR data is stale.
              priorEventConcluded = (allR4Done && !leadersTiedAtOne) || dataIsStale;
              console.log(`[pgatour rotation] event ${dgCurrentEventName} ≠ pool ${poolEventName}, R4done=${allR4Done}, tiedAt1=${leadersTiedAtOne}, stale=${dataIsStale}, concluded=${priorEventConcluded}`);
            }
          } catch (e) {
            console.log('[pgatour rotation] in-play check failed:', e.message);
            priorEventConcluded = false;
          }

          if (!inTuesdayWindow && !priorEventConcluded) return tourKey;

          // Archive results for the prior event
          const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
          if (entries.length > 0) {
            const slug = poolEventName.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
            const archiveKey = k(poolId, `archive:${tourKey}-${slug}_${year}`);

            // FINGERPRINT_V34_ROTATION_EARNINGS
            // Compute earnings SERVER-SIDE from the final in-play leaderboard, so the archive is
            // correct even if no one had the pool open when the tournament finished. We still
            // prefer any earnings the frontend already saved (it has the same math), but if those
            // are missing/empty we fill them in here.
            let existing = null;
            try { const ex = await redis('GET', archiveKey); if (ex) existing = JSON.parse(ex); } catch {}
            const existingEarnings = existing?.earnings || {};
            const existingHasMoney = Object.values(existingEarnings).some(v => v > 0);

            // Resolve purse for the concluded event: admin-set pgatour purse → schedule → signature default.
            const concludedEvent = events.find(e => (e.event_name||'').toLowerCase() === poolEventName)
              || events.find(e => {
                   const en = (e.event_name||'').toLowerCase();
                   return en.includes(poolEventName) || poolEventName.includes(en);
                 });
            const schedPurse = concludedEvent?.purse || concludedEvent?.total_purse || null;
            const adminPurse = meta?.purses?.[tourKey] || meta?.purses?.pgatour || null; // commissioner-set, if any
            // FINGERPRINT_V148_SRV_TOURCHAMP — Tour Championship defaults to $40M, other signature $20M
            const sigDefault = tourKey === 'dpworld' ? 3750000
              : srvIsTourChampionship(poolEventName) ? 40000000
              : (srvIsSignature(poolEventName, schedPurse) ? 20000000 : 9000000);
            const resolvedPurse = adminPurse || schedPurse || sigDefault;

            // Compute server-side earnings (keyed by normalized name), then map to each pick.
            let earningsByPick = existingEarnings;
            const rotTeamEvent = srvIsTeamEvent(meta.currentPgatourEvent || poolEventName);
            let rotEntryTotals = null;
            if (rotTeamEvent) {
              // FINGERPRINT_V173_MATCH_PICKEM — score entries from their match picks
              rotEntryTotals = await srvTeamArchive(poolId, meta.currentPgatourEvent || poolEventName, entries);
              earningsByPick = {};
              console.log(`[pgatour rotation] team event — archived match-pick totals for ${entries.length} entries`);
            } else if (!existingHasMoney && finalInPlayPlayers && finalInPlayPlayers.length > 0) {
              const earnMap = srvComputeEarnings(finalInPlayPlayers, resolvedPurse, poolEventName, tourKey);
              earningsByPick = srvEarningsByPick(entries, earnMap);
              console.log(`[pgatour rotation] computed server-side earnings for ${Object.keys(earningsByPick).length} picks, purse=${resolvedPurse}`);
            }

            // Prize split: winner-take-all (toggle or ≤4 entries) else standard 1st/2nd/3rd.
            const fee = meta.entryFee || 0;
            const n = entries.length;
            const pot = n * fee;
            let prizes = existing?.prizes || null;
            if (!prizes && fee > 0 && n >= 1) {
              const wta = meta.payoutMode === 'winner-take-all' || n <= 4;
              prizes = wta ? {first:pot, second:0, third:0} : {first:pot-fee*3, second:fee*2, third:fee};
            }

            // Logo: build PGA Tour CDN URL from the concluded event's id (preserve existing if set).
            let logoUrl = existing?.logoUrl || null;
            let logoNoBg = existing?.logoNoBg ?? null;
            let logoHeight = existing?.logoHeight || null;
            // FINGERPRINT_V169_TOUR_LOGO
            // The Cloudinary CDN only hosts PGA TOUR event logos, and DataGolf reuses event ids
            // across tours — so building this URL for a DP World event stamped an unrelated PGA
            // Tour logo onto the archive (the Irish Open came out branded as a PGA event). Only
            // build it for the PGA Tour; DP World archives use the generic tour mark instead.
            if (!logoUrl && concludedEvent?.event_id && tourKey === 'pgatour') {
              logoUrl = `https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:R000.png/tournaments/logos/R${String(concludedEvent.event_id).padStart(3,'0')}.png`;
              logoNoBg = false; logoHeight = 80;
            } else if (!logoUrl && tourKey === 'dpworld') {
              logoUrl = '/logos/dp-world-tour.svg';
              logoNoBg = false; logoHeight = 64;
            }

            await redis('SET', archiveKey, JSON.stringify({
              major: tourKey, eventName: meta.currentPgatourEvent, year,
              ...(rotTeamEvent ? { scoring: 'matchpicks', ...rotEntryTotals } : {}),
              archivedAt: new Date().toISOString(),
              entries, payments, earnings: earningsByPick,
              entryFee: fee,
              prizes: prizes || null,
              logoUrl, logoNoBg, logoHeight,
              tournamentDate: existing?.tournamentDate || new Date().toISOString(),
              autoArchived: true,
            }));
            try { await srvSendRecap(poolId, archiveKey); } catch (e) { console.log('[recap]', e.message); }   // FINGERPRINT_V213
            console.log(`[pgatour rotation] archived ${meta.currentPgatourEvent} — ${entries.length} entries, earnings source: ${existingHasMoney?'frontend':'server-computed'}`);
          }

          // Reset pool: locked, unpaid, new event tracked
          // everPaid stays true to prevent abandoned-pool cleanup from deleting it
          meta.paid = false;
          meta.paidAt = null;
          meta.reminderSent = false;
          meta.everPaid = true;
          meta.currentPgatourEvent = ptData.event_name;
          await Promise.all([
            redis('SET', k(poolId,'meta'),         JSON.stringify(meta)),
            redis('DEL', k(poolId,'entries')),
            redis('DEL', k(poolId,'payments')),
            redis('SET', k(poolId,'locked'),       'true'),
            redis('SET', k(poolId,'picks_hidden'), 'true'),
          ]);

          // Email commissioner
          if (meta?.commissionerEmail && process.env.RESEND_API_KEY) {
            const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
                to: meta.commissionerEmail,
                subject: `Your pool is ready for ${ptData.event_name} ⛳`,
                html: `
                  <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                    <h2 style="color:#1a2a5c">${meta.poolName || 'Your Pool'}</h2>
                    <p>The PGA Tour heads to <strong>${ptData.event_name}</strong> this week. Your pool is locked until you reactivate it.</p>
                    <div style="text-align:center;margin:28px 0">
                      <a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
                        Reactivate Your Pool — $10 →
                      </a>
                    </div>
                    <p style="color:#6b7280;font-size:12px">Picks reset weekly so everyone competes fresh. Tap above to unlock for this week's event.</p>
                  </div>
                `,
              }),
            }).catch(e => console.error('pgatour rotation email failed:', e.message));
          }

          console.log(`[autoManage] PGA Tour rotation: ${poolId} → ${ptData.event_name}`);
        }
      } catch (e) {
        console.warn('[autoManage] pgatour rotation error:', e.message);
      }
      return tourKey;
    }

    const MAJOR_SCHEDULE = await getMajorSchedule();
    const currentMajor = await getMajor(poolId);
    const idx = MAJOR_SCHEDULE.findIndex(m => m.key === currentMajor);
    if (idx === -1) return currentMajor;

    const current = MAJOR_SCHEDULE[idx];
    const teeTime = new Date(current.teeTime).getTime();
    let endTime  = new Date(current.endDate).getTime();
    const unlockTime = teeTime - UNLOCK_DAYS_BEFORE * 24 * 60 * 60 * 1000;

    // SAFEGUARD: Tournament can NEVER be considered over within 4 days of tee-off
    // Prevents auto-rotation from firing mid-tournament due to bad endDate data
    const minimumEndTime = teeTime + 4 * 24 * 60 * 60 * 1000;
    if (endTime < minimumEndTime) {
      console.warn(`[autoManage] endDate ${current.endDate} is too close to teeTime ${current.teeTime} - using safeguard minimum`);
      endTime = minimumEndTime;
    }

    if (now >= endTime) {
      // STRICT WINDOW: Only fire rotation on Tuesday mornings (6 AM - 11 AM ET)
      // This prevents accidental rotations and gives commissioners a predictable schedule
      const nowDate = new Date(now);
      // Get ET hour (UTC offset is -4 in EDT, -5 in EST — May/June/July are EDT so use -4)
      const etHour = (nowDate.getUTCHours() - 4 + 24) % 24;
      const isTuesday = nowDate.getUTCDay() === 2; // 0=Sun, 1=Mon, 2=Tue
      const isMorning = etHour >= 6 && etHour < 12; // 6 AM - 11:59 AM ET
      if (!isTuesday || !isMorning) {
        // Not Tuesday morning yet — do nothing, wait for next eligible window
        return currentMajor;
      }

      const nextKey = MAJOR_SCHEDULE[(idx + 1) % MAJOR_SCHEDULE.length].key;
      const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
      if (entries.length > 0) {
        const year = new Date().getFullYear();
        const archiveKey = k(poolId, `archive:${currentMajor}_${year}`);
        let existingArc = null;
        try { const ex = await redis('GET', archiveKey); if (ex) existingArc = JSON.parse(ex); } catch {}
        const existingEarnings = existingArc?.earnings || {};
        // Get current meta before we reset for next major (fee + payout mode)
        let currentEntryFee = 0, curPayoutMode = 'standard';
        try { const m = await redis('GET', k(poolId,'meta')); if (m) { const pm=JSON.parse(m); currentEntryFee = pm.entryFee || 0; curPayoutMode = pm.payoutMode || 'standard'; } } catch {}
        // FINGERPRINT_V154_MAJOR_ARCHIVE_PRIZES
        // The major-rotation archive previously saved NO prizes (and dropped any the frontend had
        // stored), so History fell back to the entry-count heuristic — a winner-take-all pool with
        // 5+ entries rendered as a 1st/2nd/3rd split. Save the prize split at archive time using
        // the pool's payout mode, and preserve any existing archive fields instead of clobbering.
        let prizes = existingArc?.prizes || null;
        const n = entries.length;
        if (!prizes && currentEntryFee > 0 && n >= 1) {
          const pot = n * currentEntryFee;
          const wta = curPayoutMode === 'winner-take-all' || n <= 4;
          prizes = wta ? {first:pot, second:0, third:0} : {first:pot-currentEntryFee*3, second:currentEntryFee*2, third:currentEntryFee};
        }
        await redis('SET', archiveKey, JSON.stringify({
          ...(existingArc || {}),
          major: currentMajor, year,
          archivedAt: new Date().toISOString(),
          entries, payments, earnings: existingEarnings,
          entryFee: currentEntryFee,
          prizes: prizes || null,
        }));
        try { await srvSendRecap(poolId, archiveKey); } catch (e) { console.log('[recap]', e.message); }   // FINGERPRINT_V213
      }
      // Mark pool as unpaid for next major — commissioner must pay $10 to unlock
      const metaRaw = await redis('GET', k(poolId,'meta'));
      let meta = null;
      if (metaRaw) {
        meta = JSON.parse(metaRaw);
        meta.paid = false;
        meta.major = nextKey;
        meta.paidAt = null;
        meta.reminderSent = false;
        meta.everPaid = true;
        await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      }
      await Promise.all([
        redis('SET', k(poolId,'major'),        nextKey),
        redis('DEL', k(poolId,'entries')),
        redis('DEL', k(poolId,'payments')),
        redis('SET', k(poolId,'locked'),       'true'),
        redis('SET', k(poolId,'picks_hidden'), 'true'),
      ]);

      // Email commissioner about the next major
      if (meta?.commissionerEmail && process.env.RESEND_API_KEY) {
        const MAJOR_NAMES = {
          players:'The Players Championship', masters:'The Masters',
          pga:'PGA Championship', usopen:'U.S. Open', open:'The Open Championship',
          pgatour:'the current PGA Tour event', dpworld:'the current DP World Tour event',
        };
        const nextMajorName = MAJOR_NAMES[nextKey] || nextKey;
        const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
            to: meta.commissionerEmail,
            subject: `Your Golf Pool is ready for ${nextMajorName} ⛳`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="color:#1a2a5c">Hey ${meta.commissionerName}! 👋</h2>
                <p>${currentMajor === 'masters' ? 'The Masters' : MAJOR_NAMES[currentMajor] || currentMajor} is over — time to set up your pool for <strong>${nextMajorName}</strong>.</p>
                <p>Your pool URL and history are preserved. Just unlock it for $10 to open entries for your group.</p>
                <div style="text-align:center;margin:32px 0">
                  <a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
                    Unlock for ${nextMajorName} →
                  </a>
                </div>
                <p style="color:#6b7280;font-size:13px">Pool: ${meta.poolName}<br/>${poolUrl}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                <p style="color:#9ca3af;font-size:11px">Tuna Golf Pool · tunagolfpool.com</p>
              </div>
            `,
          }),
        }).catch(e => console.error('Email send failed:', e.message));
      }

      return nextKey;
    }

    // Unlock window: Monday 9 AM ET of tournament week
    // This aligns with DataGolf publishing pre-tournament odds Monday morning
    const nowDate = new Date(now);
    const etHourNow = (nowDate.getUTCHours() - 4 + 24) % 24;
    const isMondayOrLater = nowDate.getUTCDay() >= 1; // 1=Monday
    const isAfter9amET = etHourNow >= 9;
    const teeDate = new Date(teeTime);
    const daysToTee = (teeTime - now) / (24 * 60 * 60 * 1000);
    // Unlock if we're within the tournament week (≤ 5 days to tee) AND it's at least Monday 9 AM ET
    const inUnlockWindow = daysToTee <= 5 && daysToTee > 0 &&
      (nowDate.getUTCDay() > 1 || (nowDate.getUTCDay() === 1 && etHourNow >= 9));

    if (inUnlockWindow) {
      const meta = await getPoolMeta(poolId);
      if (await getLocked(poolId) && meta?.paid) {
        await redis('SET', k(poolId,'locked'), 'false');
        console.log(`[autoManage] Auto-unlocked ${poolId} for ${currentMajor} - within tournament week`);
      }
      // Send reminder email if unpaid and haven't sent one yet
      if (meta && !meta.paid && !meta.reminderSent && meta.commissionerEmail && process.env.RESEND_API_KEY) {
        const MAJOR_NAMES = {
          players:'The Players Championship', masters:'The Masters',
          pga:'PGA Championship', usopen:'U.S. Open', open:'The Open Championship',
        };
        const majorName = MAJOR_NAMES[currentMajor] || currentMajor;
        const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
        // Format tee time nicely
        const teeDate = new Date(current.teeTime).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
            to: meta.commissionerEmail,
            subject: `⏰ ${majorName} starts in 7 days — unlock your pool!`,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                <h2 style="color:#1a2a5c">Hey ${meta.commissionerName}! ⏰</h2>
                <p><strong>${majorName}</strong> tees off on ${teeDate} — just 7 days away.</p>
                <p>Unlock your pool now so your group has time to enter their picks before the tournament starts.</p>
                <div style="text-align:center;margin:32px 0">
                  <a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
                    Unlock Your Pool — $10 →
                  </a>
                </div>
                <p style="color:#6b7280;font-size:13px">Pool: ${meta.poolName}<br/>${poolUrl}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                <p style="color:#9ca3af;font-size:11px">Tuna Golf Pool · tunagolfpool.com</p>
              </div>
            `,
          }),
        }).catch(e => console.error('Reminder email failed:', e.message));
        // Mark reminder as sent so we don't spam them
        meta.reminderSent = true;
        await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      }
    }

    // Auto-lock when tournament starts (at tee time)
    if (now >= teeTime && now < endTime) {
      if (!(await getLocked(poolId))) {
        await redis('SET', k(poolId,'locked'), 'true');
        console.log(`[autoManage] Auto-locked ${poolId} - tournament started`);
      }
    }

    return currentMajor;
  } catch (e) {
    console.error('[autoManage] error:', e.message);
    return null;
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const url = new URL(request.url);
  const poolId = url.searchParams.get('poolId') || 'default';
  const diagnose = url.searchParams.get('diagnose') === '1';

  // FINGERPRINT_V196_HEADSHOTS — photo IDs collected by the droplet (dg_id → DataGolf headshot id).
  // The page merges these after its built-in list, so new players get photos without a code change.
  if (url.searchParams.get('headshots') === '1') {
    let map = {};
    try { const r = await redis('GET', 'headshots:map'); if (r) map = JSON.parse(r); } catch {}
    // FINGERPRINT_V197 — never cache an empty list (an hour-long cached {} hid the first 200 photos);
    // a real list is cached briefly so new photos appear within ~10 minutes
    const has = Object.keys(map).length > 0;
    return Response.json({ map }, { headers: { 'Cache-Control': has ? 'public, s-maxage=600, max-age=300' : 'no-store' } });
  }

  // Diagnostic mode: report what the rotation logic sees without running it
  if (diagnose) {
    try {
      const meta = await getPoolMeta(poolId);
      const year = new Date().getFullYear();
      const [ptRes, ipRes] = await Promise.all([
        fetch(`https://feeds.datagolf.com/preds/pre-tournament?tour=${srvTour(meta?.major)}&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`, { cache:'no-store' }),
        fetch(`https://feeds.datagolf.com/preds/in-play?tour=${srvTour(meta?.major)}&dead_heat=no&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`, { cache:'no-store' }),
      ]);
      const ptData = ptRes.ok ? await ptRes.json() : null;
      const ipData = ipRes.ok ? await ipRes.json() : null;
      const madeCut = (ipData?.data || ipData?.players || []).filter(p => {
        const pos = String(p.current_pos || '').replace('T','');
        const posNum = parseInt(pos, 10);
        return !isNaN(posNum) && posNum > 0;
      });
      madeCut.sort((a, b) => {
        const ap = parseInt(String(a.current_pos||'').replace('T',''), 10) || 999;
        const bp = parseInt(String(b.current_pos||'').replace('T',''), 10) || 999;
        return ap - bp;
      });
      const topPlayers = madeCut.slice(0, 10);
      const allR4Done = topPlayers.length >= 5 && topPlayers.every(p => p.R4 != null);
      const lastUpdated = ipData?.last_updated ? new Date(ipData.last_updated).getTime() : 0;
      const hoursStale = lastUpdated > 0 ? (Date.now() - lastUpdated) / 3600000 : null;
      const dataIsStale = lastUpdated > 0 && hoursStale > 12;
      const now = new Date();
      const etHour = (now.getUTCHours() - 4 + 24) % 24;
      const isTuesday = now.getUTCDay() === 2;
      const isMorning = etHour >= 6 && etHour < 12;
      return Response.json({
        diagnose: true,
        poolEventName: meta?.currentPgatourEvent,
        dgPreTournamentEvent: ptData?.event_name,
        dgInPlayEvent: ipData?.event_name,
        eventsMatch: (ptData?.event_name||'').toLowerCase() === (meta?.currentPgatourEvent||'').toLowerCase(),
        ipLastUpdated: ipData?.last_updated,
        hoursStale,
        dataIsStale,
        topPlayerR4Status: topPlayers.map(p => ({ name: p.player_name, pos: p.current_pos, R4: p.R4 })),
        allR4Done,
        inTuesdayWindow: isTuesday && isMorning,
        priorEventConcluded: allR4Done || dataIsStale,
        wouldRotate: ((ptData?.event_name||'').toLowerCase() !== (meta?.currentPgatourEvent||'').toLowerCase())
                     && ((isTuesday && isMorning) || allR4Done || dataIsStale),
      });
    } catch (e) {
      return Response.json({ diagnose: true, error: e.message });
    }
  }

  try {
    await autoManage(poolId);
    const [entries, locked, picksHidden, paymentsHidden, payments, major, meta] = await Promise.all([
      getEntries(poolId), getLocked(poolId), getPicksHidden(poolId), getPaymentsHidden(poolId),
      getPayments(poolId), getMajor(poolId), getPoolMeta(poolId),
    ]);

    // Load dynamic tournament purses
    const PURSE_DEFAULTS = {
      players: 25000000, masters: 22500000, pga: 20500000, usopen: 22500000, open: 17750000, pgatour: 9000000, dpworld: 3750000,
    };
    const purses = {};
    for (const m of Object.keys(PURSE_DEFAULTS)) {
      try {
        const stored = await redis('GET', `tournament:purse:${m}`);
        purses[m] = stored ? parseInt(stored, 10) : PURSE_DEFAULTS[m];
      } catch { purses[m] = PURSE_DEFAULTS[m]; }
    }

    // FINGERPRINT_V171_TEAM_EVENTS — ship the event's stored match points to team-event pools
    let teamMatches, teamPicks, teamPickCounts;
    if (srvIsTourMode(meta?.major) && srvIsTeamEvent(meta?.currentPgatourEvent)) {
      const [tm, tp] = await Promise.all([srvGetTeamMatches(meta.currentPgatourEvent), srvGetTeamPicks(poolId, meta.currentPgatourEvent)]);
      teamMatches = tm;
      teamPicks = srvLockedPicksOnly(tp, tm);   // FINGERPRINT_V173 — unlocked picks never leave the server
      // FINGERPRINT_V190_PICK_COUNTS — for sessions still OPEN, only HOW MANY matches each entry has picked
      // (never which side), so Standings can flag who still needs to pick
      teamPickCounts = {};
      for (const [sk, sv] of Object.entries(tm || {})) {
        if (srvSessionLocked(sv)) continue;
        const ids = new Set((sv.matches || []).map(m => m.id));
        for (const e of entries) {
          const n = Object.keys((tp[e.name] || {})[sk] || {}).filter(id => ids.has(id)).length;
          (teamPickCounts[e.name] = teamPickCounts[e.name] || {})[sk] = n;
        }
      }
    }
    return Response.json({ entries: srvPublicEntries(entries, await srvHidePicksNow(poolId, picksHidden, locked, meta)), locked, picksHidden, paymentsHidden, payments, major, meta: srvPublicMeta(meta), purses, teamMatches, teamPicks, teamPickCounts,
      pushKey: process.env.VAPID_PUBLIC_KEY || null });   // FINGERPRINT_V193_PUSH (public by design)
  } catch (err) {
    return Response.json({ entries:[], locked:false, picksHidden:true, paymentsHidden:false, payments:{}, major:'pga', error:err.message });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const poolId = body.poolId || 'default';

    // Verify admin password against pool meta (per-pool password)
    const checkAdmin = async (pw) => {
      const meta = await getPoolMeta(poolId);
      // If pool doesn't exist (was deleted), no admin access is possible
      if (!meta) return false;
      // FINGERPRINT_V204_OWNER — the pool's owner, signed in, is admin: the page sends 'acct:<sign-in token>'
      if (typeof pw === 'string' && pw.startsWith('acct:')) {
        const u = await verifyToken(pw.slice(5));
        return !!(u && meta.ownerUid && u.uid === meta.ownerUid);
      }
      if (!pw) return false;
      // an owned pool with no backup password must NEVER fall back to the built-in default
      if (meta.ownerUid && !meta.adminPassword) return false;
      const validPw = meta.adminPassword || process.env.ADMIN_PASSWORD || 'masters2026';
      return pw === validPw;
    };

    if (body.action === 'verify-admin') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const am = await getPoolMeta(poolId);
      return Response.json({ ok:true, joinCode: am?.joinCode || '' });   // FINGERPRINT_V198 — Admin only
    }

    // FINGERPRINT_V198_PRIVACY — your own picks (read-only, works after lock), for when picks are hidden
    if (body.action === 'my-entry') {
      const entries = await getEntries(poolId);
      const entry = entries.find(e => e.name.toLowerCase() === String(body.name || '').toLowerCase()
        && e.editCode?.toUpperCase() === String(body.code || '').toUpperCase());
      if (!entry) return Response.json({ error:'Invalid name or code' }, { status:404 });
      return Response.json({ ok:true, name: entry.name, picks: entry.picks || [] });
    }

    // FINGERPRINT_V198_PRIVACY — the join code is checked here, not in the browser
    if (body.action === 'check-join-code') {
      const jm = await getPoolMeta(poolId);
      if (!jm?.joinCodeRequired || !jm?.joinCode) return Response.json({ ok:true });
      if (String(body.code || '').trim().toUpperCase() === String(jm.joinCode).toUpperCase()) return Response.json({ ok:true });
      return Response.json({ error:'Incorrect join code — check with your pool commissioner.' }, { status:403 });
    }

    if (body.action === 'submit') {
      const locked = await getLocked(poolId);
      const lm = await getPoolMeta(poolId);
      if (!lm?.allowLateEntries && (locked || await srvPastFirstTee(lm)))
        return Response.json({ error:'Entries are locked!' }, { status:403 });
      {
        const jm = await getPoolMeta(poolId);
        if (jm?.joinCodeRequired && jm?.joinCode && String(body.joinCode || '').trim().toUpperCase() !== String(jm.joinCode).toUpperCase())
          return Response.json({ error:'This pool needs its join code — enter it to continue.', needJoinCode:true }, { status:403 });
      }
      const { name, picks } = body;
      // FINGERPRINT_V202_ACCOUNTS — entering needs an account; the entry takes the account's email and id
      const acct = await verifyToken(body.auth);
      if (!acct) return Response.json({ error:'Create an account or sign in to enter', needAccount:true }, { status:401 });
      const email = acct.email;
      if (!name?.trim()) return Response.json({ error:'Name required' }, { status:400 });
      if (!email?.trim()) return Response.json({ error:'Email required' }, { status:400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Response.json({ error:'Invalid email' }, { status:400 });
      const reqPicks = await srvRequiredPicks(poolId);
      if (!picks || picks.length !== reqPicks) return Response.json({ error:`${reqPicks} picks required` }, { status:400 });
      const entries = await getEntries(poolId);
      if (entries.find(e=>e.name.toLowerCase()===name.trim().toLowerCase()))
        return Response.json({ error:'Name already taken!' }, { status:409 });

      // Generate 6-char edit code
      const editCode = Math.random().toString(36).slice(2,8).toUpperCase();

      entries.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        uid: acct.uid,
        editCode,
        picks,
        ts: Date.now(),
      });
      await saveEntries(poolId, entries);
      await addUserPool(acct.uid, poolId);                 // FINGERPRINT_V204 — shows in My pools
      // FINGERPRINT_V194 — commissioner alert: new entry
      try {
        const pm = await getPoolMeta(poolId), pot = entries.length * (pm?.entryFee || 0);
        await srvPushMany(poolId, [{ name: '__admin__', type: 'newEntry', payload: {
          title: `➕ ${name.trim()} joined ${pm?.poolName || 'your pool'}`,
          body: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${pot ? ` · $${pot} pot` : ''}`,
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`, tag: `entry-${poolId}` } }]);
      } catch {}
      // FINGERPRINT_V141_ROSTER — remember this player for future-pool invites
      await upsertRoster(poolId, name.trim(), email.trim().toLowerCase(), editCode);
      if (process.env.RESEND_API_KEY && !acct) {          // account holders don't need a code email
        const meta = await getPoolMeta(poolId);
        const poolName = meta?.poolName || 'Golf Pool';
        const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: email.trim(),
              subject: `Your edit code for ${poolName}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;">Entry confirmed ⛳</h2>
                  <p>Hey ${name.trim()},</p>
                  <p>Your picks for <b>${poolName}</b> have been submitted.</p>
                  <p>If you want to change your picks before entries lock, use this code:</p>
                  <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                    <div style="font-size:11px;color:#888;letter-spacing:1px;margin-bottom:6px;">YOUR EDIT CODE</div>
                    <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1a2a5c;">${editCode}</div>
                  </div>
                  <p>Visit your pool and tap "Edit my picks" on your entry to use it.</p>
                  <p><a href="${srvMagicLink(poolUrl, poolId, { name: name.trim(), editCode })}" style="background:#1a2a5c;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open Pool</a></p>
                  <p style="font-size:12px;color:#888;margin-top:30px;">Save this email — you'll need the code if you want to edit your picks before the tournament starts.</p>
                </div>
              `,
            }),
          });
        } catch (e) { console.error('email send failed:', e.message); }
      }

      // FINGERPRINT_V174_JOIN_CODE — on a match pick'em (reqPicks 0) the new entrant gets THEIR OWN
      // code back so they can save picks immediately instead of waiting on the email. Normal weeks
      // are unchanged (no extra field).
      return Response.json({ ok:true, entries: srvPublicEntries(entries, await srvHidePicksNow(poolId)), codeSent:false, editCode, name: name.trim() });
    }

    if (body.action === 'edit-entry') {
      const locked = await getLocked(poolId);
      if (locked || await srvPastFirstTee(await getPoolMeta(poolId))) return Response.json({ error:'Entries are locked — cannot edit' }, { status:403 });
      const { name, code } = body;
      if (!name || !code) return Response.json({ error:'Name and code required' }, { status:400 });
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (!entry) return Response.json({ error:'Invalid name or code' }, { status:404 });
      return Response.json({ ok:true, entry:{ name:entry.name, email:entry.email, picks:entry.picks } });
    }

    if (body.action === 'update-entry') {
      const locked = await getLocked(poolId);
      if (locked || await srvPastFirstTee(await getPoolMeta(poolId))) return Response.json({ error:'Entries are locked — picks can\'t change after the first tee' }, { status:403 });
      const { name, code, picks } = body;
      if (!name || !code) return Response.json({ error:'Name and code required' }, { status:400 });
      const reqPicks = await srvRequiredPicks(poolId);
      if (!picks || picks.length !== reqPicks) return Response.json({ error:`${reqPicks} picks required` }, { status:400 });
      const entries = await getEntries(poolId);
      const idx = entries.findIndex(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (idx === -1) return Response.json({ error:'Invalid name or code' }, { status:404 });
      entries[idx].picks = picks;
      entries[idx].ts = Date.now();
      await saveEntries(poolId, entries);
      return Response.json({ ok:true, entries: srvPublicEntries(entries, await srvHidePicksNow(poolId)) });
    }

    // FINGERPRINT_V210 — removed: 'resend-code' (emailed edit codes; accounts replaced them)

    // FINGERPRINT_V210 — removed: 'claim-entry' (emailed edit codes; accounts replaced them)

    if (body.action === 'delete-own') {
      const locked = await getLocked(poolId);
      if (locked) return Response.json({ error:'Cannot remove — tournament started!' }, { status:403 });
      const entries = await getEntries(poolId);
      const filtered = entries.filter(e=>e.name.toLowerCase()!==body.name?.toLowerCase());
      if (filtered.length===entries.length) return Response.json({ error:'Entry not found' }, { status:404 });
      await saveEntries(poolId, filtered);
      return Response.json({ ok:true, entries: srvPublicEntries(filtered, await srvHidePicksNow(poolId)) });
    }

    // ─── CHAT ───────────────────────────────────────────────────────────
    if (body.action === 'chat-verify') {
      const { name, code } = body;
      if (!name || !code) return Response.json({ error:'Name and code required' }, { status:400 });
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (!entry) return Response.json({ error:'Invalid name or code' }, { status:404 });
      return Response.json({ ok:true, verifiedName:entry.name });
    }

    if (body.action === 'chat-fetch') {
      const raw = await redis('GET', k(poolId, 'chat'));
      const messages = raw ? JSON.parse(raw) : [];
      // FINGERPRINT_V159_CHAT_SEEN — return the read-receipt map alongside messages so the client
      // can show who's caught up. Shape: { "<entry name>": <ts of newest message they'd seen> }.
      let seen = {};
      try { const s = await redis('GET', k(poolId, 'chat_seen')); if (s) seen = JSON.parse(s); } catch {}
      return Response.json({ ok:true, messages, seen });
    }

    // FINGERPRINT_V159_CHAT_SEEN
    // Record that a verified chat user has read up to a given message timestamp. Called when the
    // Chat tab is open. Monotonic: never moves a user's marker backwards (out-of-order requests,
    // a second device on an older view). Same 30-day TTL as the chat itself.
    if (body.action === 'chat-seen') {
      const { name, code, ts } = body;
      if (!name || !code) return Response.json({ error:'Verification required' }, { status:401 });
      const stamp = Number(ts);
      if (!stamp || !isFinite(stamp)) return Response.json({ error:'Bad timestamp' }, { status:400 });
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (!entry) return Response.json({ error:'Invalid credentials' }, { status:401 });
      let seen = {};
      try { const s = await redis('GET', k(poolId, 'chat_seen')); if (s) seen = JSON.parse(s); } catch {}
      if (!seen[entry.name] || stamp > seen[entry.name]) seen[entry.name] = stamp;
      await redis('SETEX', k(poolId, 'chat_seen'), 2592000, JSON.stringify(seen));
      return Response.json({ ok:true, seen });
    }

    if (body.action === 'chat-post') {
      const { name, code, message } = body;
      if (!name || !code) return Response.json({ error:'Verification required' }, { status:401 });
      if (!message?.trim()) return Response.json({ error:'Empty message' }, { status:400 });
      if (message.length > 300) return Response.json({ error:'Message too long (300 max)' }, { status:400 });

      // Verify entry/code
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (!entry) return Response.json({ error:'Invalid credentials' }, { status:401 });

      // Rate limit: 1 message per 3 seconds per user
      const rateKey = k(poolId, `chat_rate:${entry.name.toLowerCase()}`);
      const lastPost = await redis('GET', rateKey);
      if (lastPost) return Response.json({ error:'Slow down — wait a moment' }, { status:429 });
      await redis('SETEX', rateKey, 3, '1');

      // Load + append + trim to last 100
      const raw = await redis('GET', k(poolId, 'chat'));
      const messages = raw ? JSON.parse(raw) : [];
      // Strip HTML
      const cleaned = message.trim().replace(/<[^>]*>/g, '');
      messages.push({
        id: Math.random().toString(36).slice(2, 10),
        name: entry.name,
        message: cleaned,
        ts: Date.now(),
        reactions: {},
      });
      while (messages.length > 100) messages.shift();
      // Store with 30-day TTL (auto-clear between tournaments)
      await redis('SETEX', k(poolId, 'chat'), 2592000, JSON.stringify(messages));
      // FINGERPRINT_V194 — chat mention: anyone whose entry name appears in the message (opt-in)
      try {
        const low = cleaned.toLowerCase();
        const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hits = (await getEntries(poolId)).filter(e => e.name.length >= 3 && e.name.toLowerCase() !== entry.name.toLowerCase()
          && new RegExp(`(^|[^a-z0-9])@?${esc(e.name.toLowerCase())}($|[^a-z0-9])`).test(low));
        if (hits.length) await srvPushMany(poolId, hits.map(e => ({ name: e.name, type: 'chatMention', payload: {
          title: `💬 ${entry.name} mentioned you`, body: cleaned.slice(0, 120),
          url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`, tag: `chat-${poolId}` } })));
      } catch {}
      return Response.json({ ok:true, messages });
    }

    if (body.action === 'chat-react') {
      const { name, code, messageId, emoji } = body;
      if (!name || !code) return Response.json({ error:'Verification required' }, { status:401 });
      if (!messageId || !emoji) return Response.json({ error:'Message ID and emoji required' }, { status:400 });

      // Verify entry/code
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (!entry) return Response.json({ error:'Invalid credentials' }, { status:401 });

      // Load messages
      const raw = await redis('GET', k(poolId, 'chat'));
      if (!raw) return Response.json({ error:'Message not found' }, { status:404 });
      const messages = JSON.parse(raw);
      const msgIdx = messages.findIndex(m => m.id === messageId);
      if (msgIdx === -1) return Response.json({ error:'Message not found' }, { status:404 });

      // Toggle reaction
      if (!messages[msgIdx].reactions) messages[msgIdx].reactions = {};
      const existing = messages[msgIdx].reactions[emoji] || [];
      const userIdx = existing.indexOf(entry.name);
      if (userIdx === -1) {
        existing.push(entry.name);
      } else {
        existing.splice(userIdx, 1);
      }
      if (existing.length > 0) {
        messages[msgIdx].reactions[emoji] = existing;
      } else {
        delete messages[msgIdx].reactions[emoji];
      }

      await redis('SETEX', k(poolId, 'chat'), 2592000, JSON.stringify(messages));
      return Response.json({ ok:true, messages });
    }

    if (body.action === 'chat-delete') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { messageId } = body;
      const raw = await redis('GET', k(poolId, 'chat'));
      if (!raw) return Response.json({ ok:true, messages:[] });
      const messages = JSON.parse(raw).filter(m => m.id !== messageId);
      await redis('SETEX', k(poolId, 'chat'), 2592000, JSON.stringify(messages));
      return Response.json({ ok:true, messages });
    }

    if (body.action === 'chat-clear-all') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      await redis('DEL', k(poolId, 'chat'));
      return Response.json({ ok:true, messages:[] });
    }

    // FINGERPRINT_V141_BACKFILL — one-time seed of the roster from existing archives.
    // Scans every archive (majors + pgatour slug keys) and upserts any entry that has an email.
    // Hand-imported archives with no emails contribute nothing; auto-rotated ones carry emails.
    if (body.action === 'backfill-roster') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      let scanned = 0, added = 0, withEmail = 0;
      const beforeRoster = await getRoster(poolId);
      const beforeCount = beforeRoster.length;
      try {
        // Collect all archive keys: major keys + pgatour slug keys (SCAN)
        const majorKeys = ['players','masters','pga','usopen','open'];
        const keysToCheck = [];
        // Major archives (a few years back to be safe)
        const thisYear = new Date().getFullYear();
        for (let y = 2024; y <= thisYear + 1; y++) {
          majorKeys.forEach(m => keysToCheck.push(k(poolId, `archive:${m}_${y}`)));
        }
        // pgatour slug-keyed archives via SCAN
        let cursor = '0';
        const pat = `pool:${poolId}:archive:*-*`; // FINGERPRINT_V165_DPWORLD — pgatour-* and dpworld-*
        do {
          const res = await redis('SCAN', cursor, 'MATCH', pat, 'COUNT', '100');
          if (Array.isArray(res) && res.length === 2) {
            cursor = res[0];
            (res[1] || []).forEach(key => keysToCheck.push(key));
          } else break;
        } while (cursor !== '0');

        // Read each archive and upsert entries with emails
        for (const key of keysToCheck) {
          let raw;
          try { raw = await redis('GET', key); } catch { continue; }
          if (!raw) continue;
          scanned++;
          let arch;
          try { arch = JSON.parse(raw); } catch { continue; }
          const entries = arch.entries || [];
          for (const e of entries) {
            if (e.email) {
              withEmail++;
              await upsertRoster(poolId, e.name, e.email, e.editCode || null);
            }
          }
        }
      } catch (e) {
        return Response.json({ error: 'Backfill failed: ' + e.message }, { status:500 });
      }
      const afterRoster = await getRoster(poolId);
      added = afterRoster.length - beforeCount;
      return Response.json({ ok:true, archivesScanned:scanned, entriesWithEmail:withEmail, newPlayersAdded:added, totalRoster:afterRoster.length });
    }

    // FINGERPRINT_V141_GET_ROSTER — list past players who left an email (for invites)
    if (body.action === 'get-roster') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const roster = await getRoster(poolId);
      // Newest-seen first, hide the edit code in the listing (only names + emails)
      const list = roster
        .slice()
        .sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0))
        .map(p=>({ name:p.name, email:p.email, lastSeen:p.lastSeen }));
      return Response.json({ ok:true, roster:list, count:list.length });
    }

    // FINGERPRINT_V141_INVITE_ROSTER — email all past players to join the current week's pool
    if (body.action === 'invite-roster') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      if (!process.env.RESEND_API_KEY) return Response.json({ error:'Email not configured' }, { status:400 });
      const roster = await getRoster(poolId);
      if (roster.length === 0) return Response.json({ ok:true, sent:0, message:'No past players with emails yet' });

      const meta = await getPoolMeta(poolId);
      const poolName = meta?.poolName || 'Golf Pool';
      const eventName = meta?.currentPgatourEvent || meta?.eventName || 'this week\'s tournament';
      const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
      const fee = meta?.entryFee || 0;

      // Optional custom message from the commissioner
      const customNote = (body.message||'').trim();

      // FINGERPRINT_V182_TEAM_INVITE — Presidents/Ryder Cup weeks get an invite that explains the match
      // pick'em (no golfer draft) and the real join deadline: the first session lock, which is when the
      // pool closes to new entries. Normal weeks keep the original email untouched.
      const isTeam = srvIsTeamEvent(eventName);
      let teamDeadline = '';
      if (isTeam) {
        const tm = await srvGetTeamMatches(eventName);
        const locks = Object.values(tm || {}).map(sv => new Date(sv?.lockAt).getTime()).filter(Number.isFinite);
        const first = locks.length ? Math.min(...locks) : null;
        if (first && first > Date.now())
          teamDeadline = new Date(first).toLocaleString('en-US', { timeZone:'America/New_York', weekday:'long', hour:'numeric', minute:'2-digit' }) + ' ET';
      }
      const escH = (x) => String(x || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const teamHtml = (p) => `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;margin-bottom:6px;">It's ${escH(eventName)} week ⛳</h2>
                  <p>Hey ${escH(p.name || 'there')},</p>
                  <p><b>${escH(poolName)}</b> is running a <b>match pick'em</b> this week — no golfer draft.</p>
                  <ul style="padding-left:18px;line-height:1.7;margin:12px 0;">
                    <li>Pick the winner of <b>every match</b>, session by session</li>
                    <li><b>1 point</b> per correct pick — a halved match is worth ½</li>
                    <li>You'll get an email each time new pairings are posted</li>
                  </ul>
                  ${customNote ? `<p style="background:#f5f7fb;border-left:3px solid #1a2a5c;padding:10px 14px;margin:16px 0;">${escH(customNote)}</p>` : ''}
                  <p>${fee > 0 ? `Entry is <b>$${fee}</b>. ` : ''}Join by <b>${teamDeadline ? escH(teamDeadline) : 'the first match'}</b> — after that the pool closes to new entries.</p>
                  <p style="margin:22px 0;"><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">Join the pick'em →</a></p>
                  <p style="font-size:12px;color:#888;margin-top:28px;">You're getting this because you've played in ${escH(poolName)} before. See you on the leaderboard.</p>
                </div>`;

      let sent = 0, failed = 0;
      const failures = []; // FINGERPRINT_V143_INVITE_DIAG — capture why each send failed
      // Send individually so each person gets a personal greeting (and we don't leak the email list)
      for (const p of roster) {
        if (!p.email) continue;
        // Basic email sanity check before hitting the API
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
          failed++; failures.push({ email: p.email, reason: 'invalid format' });
          continue;
        }
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: p.email,
              subject: isTeam ? `${poolName}: ${eventName} match pick'em is open ⛳` : `${poolName} is open for ${eventName} ⛳`,
              html: isTeam ? teamHtml(p) : `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;margin-bottom:6px;">New week, new pool ⛳</h2>
                  <p>Hey ${p.name||'there'},</p>
                  <p><b>${poolName}</b> is now open for <b>${eventName}</b>.</p>
                  ${customNote ? `<p style="background:#f5f7fb;border-left:3px solid #1a2a5c;padding:10px 14px;margin:16px 0;">${customNote.replace(/</g,'&lt;')}</p>` : ''}
                  ${fee>0 ? `<p>Entry is <b>$${fee}</b>. Get your picks in before the first tee.</p>` : `<p>Get your picks in before the first tee.</p>`}
                  <p style="font-size:13px;color:#555;background:#f6f3ea;border-radius:8px;padding:10px 12px;">🆕 Entries now use a free Tuna Golf Pool account — no more edit codes. <b>Sign up with this email address</b> and your past entries and season standings come with you.</p>
                  <p style="margin:22px 0;"><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Make My Picks →</a></p>
                  <p style="font-size:12px;color:#888;margin-top:28px;">You're getting this because you entered a past ${poolName} pool. See you on the leaderboard.</p>
                </div>
              `,
            }),
          });
          if (res.ok) { sent++; }
          else {
            failed++;
            let reason = `HTTP ${res.status}`;
            try { const errBody = await res.json(); reason = errBody?.message || errBody?.name || reason; } catch {}
            failures.push({ email: p.email, reason });
          }
        } catch (e) { failed++; failures.push({ email: p.email, reason: e.message || 'network error' }); }
        // Small spacing between sends to stay under Resend's rate limit (free tier ~2/sec)
        await new Promise(r => setTimeout(r, 600));
      }
      return Response.json({ ok:true, sent, failed, total:roster.length, failures });
    }

    if (body.action === 'cleanup-orphan-payments') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const entries = await getEntries(poolId);
      const payments = await getPayments(poolId);
      const entryNames = new Set(entries.map(e => e.name));
      const cleaned = {};
      const removed = [];
      Object.entries(payments).forEach(([name, val]) => {
        if (entryNames.has(name)) {
          cleaned[name] = val;
        } else {
          removed.push(name);
        }
      });
      await savePayments(poolId, cleaned);
      return Response.json({ ok:true, removed, remaining: Object.keys(cleaned).length });
    }

    // ─── MANUAL ROTATE TO NEXT PGA TOUR EVENT (pool commissioner) ──────────
    // FINGERPRINT_V150_MANUAL_ROTATE
    // Archives the current pgatour event (with server-computed earnings), wipes entries + payments,
    // advances meta.currentPgatourEvent to DataGolf's current pre-tournament event, and resets the
    // pool to locked + unpaid for the new event. Mirrors the auto-rotation, but on demand. Roster is
    // preserved (separate key). Only works when the pool is in pgatour mode.
    if (body.action === 'rotate-pgatour-now') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      if (!meta) return Response.json({ error:'Pool not found' }, { status:404 });
      if (!srvIsTourMode(meta.major || '')) {
        return Response.json({ error:'Pool is not in PGA Tour mode. Switch to pgatour first.' }, { status:400 });
      }
      const year = new Date().getFullYear();
      const now = Date.now();
      const poolEventName = (meta.currentPgatourEvent || '').toLowerCase();

      // Resolve DataGolf's CURRENT pre-tournament event = the next event to rotate into.
      let nextEventName = null, schedule = [];
      try {
        const ptRes = await fetch(
          `https://feeds.datagolf.com/preds/pre-tournament?tour=${srvTour(meta.major)}&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (ptRes.ok) { const ptData = await ptRes.json(); nextEventName = ptData.event_name || null; }
      } catch (e) { /* fall through */ }
      try {
        const schedRes = await fetch(
          `https://feeds.datagolf.com/get-schedule?tour=${srvTour(meta.major)}&season=${year}&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (schedRes.ok) { const sd = await schedRes.json(); schedule = (sd.schedule || sd.events || []).filter(e => e.start_date); }
      } catch (e) { /* fall through */ }

      // Capture the final leaderboard so the archive has correct earnings (same as auto-rotation).
      let finalInPlayPlayers = null;
      try {
        const ipRes = await fetch(
          `https://feeds.datagolf.com/preds/in-play?tour=${srvTour(meta.major)}&dead_heat=no&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (ipRes.ok) { const ipData = await ipRes.json(); finalInPlayPlayers = ipData.data || ipData.players || []; }
      } catch (e) { /* fall through */ }

      // ── Archive the current event ──
      let archivedName = null, archivedEntries = 0;
      const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
      if (poolEventName && entries.length > 0) {
        const slug = poolEventName.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
        const archiveKey = k(poolId, `archive:${meta.major}-${slug}_${year}`);
        let existing = null;
        try { const ex = await redis('GET', archiveKey); if (ex) existing = JSON.parse(ex); } catch {}
        const existingEarnings = existing?.earnings || {};
        const existingHasMoney = Object.values(existingEarnings).some(v => v > 0);

        const concludedEvent = schedule.find(e => (e.event_name||'').toLowerCase() === poolEventName)
          || schedule.find(e => { const en=(e.event_name||'').toLowerCase(); return en.includes(poolEventName)||poolEventName.includes(en); });
        const schedPurse = concludedEvent?.purse || concludedEvent?.total_purse || null;
        const adminPurse = meta?.purses?.[meta.major] || meta?.purses?.pgatour || null;
        const sigDefault = meta.major === 'dpworld' ? 3750000
          : srvIsTourChampionship(poolEventName) ? 40000000
          : (srvIsSignature(poolEventName, schedPurse) ? 20000000 : 9000000);
        const resolvedPurse = adminPurse || schedPurse || sigDefault;

        let earningsByPick = existingEarnings;
        const manTeamEvent = srvIsTeamEvent(meta.currentPgatourEvent || poolEventName);
        let manEntryTotals = null;
        if (manTeamEvent) {
          // FINGERPRINT_V173_MATCH_PICKEM
          manEntryTotals = await srvTeamArchive(poolId, meta.currentPgatourEvent || poolEventName, entries);
          earningsByPick = {};
        } else if (!existingHasMoney && finalInPlayPlayers && finalInPlayPlayers.length > 0) {
          const earnMap = srvComputeEarnings(finalInPlayPlayers, resolvedPurse, poolEventName, meta.major);
          earningsByPick = srvEarningsByPick(entries, earnMap);
        }

        const fee = meta.entryFee || 0;
        const n = entries.length;
        const pot = n * fee;
        let prizes = existing?.prizes || null;
        if (!prizes && fee > 0 && n >= 1) {
          const wta = meta.payoutMode === 'winner-take-all' || n <= 4;
          prizes = wta ? {first:pot, second:0, third:0} : {first:pot-fee*3, second:fee*2, third:fee};
        }

        let logoUrl = existing?.logoUrl || null, logoNoBg = existing?.logoNoBg ?? null, logoHeight = existing?.logoHeight || null;
        // FINGERPRINT_V169_TOUR_LOGO — PGA-only CDN; see note in the auto-rotation path above.
        if (!logoUrl && concludedEvent?.event_id && meta.major === 'pgatour') {
          logoUrl = `https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:R000.png/tournaments/logos/R${String(concludedEvent.event_id).padStart(3,'0')}.png`;
          logoNoBg = false; logoHeight = 80;
        } else if (!logoUrl && meta.major === 'dpworld') {
          logoUrl = '/logos/dp-world-tour.svg';
          logoNoBg = false; logoHeight = 64;
        }

        await redis('SET', archiveKey, JSON.stringify({
          major: meta.major, eventName: meta.currentPgatourEvent, year,
          ...(manTeamEvent ? { scoring: 'matchpicks', ...manEntryTotals } : {}),
          archivedAt: new Date().toISOString(),
          entries, payments, earnings: earningsByPick, entryFee: fee,
          prizes: prizes || null, logoUrl, logoNoBg, logoHeight,
          tournamentDate: existing?.tournamentDate || new Date().toISOString(),
          autoArchived: false, manualRotate: true,
        }));
        try { await srvSendRecap(poolId, archiveKey); } catch (e) { console.log('[recap]', e.message); }   // FINGERPRINT_V213
        archivedName = meta.currentPgatourEvent; archivedEntries = entries.length;
      }

      // ── Reset pool for the next event ──
      meta.paid = false;
      meta.paidAt = null;
      meta.reminderSent = false;
      meta.everPaid = true;
      if (nextEventName) meta.currentPgatourEvent = nextEventName;
      await Promise.all([
        redis('SET', k(poolId,'meta'),         JSON.stringify(meta)),
        redis('DEL', k(poolId,'entries')),
        redis('DEL', k(poolId,'payments')),
        redis('SET', k(poolId,'locked'),       'true'),
        redis('SET', k(poolId,'picks_hidden'), 'true'),
      ]);

      return Response.json({
        ok: true,
        archived: archivedName,
        archivedEntries,
        rotatedTo: nextEventName || '(unchanged — DataGolf event unavailable)',
        note: 'Entries and payments wiped. Pool is locked + unpaid for the new event. Roster preserved.',
      });
    }

    // ─── REBUILD A LOST ARCHIVE (pool commissioner) ───────────────────────
    // FINGERPRINT_V156_REBUILD_ARCHIVE
    // Manually write an archive from supplied entries + earnings. Used to restore an archive that
    // was wiped/overwritten (e.g. The Open getting clobbered by a stray 3M Open save). The caller
    // provides the event name, major key, year, entries[] (each {name, picks[], earnings{}}) and the
    // prize split. We store it under the correct key and mark it manually rebuilt.
    // ─── TEAM EVENT MATCH POINTS (pool commissioner) ────────────────────────
    // FINGERPRINT_V171_TEAM_EVENTS
    // Saves the official per-player match points for the pool's current team event. Stored once
    // per event, so every pool on the Presidents/Ryder Cup reads the same numbers. Values are
    // clamped to 0–5 in half-point steps (5 sessions max, ½ for a halved match).
    // FINGERPRINT_V193_PUSH — a signed-in entry turns notifications on/off for this device
    if (body.action === 'push-subscribe' || body.action === 'push-unsubscribe') {
      const entries = await getEntries(poolId);
      const entry = entries.find(e => e.name.toLowerCase() === String(body.name || '').toLowerCase()
        && e.editCode?.toUpperCase() === String(body.code || '').toUpperCase());
      if (!entry) return Response.json({ error:'Sign in with your entry name and code' }, { status:401 });
      const sub = body.subscription || {};
      if (!/^https:\/\//.test(sub.endpoint || '') || !sub.keys?.p256dh || !sub.keys?.auth)
        return Response.json({ error:'Invalid subscription' }, { status:400 });
      const key = k(poolId, 'pushsubs');
      let subs = {};
      try { const r = await redis('GET', key); if (r) subs = JSON.parse(r); } catch {}
      // a device belongs to one entry at a time (e.g. after "Switch" on a shared phone) — but keeps its settings
      let prevPrefs = null;
      for (const n of Object.keys(subs)) {
        if (n === '__admin__') continue;
        const hit = (subs[n] || []).find(x => x.endpoint === sub.endpoint);
        if (hit?.prefs) prevPrefs = hit.prefs;
        subs[n] = (subs[n] || []).filter(x => x.endpoint !== sub.endpoint);
      }
      const dev = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, prefs: prevPrefs || {} };
      if (body.action === 'push-subscribe') subs[entry.name] = [dev, ...(subs[entry.name] || [])].slice(0, 5);
      await redis('SET', key, JSON.stringify(subs));
      if (body.action === 'push-subscribe') { try { await redis('SADD', 'pushpools', poolId); } catch {} }   // FINGERPRINT_V194
      return Response.json({ ok:true, on: body.action === 'push-subscribe', prefs: srvPrefsView(dev) });
    }

    // FINGERPRINT_V194_NOTIFY_PREFS — change this device's notification choices
    if (body.action === 'push-prefs') {
      const entries = await getEntries(poolId);
      const entry = entries.find(e => e.name.toLowerCase() === String(body.name || '').toLowerCase()
        && e.editCode?.toUpperCase() === String(body.code || '').toUpperCase());
      if (!entry) return Response.json({ error:'Sign in with your entry name and code' }, { status:401 });
      const key = k(poolId, 'pushsubs');
      let subs = {};
      try { const r = await redis('GET', key); if (r) subs = JSON.parse(r); } catch {}
      const dev = (subs[entry.name] || []).find(x => x.endpoint === body.endpoint);
      if (!dev) return Response.json({ error:'Turn notifications on for this device first' }, { status:404 });
      dev.prefs = { ...(dev.prefs || {}), ...srvCleanPrefs(body.prefs) };
      await redis('SET', key, JSON.stringify(subs));
      return Response.json({ ok:true, prefs: srvPrefsView(dev) });
    }

    // FINGERPRINT_V208 — is THIS device already getting commissioner alerts? (so Admin shows the right button)
    if (body.action === 'push-admin-status') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      let subs = {};
      try { const r = await redis('GET', k(poolId, 'pushsubs')); if (r) subs = JSON.parse(r); } catch {}
      const ep = String(body.endpoint || '');
      return Response.json({ ok:true, on: !!ep && (subs.__admin__ || []).some(x => x.endpoint === ep) });
    }

    // FINGERPRINT_V194_NOTIFY_PREFS — commissioner alerts on this device (new entries, unpaid count)
    if (body.action === 'push-admin') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const sub = body.subscription || {};
      if (!/^https:\/\//.test(sub.endpoint || '') || !sub.keys?.p256dh || !sub.keys?.auth)
        return Response.json({ error:'Invalid subscription' }, { status:400 });
      const key = k(poolId, 'pushsubs');
      let subs = {};
      try { const r = await redis('GET', key); if (r) subs = JSON.parse(r); } catch {}
      const list = (subs.__admin__ || []).filter(x => x.endpoint !== sub.endpoint);
      if (body.on !== false) list.unshift({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, prefs: {} });
      subs.__admin__ = list.slice(0, 5);
      await redis('SET', key, JSON.stringify(subs));
      if (body.on !== false) { try { await redis('SADD', 'pushpools', poolId); } catch {} }
      return Response.json({ ok:true, on: body.on !== false });
    }

    // FINGERPRINT_V191_MAGIC_LINKS — sign in from an email link
    if (body.action === 'magic-signin') {
      const entry = srvMagicVerify(poolId, body.token, await getEntries(poolId));
      if (!entry) return Response.json({ error:'That sign-in link has expired — sign in with your name and code' }, { status:401 });
      return Response.json({ ok:true, name: entry.name, code: String(entry.editCode).toUpperCase() });
    }

    // ─── MATCH PICK'EM ──────────────────────────────────────────────────────
    // FINGERPRINT_V173_MATCH_PICKEM
    // Commissioner posts/edits one session: its lock time, its matches, and results as they finish.
    // FINGERPRINT_V179_TEAM_SUPERVISOR — the droplet asks this every few minutes, all year:
    // is any pool on a team event right now? That decides whether it runs the Presidents/Ryder Cup
    // scraper or hands the droplet back to the majors scraper. Nothing is date-based.
    if (body.action === 'team-auto-status') {
      if (!process.env.TEAM_SYNC_SECRET || body.secret !== process.env.TEAM_SYNC_SECRET)
        return Response.json({ error:'Unauthorized' }, { status:401 });
      const pools = await srvTeamEventPools();
      const ev = pools[0]?.meta?.currentPgatourEvent || null;
      // FINGERPRINT_V194_NOTIFY_ENGINE — normal-week notifications ride on this 5-minute check
      let notify = null;
      try { notify = await Promise.race([srvNotifyTick(), new Promise(r => setTimeout(() => r('timeout'), 9000))]); } catch (e) { notify = 'error'; }
      return Response.json({ ok:true, active: pools.length > 0, event: ev, pools: pools.length, notify,
        scheduled: !!(ev && srvTeamScheduleFor(ev, new Date().getFullYear())) });
    }

    // FINGERPRINT_V176_TEAM_AUTOSYNC — called by the droplet with each session's scraped text
    if (body.action === 'team-auto-sync') {
      if (!process.env.TEAM_SYNC_SECRET || body.secret !== process.env.TEAM_SYNC_SECRET)
        return Response.json({ error:'Unauthorized' }, { status:401 });
      const pools = await srvTeamEventPools();
      if (!pools.length) return Response.json({ ok:true, skipped:'no pools on a team event' });
      const ev = pools[0].meta.currentPgatourEvent, year = new Date().getFullYear();
      // No session times configured for this year's event → can't set locks, so don't auto-post;
      // alert the commissioner when pairings appear, and still record results below.
      const sched = srvTeamScheduleFor(ev, year);
      // keep the latest raw page for each session (used to build automatic results next)
      for (const [sk, v] of Object.entries(body.sessions || {})) {
        if (v?.html) await redis('SETEX', `teamauto:debug:${sk}`, 60 * 60 * 24 * 7, String(v.html).slice(0, 60000));
      }
      let roster;
      try {
        const r = await srvTeamRoster();
        if (!srvIsTeamEvent(r.event)) return Response.json({ ok:true, skipped:`roster is for "${r.event}"` });
        roster = r.roster;
      } catch (e) { return Response.json({ ok:false, error:'roster unavailable: ' + e.message }); }

      const all = await srvGetTeamMatches(ev);
      // FINGERPRINT_V192_MATCH_LOCKS — give sessions posted before per-match locks their lock times
      let lockFill = false;
      for (const [sk0, sv0] of Object.entries(all)) if ((sv0.matches || []).some(m => !m.lockAt)) { srvApplyMatchLocks(ev, sk0, sv0); lockFill = true; }
      const sig = (ms) => JSON.stringify(ms.map(m => [...m.usa].sort().join('|') + '~' + [...m.intl].sort().join('|')));
      const taken = new Map(Object.entries(all).map(([sk, sv]) => [sig(sv.matches), sk]));
      const report = {}, posted = [];
      if (!sched) {
        for (const [sk, v] of Object.entries(body.sessions || {})) {
          if (all[sk] || !/MATCH\s*PREVIEW/i.test(v?.text || '')) continue;
          report[sk] = 'pairings out — no session times configured, commissioner alerted';
          await srvAlertCommissioners(pools, `${ev}_${year}_${sk}_nosched`,
            `${ev}: ${sk} pairings are out — please post them`,
            `<p>${sk} pairings for the ${ev} are out, but this year's session start times aren't set up in the app,
             so it can't lock picks by itself.</p><p>Post it from Admin → Match Pick'em (paste the pairings, set the first
             tee time, save) — players are emailed as soon as you save.</p>`);
        }
      }
      for (const [sk, rule] of Object.entries(sched || {})) {
        if (all[sk]) { report[sk] = 'already posted'; continue; }
        const lastTee = srvMatchTeeMs(ev, sk, { lockAt: rule.lockAt, matches: Array(rule.count).fill({}) }, rule.count - 1);
        if (Date.now() >= lastTee + SRV_PICK_GRACE_MS) { report[sk] = 'past lock time'; continue; }
        const text = body.sessions?.[sk]?.text || '';
        if (!/MATCH\s*PREVIEW/i.test(text)) { report[sk] = 'pairings not out yet'; continue; }
        const { matches, ambiguous } = srvParseMatchText(text, roster);
        const problems = [];
        if (matches.length !== rule.count) problems.push(`found ${matches.length} matches, expected ${rule.count}`);
        const seen = new Set();
        matches.forEach((m, i) => {
          if (!m) return problems.push(`match ${i + 1}: names didn't resolve`);
          if (m.usa.length !== rule.size || m.intl.length !== rule.size)
            problems.push(`match ${i + 1}: expected ${rule.size} v ${rule.size}, got ${m.usa.length} v ${m.intl.length}`);
          [...m.usa, ...m.intl].forEach(n => { if (seen.has(n)) problems.push(`${n} appears twice`); seen.add(n); });
        });
        if (!problems.length && taken.has(sig(matches))) problems.push(`identical to the ${taken.get(sig(matches))} session — tab likely didn't switch`);
        if (problems.length) {
          report[sk] = 'REJECTED: ' + problems.join('; ');
          await srvAlertCommissioners(pools, `${ev}_${year}_${sk}_reject_${problems[0]}`,
            `⚠️ ${ev}: couldn't auto-post ${sk} — please post it manually`,
            `<h3>Automatic posting stopped for <b>${sk}</b></h3><p>${problems.join('<br>')}</p>
             <p>Nothing was posted. Open Admin → Match Pick'em and paste this session in by hand.</p>`);
          continue;
        }
        all[sk] = { lockAt: rule.lockAt, postedAt: new Date().toISOString(), matches: matches.map((m, i) => ({ id: `m${i + 1}`, usa: m.usa, intl: m.intl, result: null })),
                    ...(srvSessionFormat(body.sessions?.[sk]) ? { format: srvSessionFormat(body.sessions?.[sk]) } : {}) };
        srvApplyMatchLocks(ev, sk, all[sk]);
        taken.set(sig(matches), sk);
        posted.push(sk);
        report[sk] = 'POSTED' + (ambiguous.length ? ` (check match ${ambiguous.join(', ')})` : '');
        if (ambiguous.length) {
          const lines = ambiguous.map(i => { const m = all[sk].matches[i - 1]; return `Match ${i}: ${m.usa.join(' & ')} v ${m.intl.join(' & ')}`; });
          await srvAlertCommissioners(pools, `${ev}_${year}_${sk}_ambiguous`,
            `🔎 ${ev}: ${sk} auto-posted — please check ${ambiguous.length === 1 ? 'one match' : ambiguous.length + ' matches'}`,
            `<p>${sk} pairings were posted automatically, but these involve players who share a surname,
             so the app had to guess which is which:</p><p>${lines.join('<br>')}</p>
             <p>If one's wrong, fix it in Admin → Match Pick'em and save.</p>`);
        }
      }
      if (posted.length) {
        await redis('SET', srvTeamMatchesKey(ev, year), JSON.stringify(all));
        for (const sk of posted) for (const pl of pools) await srvNotifyPicksOpen(pl.poolId, ev, year, sk, all[sk]);
      }

      // FINGERPRINT_V177_AUTO_RESULTS / FINGERPRINT_V178_RESULTS_LIVE
      // Results from the team flag DataGolf shows on a finished match — automatic from the first one.
      // Guards: finished matches only; halves from the literal "HALVED"; otherwise exactly ONE team's
      // flag must show (both/neither → skipped + commissioner emailed); a result the commissioner has
      // entered is never overwritten; matches are identified by their players, never by position.
      // Sanity check: if a match that hasn't STARTED shows a team flag, flags aren't a winner signal
      // on this page, so nothing is recorded that run and the commissioner is told.
      const evTag = `${ev}_${year}`.toLowerCase();
      const keyOf = (u, i) => [...u].sort().join('|') + '~' + [...i].sort().join('|');
      const allBlocks = Object.values(body.sessions || {}).flatMap(v => Array.isArray(v?.blocks) ? v.blocks : []);
      const notStartedWithFlag = allBlocks.filter(b => b && !b.final && /THRU\s*0(?!\d)/i.test(b.text || '')
        && ((b.flags?.USA || 0) > 0) !== ((b.flags?.INT || 0) > 0));
      // FINGERPRINT_V187_MATCH_ROWS — rows are matched by DataGolf ID (exact); a caret on a match that
      // hasn't started would mean the caret isn't a lead marker, so it's then ignored everywhere
      const nameById = new Map(roster.filter(p => p.dg_id).map(p => [p.dg_id, p.name]));
      const rowKey = (r) => {
        const u = (r?.usa || []).map(id => nameById.get(+id)), i = (r?.intl || []).map(id => nameById.get(+id));
        return (!u.length || !i.length || [...u, ...i].some(x => !x)) ? null : keyOf(u, i);
      };
      const caretBad = Object.values(body.sessions || {}).flatMap(v => Array.isArray(v?.rows) ? v.rows : [])
        .some(r => { const st = srvRowState(r); return !st.final && st.holes === 0 && st.lead; });
      const results = {}, unclear = [], recorded = [], corrected = [];
      let resChanged = false;
      if (notStartedWithFlag.length) {
        await srvAlertCommissioners(pools, `${evTag}_flags_unreliable`,
          `${ev}: automatic results paused — please enter results manually`,
          `<p>DataGolf is showing a team flag on matches that haven't started, so the flag can't be trusted to mean
           "winner" on this page. The app hasn't recorded any results — enter them in Admin → Match Pick'em.</p>`);
        results.paused = 'team flag appears on unstarted matches';
      } else {
        for (const [sk, sv] of Object.entries(all)) {
          const byKey = new Map(sv.matches.map(m => [keyOf(m.usa, m.intl), m]));
          let wrote = 0;
          // FINGERPRINT_V188_RESULTS_FROM_ROWS_ONLY
          // Results come ONLY from each match row's own winner mark: DataGolf swaps the live caret for a
          // winner flag (usa-win-flag / eur-win-flag) when a match ends, and the scraper reads either.
          // The old guess from team-flag images near a match is gone — each match's hidden preview popup
          // sits beside it holding BOTH teams' flags, which is how Match 3 came out backwards.
          // Results the app wrote itself are marked auto and are CORRECTED if the page later shows a
          // different winner; a result the commissioner entered is never touched.
          const verdict = (st) => st.halved ? 'H' : st.lead;
          const label = (res) => res === 'H' ? 'Halved' : res === 'USA' ? 'USA won' : 'International won';
          if (!caretBad) for (const r of (body.sessions?.[sk]?.rows || [])) {
            const kk = rowKey(r), m = kk && byKey.get(kk);
            if (!m) continue;
            const st = srvRowState(r);
            if (!st.final) continue;
            const res = verdict(st);
            if (!res) { if (!m.result) unclear.push(`${sk}: ${m.usa.join(' & ')} v ${m.intl.join(' & ')}`); continue; }
            const fs = res === 'H' ? null : srvFinalScore(r.score);
            if (!m.result) {
              m.result = res; m.auto = true; wrote++; resChanged = true;
              if (fs) m.finalScore = fs;
              recorded.push(`${sk}: ${m.usa.join(' & ')} v ${m.intl.join(' & ')} → ${label(res)}${fs ? ' ' + fs : ''}`);
            } else if (m.auto && m.result !== res) {
              corrected.push(`${sk}: ${m.usa.join(' & ')} v ${m.intl.join(' & ')} — was ${label(m.result)}, now ${label(res)}`);
              m.result = res; wrote++; resChanged = true;
              if (fs) m.finalScore = fs; else delete m.finalScore;
            } else if (m.result === res && fs && m.finalScore !== fs) {
              // FINGERPRINT_V189 — fill the margin in for results already recorded (incl. the commissioner's),
              // but only when the recorded winner agrees with the page
              m.finalScore = fs; resChanged = true;
            }
          }
          if (wrote) results[sk] = `${wrote} recorded`;
        }
      }
      // FINGERPRINT_V183_SESSION_FORMAT — fill in the format for sessions posted without one
      let fmtChanged = false;
      for (const [sk, sv] of Object.entries(all)) {
        const f = srvSessionFormat(body.sessions?.[sk]);
        if (f && sv.format !== f) { sv.format = f; fmtChanged = true; }
      }
      // FINGERPRINT_V180_LIVE_STATUS — store each in-progress match's status with a timestamp
      // FINGERPRINT_V185_TEXT_CHUNKS — read each match's probability and live score from TWO sources:
      // the scraper's per-match blocks, and the session's full text split at each "MATCH PREVIEW".
      // The text runs in page order, so it works however DataGolf nests its elements (the probability
      // line may sit beside the match's block rather than inside it). Blocks go first because only they
      // carry flags (the leader's side); text fills anything blocks missed. A diagnostic per session
      // goes into the report, which the droplet logs.
      let liveChanged = fmtChanged || lockFill;
      const nowIso = new Date().toISOString();
      const diag = {};
      const FIN = /THRU\s*F(?=\s*(\d|HALVED|\s|$))/i;
      for (const [sk, sv] of Object.entries(all)) {
        const byKey = new Map(sv.matches.map(m => [keyOf(m.usa, m.intl), m]));
        const blocks = Array.isArray(body.sessions?.[sk]?.blocks) ? body.sessions[sk].blocks : [];
        const chunks = String(body.sessions?.[sk]?.text || '').split(/MATCH\s*PREVIEW/i).slice(1).map(c => 'MATCH PREVIEW ' + c);
        if (!blocks.length && !chunks.length) continue;
        const done = {};
        const handle = (text, block) => {
          const parsed = srvParseMatchText(text, roster).matches[0];
          const m = parsed && byKey.get(keyOf(parsed.usa, parsed.intl));
          if (!m) return;
          const d = done[m.id] || (done[m.id] = {});
          if (m.result) return;
          const final = block ? !!block.final : FIN.test(text);
          if (!d.prob) {
            const pr = srvMatchProb({ text, final });
            if (pr) { m.prob = { ...pr, at: nowIso }; d.prob = true; liveChanged = true; }
          }
          if (!d.live) {
            // FINGERPRINT_V188 — never take a side from nearby flag images (popups hold both teams' flags)
            const st = srvLiveStatus({ text, final, flags: {} }, false);
            if (st) { m.live = { ...st, at: nowIso }; d.live = true; liveChanged = true; }
          }
        };
        // FINGERPRINT_V187_MATCH_ROWS — rows first: exact players, caret gives the leader's side
        const rows = Array.isArray(body.sessions?.[sk]?.rows) ? body.sessions[sk].rows : [];
        for (const r of rows) {
          const kk = rowKey(r), m = kk && byKey.get(kk);
          if (!m) continue;
          const d = done[m.id] || (done[m.id] = {});
          if (m.result) continue;
          const st = srvRowState(r);
          const pr = srvMatchProb({ text: r.prob || '', final: st.final });
          if (pr) { m.prob = { ...pr, at: nowIso }; d.prob = true; liveChanged = true; }
          if (!st.final && st.holes >= 1 && st.margin != null) {
            m.live = { thru: st.holes, margin: st.margin, leader: st.margin && !caretBad ? st.lead : null, at: nowIso };
            d.live = true; liveChanged = true;
          }
        }
        blocks.forEach(b => b && handle(String(b.text || ''), b));
        chunks.forEach(c => handle(c, null));
        const got = Object.values(done);
        diag[sk] = `${rows.length} rows/${blocks.length} blocks/${chunks.length} text → ${got.length}/${sv.matches.length} matched, ` +
                   `${got.filter(x => x.prob).length} chances, ${got.filter(x => x.live).length} live, ` +
          `${sv.matches.filter(x => x.live?.leader && x.live.at === nowIso).length} with leader`;
      }
      report._live = diag;
      if (liveChanged && !resChanged) await redis('SET', srvTeamMatchesKey(ev, year), JSON.stringify(all));
      if (corrected.length) {
        await srvAlertCommissioners(pools, `${evTag}_corrected_${corrected.join('/')}`,
          `${ev}: ${corrected.length === 1 ? 'a result was' : corrected.length + ' results were'} corrected automatically`,
          `<p>DataGolf's final result differed from what the app had recorded, so it was corrected:</p>
           <p>${corrected.join('<br>')}</p><p>Results you entered yourself are never changed.</p>`);
        results.corrected = corrected.length;
      }
      if (resChanged) {
        await redis('SET', srvTeamMatchesKey(ev, year), JSON.stringify(all));
        await srvAlertCommissioners(pools, `${evTag}_first_results`,
          `${ev}: first results recorded automatically — quick check?`,
          `<p>The app just recorded these results from DataGolf:</p><p>${recorded.join('<br>')}</p>
           <p>If any is wrong, fix it in Admin → Match Pick'em — your entry always wins and won't be overwritten.
           You'll only hear from the app again if it can't read a result.</p>`);
      }
      if (unclear.length) {
        await srvAlertCommissioners(pools, `${evTag}_unclear_${unclear.join('/')}`,
          `🏳️ ${ev}: couldn't read ${unclear.length === 1 ? 'a result' : unclear.length + ' results'}`,
          `<p>These matches have finished, but the page didn't clearly show who won:</p><p>${unclear.join('<br>')}</p>
           <p>Enter them in Admin → Match Pick'em.</p>`);
      }
      // FINGERPRINT_V190_PICK_REMINDERS
      try { const nRem = await srvSendPickReminders(pools, ev, year, all); if (nRem) report._reminders = nRem; } catch {}
      return Response.json({ ok:true, event: ev, report, results });
    }

    if (body.action === 'set-team-session') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      const ev = meta?.currentPgatourEvent || '';
      if (!srvIsTeamEvent(ev)) return Response.json({ error:'This pool is not on a team event' }, { status:400 });
      const sk = body.sessionKey;
      if (!SRV_TEAM_SESSION_KEYS.includes(sk)) return Response.json({ error:'Unknown session' }, { status:400 });
      const lockMs = new Date(body.lockAt || '').getTime();
      if (!isFinite(lockMs)) return Response.json({ error:'Set the session\'s first tee time' }, { status:400 });
      const list = Array.isArray(body.matches) ? body.matches : [];
      if (list.length > 12) return Response.json({ error:'Too many matches' }, { status:400 });
      const seen = new Set(), clean = [];
      for (let i = 0; i < list.length; i++) {
        const m = list[i] || {};
        const usa = (m.usa || []).map(String).filter(Boolean), intl = (m.intl || []).map(String).filter(Boolean);
        if (!usa.length || usa.length > 2 || usa.length !== intl.length)
          return Response.json({ error:`Match ${i+1}: needs 1 v 1 or 2 v 2` }, { status:400 });
        for (const n of [...usa, ...intl]) {
          if (seen.has(n)) return Response.json({ error:`${n} is in two matches` }, { status:400 });
          seen.add(n);
        }
        const result = ['USA','INT','H'].includes(m.result) ? m.result : null;
        clean.push({ id: String(m.id || `m${i+1}`).slice(0,12), usa, intl, result });
      }
      const year = new Date().getFullYear();
      const all = await srvGetTeamMatches(ev);
      // FINGERPRINT_V189 — keep each match's final margin if its result didn't change
      clean.forEach(m => {
        const prev = (all[sk]?.matches || []).find(x => x.id === m.id);
        if (prev && prev.result && prev.result === m.result && prev.finalScore) m.finalScore = prev.finalScore;
      });
      if (clean.length) all[sk] = { lockAt: new Date(lockMs).toISOString(), postedAt: all[sk]?.postedAt || new Date().toISOString(), matches: clean, ...(all[sk]?.format ? { format: all[sk].format } : {}) }; else delete all[sk];
      if (all[sk]) srvApplyMatchLocks(ev, sk, all[sk]);   // FINGERPRINT_V192_MATCH_LOCKS
      await redis('SET', srvTeamMatchesKey(ev, year), JSON.stringify(all));

      // FINGERPRINT_V175_PICKS_OPEN_EMAIL — shared with the auto-poster (see srvNotifyPicksOpen)
      const emailed = await srvNotifyPicksOpen(poolId, ev, year, sk, all[sk]);
      return Response.json({ ok:true, teamMatches: all, emailed });
    }

    // An entry saves its picks for one session. Rejected once that session has locked.
    if (body.action === 'team-picks' || body.action === 'team-picks-get') {
      const { name, code } = body;
      const entries = await getEntries(poolId);
      const entry = entries.find(e => e.name.toLowerCase() === String(name||'').toLowerCase()
        && e.editCode?.toUpperCase() === String(code||'').toUpperCase());
      if (!entry) return Response.json({ error:'Sign in with your entry name and code' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      const ev = meta?.currentPgatourEvent || '';
      const [matches, all] = await Promise.all([srvGetTeamMatches(ev), srvGetTeamPicks(poolId, ev)]);
      if (body.action === 'team-picks') {
        const sess = matches[body.sessionKey];
        if (!sess) return Response.json({ error:'That session has no matches yet' }, { status:400 });
        if (srvSessionLocked(sess)) return Response.json({ error:'This session has locked — picks are final' }, { status:403 });
        // FINGERPRINT_V192_MATCH_LOCKS — only OPEN matches can change; a locked match keeps its saved pick
        const openIds = new Set(sess.matches.filter(m => !srvMatchLocked(sess, m)).map(m => m.id));
        const prev = (all[entry.name] || {})[body.sessionKey] || {}, cleanP = {};
        for (const m of sess.matches) if (!openIds.has(m.id) && (prev[m.id] === 'USA' || prev[m.id] === 'INT')) cleanP[m.id] = prev[m.id];
        for (const [mid, v] of Object.entries(body.picks || {})) {
          if (openIds.has(mid) && (v === 'USA' || v === 'INT')) cleanP[mid] = v;
        }
        all[entry.name] = { ...(all[entry.name] || {}), [body.sessionKey]: cleanP };
        await redis('SET', srvTeamPicksKey(poolId, ev, new Date().getFullYear()), JSON.stringify(all));
      }
      return Response.json({ ok:true, myPicks: all[entry.name] || {}, name: entry.name });
    }

    if (body.action === 'set-team-points') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      const ev = meta?.currentPgatourEvent || '';
      if (!srvIsTeamEvent(ev)) return Response.json({ error:'This pool is not on a team event' }, { status:400 });
      const year = new Date().getFullYear();
      // FINGERPRINT_V172_TEAM_SESSIONS — session results in, derived totals out
      if (body.sessions && typeof body.sessions === 'object') {
        const cleanS = {}, pts = {};
        for (const [sk, results] of Object.entries(body.sessions)) {
          if (!SRV_TEAM_SESSION_KEYS.includes(sk)) return Response.json({ error:`Unknown session "${sk}"` }, { status:400 });
          cleanS[sk] = {};
          for (const [name, r] of Object.entries(results || {})) {
            if (!(r in SRV_TEAM_RESULT)) return Response.json({ error:`Invalid result for ${name}: use W, H or L` }, { status:400 });
            const nm = String(name).slice(0, 80);
            cleanS[sk][nm] = r;
            pts[nm] = (pts[nm] || 0) + SRV_TEAM_RESULT[r];
          }
        }
        await Promise.all([
          redis('SET', srvTeamSessionsKey(ev, year), JSON.stringify(cleanS)),
          redis('SET', srvTeamKey(ev, year), JSON.stringify(pts)),
        ]);
        return Response.json({ ok:true, sessions: cleanS, points: pts, count: Object.keys(pts).length });
      }
      const clean = {};
      for (const [name, v] of Object.entries(body.points || {})) {
        if (v === '' || v == null) continue;
        const n = Math.round(Number(v) * 2) / 2;
        if (!isFinite(n) || n < 0 || n > 5) return Response.json({ error:`Invalid points for ${name}: must be 0–5` }, { status:400 });
        clean[String(name).slice(0, 80)] = n;
      }
      await redis('SET', srvTeamKey(ev, new Date().getFullYear()), JSON.stringify(clean));
      return Response.json({ ok:true, points: clean, count: Object.keys(clean).length });
    }

    if (body.action === 'rebuild-archive') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { major, year, eventName, entries, earnings, prizes, entryFee, note, entryCount } = body;
      if (!major || !year || !Array.isArray(entries) || entries.length === 0) {
        return Response.json({ error:'need major, year, and non-empty entries' }, { status:400 });
      }
      const slug = (eventName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
      const archiveKey = (srvIsTourMode(major) && slug)
        ? k(poolId, `archive:${major}-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      const archiveData = {
        locked: true,                       // FINGERPRINT_V212 — fixed by hand: never auto-overwritten
        major, year,
        eventName: eventName || undefined,
        archivedAt: new Date().toISOString(),
        entries,
        payments: [],
        earnings: earnings || {},
        entryFee: entryFee || 0,
        prizes: prizes || null,
        logoUrl: null, logoNoBg: null, logoHeight: null,
        tournamentDate: body.tournamentDate || new Date().toISOString(),
        manualRebuild: true,
        rebuildNote: note || null,
        entryCount: (typeof entryCount === 'number' && entryCount > 0) ? entryCount : undefined,
      };
      await redis('SET', archiveKey, JSON.stringify(archiveData));
      return Response.json({ ok:true, archived:{ key:archiveKey, entries:entries.length } });
    }

    if (body.action === 'delete-archive') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { archiveKey } = body;
      if (!archiveKey || !archiveKey.startsWith('archive:')) {
        return Response.json({ error:'archiveKey required (e.g. archive:usopen_2026)' }, { status:400 });
      }
      await redis('DEL', k(poolId, archiveKey));
      return Response.json({ ok:true, deleted: archiveKey });
    }

    if (body.action === 'redis-read-raw') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { key } = body;
      if (!key) return Response.json({ error:'key required' }, { status:400 });
      try {
        const value = await redis('GET', key);
        return Response.json({ ok:true, key, value, exists: value !== null });
      } catch (e) {
        return Response.json({ ok:false, key, error: e.message });
      }
    }

    if (body.action === 'redis-scan-keys') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { pattern } = body;
      if (!pattern) return Response.json({ error:'pattern required (e.g. *masters*)' }, { status:400 });
      try {
        let cursor = '0';
        const allKeys = [];
        do {
          const result = await redis('SCAN', cursor, 'MATCH', pattern, 'COUNT', '100');
          cursor = result[0];
          if (result[1] && result[1].length > 0) allKeys.push(...result[1]);
        } while (cursor !== '0' && allKeys.length < 500);
        return Response.json({ ok:true, pattern, keys: allKeys, count: allKeys.length });
      } catch (e) {
        return Response.json({ ok:false, error: e.message });
      }
    }

    if (body.action === 'import-archive') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const { major, year, entries, payments, earnings, entryFee, prizes, logoUrl, logoNoBg, logoHeight, tournamentDate, eventName } = body;
      if (!major || !year || !Array.isArray(entries)) {
        return Response.json({ error:'major, year, and entries[] required' }, { status:400 });
      }
      // FINGERPRINT_V32_IMPORT_SLUG — pgatour archives keyed by event slug to match History read + rotation
      const slug = (eventName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
      const archiveKey = (srvIsTourMode(major) && slug)
        ? k(poolId, `archive:${major}-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      const archiveData = {
        locked: true,                       // FINGERPRINT_V212 — fixed by hand: never auto-overwritten
        major, year,
        eventName: eventName || undefined,
        archivedAt: body.archivedAt || new Date().toISOString(),   // a restore keeps the week's original date
        entries, payments: payments || {}, earnings: earnings || {},
        entryFee: entryFee || 0,
        prizes: prizes || null,
        logoUrl: logoUrl || null,
        logoNoBg: logoNoBg !== undefined ? logoNoBg : null,
        logoHeight: logoHeight || null,
        tournamentDate: tournamentDate || null,
        manuallyImported: true,
      };
      await redis('SET', archiveKey, JSON.stringify(archiveData));
      return Response.json({ ok:true, archived:{entries:entries.length, earnings:Object.keys(earnings||{}).length}});
    }

    // ─── EMERGENCY: Repair missing pool meta ────────────────────────
    if (body.action === 'repair-meta') {
      if (body.password !== process.env.PLATFORM_ADMIN_PASSWORD) {
        return Response.json({ error:'Platform admin only' }, { status:401 });
      }
      const { meta } = body;
      if (!meta || !meta.poolName) return Response.json({ error:'meta object with poolName required' }, { status:400 });
      // Set sensible defaults
      const fullMeta = {
        poolId,
        major: 'pga',
        paid: true,
        active: true,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        ...meta,
      };
      await redis('SET', k(poolId, 'meta'), JSON.stringify(fullMeta));
      // Also ensure pool is in the global index
      await redis('SADD', 'pools:index', poolId);
      return Response.json({ ok:true, meta:fullMeta });
    }

    // ─── EMERGENCY: Rollback an auto-rotation ───────────────────────
    if (body.action === 'rollback-rotation') {
      if (body.password !== process.env.PLATFORM_ADMIN_PASSWORD) {
        return Response.json({ error:'Platform admin only' }, { status:401 });
      }
      const { archiveKey } = body;
      if (!archiveKey) return Response.json({ error:'archiveKey required (e.g. archive:pga_2026)' }, { status:400 });

      // Get the archived data
      const archiveData = await redis('GET', k(poolId, archiveKey));
      if (!archiveData) return Response.json({ error:`No archive found at ${archiveKey}` }, { status:404 });
      const archive = JSON.parse(archiveData);

      // Restore: entries, payments, major, locked, picks_hidden
      const major = archiveKey.split(':')[1]?.split('_')[0] || 'pga';
      if (archive.entries) await redis('SET', k(poolId, 'entries'), JSON.stringify(archive.entries));
      if (archive.payments) await redis('SET', k(poolId, 'payments'), JSON.stringify(archive.payments));
      await redis('SET', k(poolId, 'major'), major);
      await redis('SET', k(poolId, 'locked'), 'true');
      await redis('SET', k(poolId, 'picks_hidden'), 'false');

      // Ensure meta is paid:true (platform admin sees only paid pools)
      const metaRaw = await redis('GET', k(poolId, 'meta'));
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        meta.paid = true;
        meta.active = true;
        meta.major = major;
        await redis('SET', k(poolId, 'meta'), JSON.stringify(meta));
      }

      return Response.json({
        ok: true,
        restored: { major, entries: archive.entries?.length || 0, payments: Object.keys(archive.payments||{}).length },
      });
    }

    // ─── FIELD EDITS (Platform admin only) ─────────────────────────
    if (body.action === 'field-remove-player') {
      if (body.password !== process.env.PLATFORM_ADMIN_PASSWORD) {
        return Response.json({ error:'Platform admin only' }, { status:401 });
      }
      const { major, playerName } = body;
      if (!major || !playerName) return Response.json({ error:'major and playerName required' }, { status:400 });
      const cacheKey = `pool:scraped_field:${major}`;
      const raw = await redis('GET', cacheKey);
      if (!raw) return Response.json({ error:'No field cache found' }, { status:404 });
      const data = JSON.parse(raw);
      const target = playerName.toLowerCase().trim();
      const before = data.players.length;
      data.players = data.players.filter(p => p.name.toLowerCase().trim() !== target);
      if (data.players.length === before) {
        return Response.json({ error:`Player "${playerName}" not found` }, { status:404 });
      }
      data.debug = data.debug || {};
      data.debug.playerCount = data.players.length;
      await redis('SET', cacheKey, JSON.stringify(data));
      return Response.json({ ok:true, removed:playerName, fieldSize:data.players.length });
    }

    if (body.action === 'field-add-player') {
      if (body.password !== process.env.PLATFORM_ADMIN_PASSWORD) {
        return Response.json({ error:'Platform admin only' }, { status:401 });
      }
      const { major, playerName, country, dgRank } = body;
      if (!major || !playerName) return Response.json({ error:'major and playerName required' }, { status:400 });
      const cacheKey = `pool:scraped_field:${major}`;
      const raw = await redis('GET', cacheKey);
      if (!raw) return Response.json({ error:'No field cache found' }, { status:404 });
      const data = JSON.parse(raw);
      // Check if player already exists
      const target = playerName.toLowerCase().trim();
      if (data.players.find(p => p.name.toLowerCase().trim() === target)) {
        return Response.json({ error:`Player "${playerName}" already in field` }, { status:409 });
      }
      data.players.push({
        name: playerName,
        country: country || 'USA',
        confirmed: true,
        onTrack: false,
        dgRank: dgRank || null,
      });
      data.debug = data.debug || {};
      data.debug.playerCount = data.players.length;
      await redis('SET', cacheKey, JSON.stringify(data));
      return Response.json({ ok:true, added:playerName, fieldSize:data.players.length });
    }

    if (body.action === 'field-rename-player') {
      if (body.password !== process.env.PLATFORM_ADMIN_PASSWORD) {
        return Response.json({ error:'Platform admin only' }, { status:401 });
      }
      const { major, oldName, newName } = body;
      if (!major || !oldName || !newName) return Response.json({ error:'major, oldName, newName required' }, { status:400 });
      const cacheKey = `pool:scraped_field:${major}`;
      const raw = await redis('GET', cacheKey);
      if (!raw) return Response.json({ error:'No field cache found' }, { status:404 });
      const data = JSON.parse(raw);
      const target = oldName.toLowerCase().trim();
      const player = data.players.find(p => p.name.toLowerCase().trim() === target);
      if (!player) return Response.json({ error:`Player "${oldName}" not found` }, { status:404 });
      player.name = newName;
      await redis('SET', cacheKey, JSON.stringify(data));
      return Response.json({ ok:true, renamed:`${oldName} → ${newName}` });
    }

    if (body.action==='lock'||body.action==='unlock') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      await redis('SET', k(poolId,'locked'), body.action==='lock'?'true':'false');
      return Response.json({ ok:true, locked:body.action==='lock' });
    }

    if (body.action==='show-picks'||body.action==='hide-picks') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      await redis('SET', k(poolId,'picks_hidden'), body.action==='hide-picks'?'true':'false');
      return Response.json({ ok:true, picksHidden:body.action==='hide-picks' });
    }

    if (body.action==='show-payments'||body.action==='hide-payments') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      await redis('SET', k(poolId,'payments_hidden'), body.action==='hide-payments'?'true':'false');
      return Response.json({ ok:true, paymentsHidden:body.action==='hide-payments' });
    }

    if (body.action==='set-custom-logo') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      if (!meta) return Response.json({ error:'Pool not found' }, { status:404 });
      meta.customLogoUrl = body.customLogoUrl || '';
      meta.customLogoNoBg = body.customLogoNoBg !== false;
      meta.customLogoHeight = parseInt(body.customLogoHeight,10) || 72;
      await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      return Response.json({ ok:true, meta });
    }

    if (body.action==='set-payout-mode') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      if (!meta) return Response.json({ error:'Pool not found' }, { status:404 });
      // 'standard' = 1st/2nd/3rd split; 'winner-take-all' = 1st gets entire pot
      meta.payoutMode = body.payoutMode === 'winner-take-all' ? 'winner-take-all' : 'standard';
      await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      return Response.json({ ok:true, payoutMode: meta.payoutMode });
    }

    // FINGERPRINT_V200_LATE_ENTRIES — Admin: let NEW entries in after the first tee (edits stay locked)
    if (body.action === 'set-late-entries') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = (await getPoolMeta(poolId)) || {};
      meta.allowLateEntries = !!body.on;
      await redis('SET', k(poolId, 'meta'), JSON.stringify(meta));
      return Response.json({ ok:true, allowLateEntries: meta.allowLateEntries });
    }

    if (body.action==='set-join-code') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const meta = await getPoolMeta(poolId);
      if (!meta) return Response.json({ error:'Pool not found' }, { status:404 });
      meta.joinCodeRequired = !!body.joinCodeRequired;
      if (body.joinCode !== undefined) {
        meta.joinCode = String(body.joinCode || '').trim().toUpperCase();
      }
      await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      return Response.json({ ok:true, meta });
    }

    if (body.action==='set-major') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      // FINGERPRINT_V167_DPWORLD_SETMAJOR — use the shared VALID_MAJORS; a local duplicate list
      // here silently rejected 'dpworld' even though the rest of the app supported it.
      if (!VALID_MAJORS.includes(body.major)) {
        return Response.json({ error:'Invalid major' }, { status:400 });
      }
      // Switch the pool's active major and reset entries
      await Promise.all([
        redis('SET', k(poolId,'major'), body.major),
        redis('DEL', k(poolId,'entries')),
        redis('DEL', k(poolId,'payments')),
        redis('SET', k(poolId,'locked'), 'false'),
        redis('SET', k(poolId,'picks_hidden'), 'true'),
      ]);
      // Update meta to track if we're in PGA Tour mode
      const meta = await getPoolMeta(poolId);
      if (meta) {
        meta.major = body.major;
        meta.pgaTourMode = srvIsTourMode(body.major);
        // When entering PGA Tour mode, capture the current DataGolf event so auto-rotation knows what we're on
        if (srvIsTourMode(body.major)) {
          try {
            const ptRes = await fetch(
              `https://feeds.datagolf.com/preds/pre-tournament?tour=${srvTour(body.major)}&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
              { cache:'no-store', signal: AbortSignal.timeout(5000) }
            );
            if (ptRes.ok) {
              const ptData = await ptRes.json();
              if (ptData.event_name) meta.currentPgatourEvent = ptData.event_name;
            }
          } catch {}
        } else {
          // Leaving pgatour mode — clear tracked event
          delete meta.currentPgatourEvent;
        }
        await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      }
      return Response.json({ ok:true, major: body.major });
    }

    if (body.action==='delete') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const entries = await getEntries(poolId);
      await saveEntries(poolId, entries.filter(e=>e.name!==body.name));
      return Response.json({ ok:true, entries: srvPublicEntries(entries.filter(e=>e.name!==body.name), await srvHidePicksNow(poolId)) });
    }

    if (body.action==='mark-paid'||body.action==='mark-unpaid') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      if (!body.entryName) return Response.json({ error:'entryName required' }, { status:400 });
      const payments = await getPayments(poolId);
      payments[body.entryName] = body.action==='mark-paid';
      await savePayments(poolId, payments);
      return Response.json({ ok:true, payments });
    }

    if (body.action==='set-major') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      if (!VALID_MAJORS.includes(body.major)) return Response.json({ error:'Invalid major' }, { status:400 });
      await redis('SET', k(poolId,'major'), body.major);
      return Response.json({ ok:true, major:body.major });
    }

    if (body.action==='set-entry-fee') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const fee = Math.max(0, parseFloat(body.entryFee) || 0);
      const metaRaw = await redis('GET', k(poolId,'meta'));
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        meta.entryFee = fee;
        await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
      }
      return Response.json({ ok:true, entryFee:fee });
    }

    if (body.action==='save-full-archive') {
      if (body.password!=='auto' && !await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      // For 'auto' (frontend) calls, require non-empty, non-zero earnings to avoid clobbering good data.
      if (body.password==='auto') {
        const e = body.earnings || {};
        if (Object.keys(e).length === 0 || !Object.values(e).some(v => v > 0)) {
          return Response.json({ ok:true, skipped:'auto call with no real earnings' });
        }
      }
      const { major, year, earnings, prizes, logoUrl, logoNoBg, logoHeight, tournamentDate, eventName } = body;
      // FINGERPRINT_V31_ARCHIVE_KEY
      // pgatour archives are keyed by event slug to avoid week-to-week collisions.
      // Major archives keep the simple major_year key.
      const meta = await getPoolMeta(poolId);
      const evName = eventName || meta?.currentPgatourEvent || '';
      const slug = (evName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
      const archiveKey = (srvIsTourMode(major) && slug)
        ? k(poolId, `archive:${major}-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      if (body.password === 'auto') {
        const why = await srvAutoArchiveBlock(poolId, major, archiveKey);
        if (why) return Response.json({ ok:true, skipped: why });
      }
      let prevFirst = null;
      try { const pr = await redis('GET', archiveKey); if (pr) prevFirst = JSON.parse(pr).firstSavedAt || null; } catch {}
      // FINGERPRINT_V155_COLLISION_GUARD — if an archive already exists at this key for a DIFFERENT
      // event, don't clobber it. Guards against a blank/rotated evName resolving to the wrong slug
      // and overwriting a good archive (how The Open got wiped by a 3M Open save).
      try {
        const existingRaw = await redis('GET', archiveKey);
        if (existingRaw) {
          const ex = JSON.parse(existingRaw);
          const exName = (ex.eventName||'').toLowerCase().trim();
          const newName = (evName||'').toLowerCase().trim();
          const exHasEntries = Array.isArray(ex.entries) && ex.entries.length > 0;
          if (exHasEntries && exName && newName && exName !== newName) {
            return Response.json({ ok:true, skipped:`key collision: "${exName}" already here, not overwriting with "${newName}"` });
          }
        }
      } catch {}
      const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
      // FINGERPRINT_V155_EMPTY_ARCHIVE_GUARD
      // Never write an archive with ZERO entries. This fires when the pool has already rotated
      // (entries wiped) but a late completion-triggered save still lands: it would create a bogus
      // 0-entry archive AND, on a key collision, blank out a good prior archive (this is how the
      // 3M Open's empty save clobbered The Open). Also refuse to overwrite an EXISTING archive that
      // has entries with a now-empty one.
      if (!entries || entries.length === 0) {
        return Response.json({ ok:true, skipped:'no entries — refusing to save empty archive' });
      }
      const archiveData = {
        firstSavedAt: prevFirst || new Date().toISOString(),
        major,
        year,
        eventName: evName || undefined,
        archivedAt: new Date().toISOString(),
        entries,
        payments,
        earnings: earnings || {},
        entryFee: meta?.entryFee || 0,
        prizes: prizes || null,
        logoUrl: logoUrl || null,
        logoNoBg: logoNoBg !== undefined ? logoNoBg : null,
        logoHeight: logoHeight || null,
        tournamentDate: tournamentDate || new Date().toISOString(),
      };
      await redis('SET', archiveKey, JSON.stringify(archiveData));
      try { await srvSendRecap(poolId, archiveKey); } catch (e) { console.log('[recap]', e.message); }   // FINGERPRINT_V213
      return Response.json({ ok:true, archived:{entries:entries.length, earnings:Object.keys(earnings||{}).length}});
    }

    if (body.action==='save-archive-earnings') {
      if (body.password!=='auto' && !await checkAdmin(body.password))
        return Response.json({ error:'Wrong password' }, { status:401 });
      const { major, year, earnings, eventName } = body;
      // GUARD: refuse to save empty earnings — would blank out existing data
      if (!earnings || Object.keys(earnings).length === 0) {
        return Response.json({ ok:true, skipped:'empty earnings' });
      }
      // GUARD: refuse to overwrite if all values are $0 — likely a stale closure or wrong-major call
      const hasNonZero = Object.values(earnings).some(v => v > 0);
      if (!hasNonZero) {
        return Response.json({ ok:true, skipped:'all zeros' });
      }
      // FINGERPRINT_V31_EARNINGS_KEY — pgatour uses slug key to match save-full-archive + rotation
      const meta = await getPoolMeta(poolId);
      const evName = eventName || meta?.currentPgatourEvent || '';
      const slug = (evName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
      const archiveKey = (srvIsTourMode(major) && slug)
        ? k(poolId, `archive:${major}-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      if (body.password === 'auto') {
        const why = await srvAutoArchiveBlock(poolId, major, archiveKey);
        if (why) return Response.json({ ok:true, skipped: why });
      }
      try {
        const r = await redis('GET', archiveKey);
        // Only update if archive already exists — don't create empty ones
        if (r) {
          const a = JSON.parse(r);
          a.earnings = earnings;
          await redis('SET', archiveKey, JSON.stringify(a));
        }
        // If no archive exists, do nothing (Save Final Results will create it properly)
      } catch {}
      return Response.json({ ok:true });
    }

    // FINGERPRINT_V203_SEASON — season-long prize-money standings, three races:
    //   Majors   = masters, pga, usopen, open        PGA Tour = every pgatour week + the Players
    //   DP World = every dpworld week
    // Each finished week's prizes are worked out with History's exact rules, then added up PER PERSON — by
    // account, else by the email they entered with, else by entry name. Only names and totals go out.
    if (body.action === 'season') {
      return Response.json({ ok: true, ...(await srvSeason(poolId, body.year)) });
    }

    if (body.action==='get-archives-public') {
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2024 + i);   // FINGERPRINT_V207 — 2024 → next year, forever
      const MAJOR_ORDER = { players: 0, masters: 1, pga: 2, usopen: 3, open: 4 };
      const archives = [];
      // Major archives: archive:{major}_{year}
      for (const major of MAJORS) {
        for (const year of years) {
          try {
            const r = await redis('GET', k(poolId, `archive:${major}_${year}`));
            if (r) archives.push({ ...JSON.parse(r), payments:{} });
          } catch {}
        }
      }
      // Tour archives: archive:{pgatour|dpworld}-{event-slug}_{year} — discover via SCAN
      try {
        let cursor = '0';
        do {
          const res = await redis('SCAN', cursor, 'MATCH', k(poolId, 'archive:*-*'), 'COUNT', 100);
          if (Array.isArray(res) && res.length === 2) {
            cursor = res[0];
            for (const archiveKey of res[1] || []) {
              try {
                const r = await redis('GET', archiveKey);
                if (r) archives.push({ ...JSON.parse(r), payments:{} });
              } catch {}
            }
          } else {
            cursor = '0';
          }
        } while (cursor !== '0');
      } catch (e) { console.warn('pgatour archive scan failed:', e.message); }
      archives.sort((a,b) => {
        if (a.year !== b.year) return b.year - a.year;
        // pgatour archives use archivedAt for ordering within a year
        if (srvIsTourMode(a.major) && srvIsTourMode(b.major)) {
          return new Date(b.archivedAt||0) - new Date(a.archivedAt||0);
        }
        // pgatour events go after majors within the same year
        if (srvIsTourMode(a.major)) return 1;
        if (srvIsTourMode(b.major)) return -1;
        return (MAJOR_ORDER[b.major] || 0) - (MAJOR_ORDER[a.major] || 0);
      });
      // FINGERPRINT_V203 — saved weeks hold raw entries (emails, old codes): strip them for visitors
      return Response.json({ ok:true, archives: archives.map(a => ({ ...a, entries: srvPublicEntries(a.entries) })) });
    }

    // ─── PUBLIC PGA TOUR SCHEDULE (live from DataGolf, cached) ─────────────
    // FINGERPRINT_V151_SCHEDULE
    // Serves the full-season PGA Tour schedule for the end-user Schedule view. Cached in Redis for
    // 6 hours so we don't hit DataGolf on every tab open. The API key stays server-side.
    if (body.action==='get-schedule-public') {
      const year = new Date().getFullYear();
      // FINGERPRINT_V165_DPWORLD — the Schedule tab shows the tour this pool actually follows.
      const _schedMeta = await getPoolMeta(poolId);
      const _schedTour = srvTour(_schedMeta?.major);
      const cacheKey = k(poolId, `schedule-cache_${_schedTour}_${year}`);
      // Try cache first (schedule barely changes; 6h freshness is plenty)
      try {
        const cached = await redis('GET', cacheKey);
        if (cached) {
          const c = JSON.parse(cached);
          if (c.fetchedAt && (Date.now() - c.fetchedAt) < 6*60*60*1000 && Array.isArray(c.events)) {
            return Response.json({ ok:true, events:c.events, year, cached:true });
          }
        }
      } catch {}
      // Fetch fresh from DataGolf
      let events = [];
      try {
        const res = await fetch(
          `https://feeds.datagolf.com/get-schedule?tour=${_schedTour}&season=${year}&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(6000) }
        );
        if (res.ok) {
          const sd = await res.json();
          const raw = sd.schedule || sd.events || [];
          events = raw
            .filter(e => e.event_name && (e.start_date || e.date))
            .map(e => ({
              eventName: e.event_name,
              startDate: e.start_date || e.date || null,
              course: e.course || e.course_name || null,
              location: e.location || null,
              purse: e.purse || e.total_purse || null,
              eventId: e.event_id || null,
            }))
            .sort((a,b) => new Date(a.startDate||0) - new Date(b.startDate||0));
        }
      } catch (e) { console.warn('schedule fetch failed:', e.message); }
      // Cache it (even if empty, to avoid hammering on failure — short TTL via fetchedAt check)
      if (events.length > 0) {
        try { await redis('SET', cacheKey, JSON.stringify({ fetchedAt: Date.now(), events })); } catch {}
      }
      return Response.json({ ok:true, events, year, cached:false });
    }

    if (body.action==='get-archives') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2024 + i);   // FINGERPRINT_V207 — 2024 → next year, forever
      // Tee times for chronological sort within each year
      // Players (March) < Masters (April) < PGA (May) < US Open (June) < Open (July)
      const MAJOR_ORDER = { players: 0, masters: 1, pga: 2, usopen: 3, open: 4 };
      const archives = [];
      for (const major of MAJORS) {
        for (const year of years) {
          try {
            const r = await redis('GET', k(poolId, `archive:${major}_${year}`));
            if (r) archives.push(JSON.parse(r));
          } catch {}
        }
      }
      // Sort by year desc, then major order desc (latest major in year first)
      archives.sort((a,b) => {
        if (a.year !== b.year) return b.year - a.year;
        return (MAJOR_ORDER[b.major] || 0) - (MAJOR_ORDER[a.major] || 0);
      });
      return Response.json({ ok:true, archives });
    }

    if (body.action==='reset') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      await Promise.all([
        redis('DEL', k(poolId,'entries')),
        redis('DEL', k(poolId,'locked')),
        redis('DEL', k(poolId,'picks_hidden')),
        redis('DEL', k(poolId,'payments')),
      ]);
      return Response.json({ ok:true, entries:[], payments:{} });
    }

    return Response.json({ error:'Invalid action' }, { status:400 });
  } catch (err) {
    return Response.json({ error:err.message }, { status:500 });
  }
}
