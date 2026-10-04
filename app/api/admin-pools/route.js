export const dynamic = 'force-dynamic';

const REDIS_URL    = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN  = process.env.UPSTASH_REDIS_REST_TOKEN;
const PLATFORM_PW  = process.env.PLATFORM_ADMIN_PASSWORD || '';

async function redis(cmd, ...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([cmd, ...args]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result;
}

// several commands in ONE request (Upstash pipeline)
async function redisPipe(cmds) {
  if (!cmds.length) return [];
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST', cache: 'no-store',
    headers: { 'Authorization': `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`Redis pipeline ${res.status}`);
  return (await res.json()).map(x => x.result);
}

// FINGERPRINT_BROADCAST — platform announcements
import { unsubUrl } from '../auth/lib';
// Who's who: every account (users:index) and every commissioner (pool owners' accounts, plus the commissioner
// email on pools made before accounts). One entry per email address.
async function audiences() {
  const uids = (await redis('SMEMBERS', 'users:index')) || [];
  const raws = uids.length ? await redis('MGET', ...uids.map(u => `user:${u}`)) : [];
  const byUid = {}, players = new Map();
  uids.forEach((u, i) => { try { const x = JSON.parse(raws[i] || 'null'); if (x?.email) { byUid[u] = x; players.set(x.email.toLowerCase(), { email: x.email.toLowerCase(), name: x.name || '' }); } } catch {} });
  const pids = (await redis('SMEMBERS', 'pools:index')) || [];
  const metas = pids.length ? await redis('MGET', ...pids.map(p => `pool:${p}:meta`)) : [];
  const commish = new Map();
  metas.forEach(r => { try { const m = JSON.parse(r || 'null'); if (!m) return;
    const owner = m.ownerUid && byUid[m.ownerUid];
    const email = (owner?.email || m.commissionerEmail || '').toLowerCase().trim();
    if (email) commish.set(email, { email, name: owner?.name || m.commissionerName || '' });
  } catch {} });
  const everyone = new Map([...players, ...commish]);
  return { commissioners: [...commish.values()], players: [...players.values()], everyone: [...everyone.values()] };
}
const esc = (x) => String(x || '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
function announcementHtml({ name, message, buttonText, buttonUrl, email }) {
  const words = (name || '').trim().split(/\s+/);
  const first = /^(the|a|an|mr|mrs|ms|dr|coach)\.?$/i.test(words[0] || '') ? words.join(' ') : words[0];
  return `<div style="font-family:-apple-system,system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="font-size:13px;font-weight:700;color:#1a4d2e;letter-spacing:.5px;margin-bottom:14px">⛳ TUNA GOLF POOL</div>
  <p style="font-size:15px;margin:0 0 12px">Hi${first ? ' ' + esc(first) : ''},</p>
  <div style="font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(message)}</div>
  ${buttonText && /^https:\/\//.test(buttonUrl || '') ? `<p style="margin:22px 0"><a href="${esc(buttonUrl)}" style="background:#1a4d2e;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">${esc(buttonText)}</a></p>` : ''}
  <p style="font-size:11px;color:#9ca3af;margin-top:28px;border-top:1px solid #eee;padding-top:12px">You're getting this because you have a Tuna Golf Pool account or run a pool.
  <a href="${unsubUrl(email)}" style="color:#9ca3af">Unsubscribe from announcements</a> — you'll still get emails about pools you're in.</p></div>`;
}
async function resendBatch(emails) {        // up to 100 per request, paced under Resend's rate limit
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(chunk) });
    if (r.ok) sent += chunk.length; else console.error('[broadcast] batch failed', r.status, await r.text().catch(() => ''));
    if (i + 100 < emails.length) await new Promise(res => setTimeout(res, 700));
  }
  return sent;
}

async function deletePool(poolId) {
  // Find ALL keys belonging to this pool using SCAN pattern matching
  try {
    let cursor = '0';
    const allKeys = [];
    do {
      // SCAN cursor [MATCH pattern] [COUNT count]
      const result = await redis('SCAN', cursor, 'MATCH', `pool:${poolId}:*`, 'COUNT', '100');
      cursor = result[0];
      if (result[1] && result[1].length > 0) allKeys.push(...result[1]);
    } while (cursor !== '0');
    
    // Delete all found keys
    if (allKeys.length > 0) {
      await Promise.all(allKeys.map(key => redis('DEL', key)));
    }
  } catch (e) {
    // Fallback: delete known keys if SCAN fails
    const keys = ['meta','entries','payments','locked','picks_hidden','payments_hidden','major','chat'];
    await Promise.all(keys.map(k => redis('DEL', `pool:${poolId}:${k}`)));
  }
  
  // Remove from index
  await redis('SREM', 'pools:index', poolId);
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!PLATFORM_PW || body.password !== PLATFORM_PW)
      return Response.json({ error: 'Wrong password' }, { status: 401 });

    // ── Delete a pool ─────────────────────────────────────────────────────────
    // FINGERPRINT_BROADCAST — audience sizes + recent announcements
    if (body.action === 'broadcast-info') {
      const a = await audiences();
      const all = a.everyone.map(x => x.email);
      const uns = all.length ? await redis('MGET', ...all.map(e => `unsub:${e}`)) : [];
      const off = new Set(all.filter((e, i) => uns[i]));
      const n = (list) => list.filter(x => !off.has(x.email)).length;
      let log = [];
      try { log = ((await redis('LRANGE', 'broadcasts', '0', '9')) || []).map(x => JSON.parse(x)); } catch {}
      return Response.json({ ok: true, counts: { commissioners: n(a.commissioners), players: n(a.players), everyone: n(a.everyone) }, unsubscribed: off.size, log });
    }
    // send an announcement (or a test to one address)
    if (body.action === 'broadcast') {
      if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email isn’t set up (RESEND_API_KEY)' }, { status: 400 });
      const subject = String(body.subject || '').trim(), message = String(body.message || '').trim();
      if (!subject || !message) return Response.json({ error: 'Add a subject and a message' }, { status: 400 });
      if (body.buttonText && !/^https:\/\//.test(body.buttonUrl || '')) return Response.json({ error: 'The button link must start with https://' }, { status: 400 });
      const from = 'Tuna Golf Pool <noreply@tunagolfpool.com>';
      const mk = (to, name) => ({ from, to, subject, html: announcementHtml({ name, message, buttonText: body.buttonText, buttonUrl: body.buttonUrl, email: to }),
        headers: { 'List-Unsubscribe': `<${unsubUrl(to)}>` } });
      if (body.test) {
        const to = String(body.test).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return Response.json({ error: 'Enter a valid test email' }, { status: 400 });
        const sent = await resendBatch([{ ...mk(to, 'there'), subject: '[TEST] ' + subject }]);
        return Response.json({ ok: !!sent, test: true, sent });
      }
      const a = await audiences();
      const list = a[body.audience];
      if (!list) return Response.json({ error: 'Choose who to send it to' }, { status: 400 });
      const uns = list.length ? await redis('MGET', ...list.map(x => `unsub:${x.email}`)) : [];
      const to = list.filter((x, i) => !uns[i]);
      const sent = await resendBatch(to.map(x => mk(x.email, x.name)));
      await redis('LPUSH', 'broadcasts', JSON.stringify({ at: new Date().toISOString(), audience: body.audience, subject, sent, skipped: list.length - to.length }));
      await redis('LTRIM', 'broadcasts', '0', '49');
      return Response.json({ ok: true, sent, skipped: list.length - to.length });
    }

    // FINGERPRINT_PLAYERS — master list of player accounts: details, sign-in methods, joined / last on, pools.
    // Uses the users:index set (added at every sign-up), plus a sweep for accounts made before it existed.
    if (body.action === 'list-users') {
      const idx = new Set((await redis('SMEMBERS', 'users:index')) || []);
      let cursor = '0';
      const found = [];
      do {
        const r = await redis('SCAN', cursor, 'MATCH', 'user:u*', 'COUNT', '200');
        cursor = r[0];
        for (const key of (r[1] || [])) { const m = key.match(/^user:(u[A-Za-z0-9_-]+)$/); if (m) found.push(m[1]); }
      } while (cursor !== '0');
      const missing = found.filter(u => !idx.has(u));
      if (missing.length) { await redis('SADD', 'users:index', ...missing); missing.forEach(u => idx.add(u)); }
      const uids = [...idx];
      if (!uids.length) return Response.json({ ok: true, users: [] });
      const raws = await redis('MGET', ...uids.map(u => `user:${u}`));
      const poolSets = await redisPipe(uids.map(u => ['SMEMBERS', `user:${u}:pools`]));
      const pids = [...new Set(poolSets.flat().filter(Boolean))];
      const metas = pids.length ? await redis('MGET', ...pids.map(p => `pool:${p}:meta`)) : [];
      const info = {};
      pids.forEach((p, i) => { try { const m = JSON.parse(metas[i] || 'null'); if (m) info[p] = { name: m.poolName || p, owner: m.ownerUid }; } catch {} });
      const users = uids.map((u, i) => {
        let x = null; try { x = JSON.parse(raws[i] || 'null'); } catch {}
        if (!x) return null;
        return { uid: u, name: x.name || '', email: x.email || '', phone: x.phone || '', created: x.created || '', seen: x.seen || '',
          password: !!x.pw, google: !!x.google, apple: !!x.apple,
          pools: (poolSets[i] || []).filter(p => info[p]).map(p => ({ poolId: p, name: info[p].name, owner: info[p].owner === u })) };
      }).filter(Boolean).sort((a, b) => String(b.created).localeCompare(String(a.created)));
      return Response.json({ ok: true, users });
    }

    if (body.action === 'delete') {
      await deletePool(body.poolId);
      return Response.json({ ok: true });
    }

    // ── Update a meta field on a pool ────────────────────────────────────────
    if (body.action === 'update-meta') {
      const { poolId, field, value } = body;
      const ALLOWED = ['poolName','commissionerName','commissionerEmail','adminPassword','entryFee'];
      if (!ALLOWED.includes(field)) {
        return Response.json({ error: `Field "${field}" not editable` }, { status: 400 });
      }
      const metaRaw = await redis('GET', `pool:${poolId}:meta`);
      if (!metaRaw) return Response.json({ error: 'Pool not found' }, { status: 404 });
      const meta = JSON.parse(metaRaw);
      meta[field] = field === 'entryFee' ? (parseInt(value,10)||0) : value;
      await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
      return Response.json({ ok: true, meta });
    }

    // ── Set tournament purse ─────────────────────────────────────────────────
    if (body.action === 'set-purse') {
      const { major, purse } = body;
      const VALID = ['players','masters','pga','usopen','open','pgatour','dpworld'];
      if (!VALID.includes(major)) {
        return Response.json({ error: `Invalid major: ${major}` }, { status: 400 });
      }
      const newPurse = parseInt(purse, 10);
      if (!newPurse || newPurse < 1000000) {
        return Response.json({ error: 'Purse must be at least $1M' }, { status: 400 });
      }
      await redis('SET', `tournament:purse:${major}`, String(newPurse));
      return Response.json({ ok: true, major, purse: newPurse });
    }

    // ── Get all pools ─────────────────────────────────────────────────────────
    const poolIds = await redis('SMEMBERS', 'pools:index') || [];
    const pools = [];
    for (const poolId of poolIds) {
      try {
        const metaRaw = await redis('GET', `pool:${poolId}:meta`);
        if (!metaRaw) continue;
        const meta = JSON.parse(metaRaw);
        const entriesRaw = await redis('GET', `pool:${poolId}:entries`);
        const entries = entriesRaw ? JSON.parse(entriesRaw) : [];
        pools.push({
          poolId:           meta.poolId,
          poolName:         meta.poolName,
          commissionerName: meta.commissionerName,
          commissionerEmail:meta.commissionerEmail,
          major:            meta.major,
          paid:             meta.paid,
          paidAt:           meta.paidAt,
          createdAt:        meta.createdAt,
          entryCount:       entries.length,
        });
      } catch {}
    }

    pools.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalPools   = pools.length;
    const paidPools    = pools.filter(p => p.paid).length;
    const totalRevenue = paidPools * 10;

    // Load tournament purses (with defaults if not set)
    const PURSE_DEFAULTS = {
      players: 25000000,
      masters: 22500000,
      pga:     20500000,
      usopen:  22500000,
      open:    17750000,  // 2026 record purse (R&A)
      pgatour: 9000000,  // Generic default — admin updates per current event
      dpworld: 3750000,  // Generic default — DP World purses vary widely; set per event
    };
    const purses = {};
    for (const major of Object.keys(PURSE_DEFAULTS)) {
      const stored = await redis('GET', `tournament:purse:${major}`);
      purses[major] = stored ? parseInt(stored, 10) : PURSE_DEFAULTS[major];
    }

    return Response.json({ ok: true, pools, stats: { totalPools, paidPools, totalRevenue }, purses });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
