export const dynamic = 'force-dynamic';

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const VALID_MAJORS = ['players','masters','pga','usopen','open'];

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
  return majors.map(({ key, month, nth, hour }) => {
    const y = key === 'players' ? year + 1 : year;
    const thu = nthWeekday(y, month, THU, nth);
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
async function getPayments(pid)    { try { const r=await redis('GET',k(pid,'payments')); return r?JSON.parse(r):{}; } catch { return {}; } }
async function savePayments(pid,p) { await redis('SET',k(pid,'payments'),JSON.stringify(p)); }
async function getMajor(pid)       { try { const r=await redis('GET',k(pid,'major')); return VALID_MAJORS.includes(r)?r:'pga'; } catch { return 'pga'; } }
async function getPoolMeta(pid)    { try { const r=await redis('GET',k(pid,'meta')); return r?JSON.parse(r):null; } catch { return null; } }

// ─── Auto-manage per pool ─────────────────────────────────────────────────────
async function autoManage(poolId) {
  try {
    const now = Date.now();

    // ── Auto-delete abandoned unpaid pools older than 24 hours ────────────────
    const meta = await getPoolMeta(poolId);
    if (meta && !meta.paid) {
      const age = now - new Date(meta.createdAt).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        const keys = ['meta','entries','payments','locked','picks_hidden','major'];
        await Promise.all(keys.map(k2 => redis('DEL', `pool:${poolId}:${k2}`)));
        await redis('SREM', 'pools:index', poolId);
        console.log(`[autoManage] Deleted abandoned pool ${poolId}`);
        return null;
      }
    }

    const MAJOR_SCHEDULE = await getMajorSchedule();
    const currentMajor = await getMajor(poolId);
    const idx = MAJOR_SCHEDULE.findIndex(m => m.key === currentMajor);
    if (idx === -1) return currentMajor;

    const current = MAJOR_SCHEDULE[idx];
    const teeTime = new Date(current.teeTime).getTime();
    const endTime  = new Date(current.endDate).getTime();
    const unlockTime = teeTime - UNLOCK_DAYS_BEFORE * 24 * 60 * 60 * 1000;

    if (now >= endTime) {
      const nextKey = MAJOR_SCHEDULE[(idx + 1) % MAJOR_SCHEDULE.length].key;
      const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
      if (entries.length > 0) {
        const year = new Date().getFullYear();
        const archiveKey = k(poolId, `archive:${currentMajor}_${year}`);
        let existingEarnings = {};
        try { const ex = await redis('GET', archiveKey); if (ex) existingEarnings = JSON.parse(ex).earnings || {}; } catch {}
        await redis('SET', archiveKey, JSON.stringify({
          major: currentMajor, year,
          archivedAt: new Date().toISOString(),
          entries, payments, earnings: existingEarnings,
        }));
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

    if (now >= unlockTime && now < teeTime) {
      const meta = await getPoolMeta(poolId);
      if (await getLocked(poolId) && meta?.paid) {
        await redis('SET', k(poolId,'locked'), 'false');
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

    return currentMajor;
  } catch (e) {
    console.error('[autoManage] error:', e.message);
    return null;
  }
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const poolId = new URL(request.url).searchParams.get('poolId') || 'default';
  try {
    await autoManage(poolId);
    const [entries, locked, picksHidden, payments, major, meta] = await Promise.all([
      getEntries(poolId), getLocked(poolId), getPicksHidden(poolId),
      getPayments(poolId), getMajor(poolId), getPoolMeta(poolId),
    ]);
    return Response.json({ entries, locked, picksHidden, payments, major, meta });
  } catch (err) {
    return Response.json({ entries:[], locked:false, picksHidden:true, payments:{}, major:'pga', error:err.message });
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
      const validPw = meta?.adminPassword || process.env.ADMIN_PASSWORD || 'masters2026';
      return pw === validPw;
    };

    if (body.action === 'submit') {
      const locked = await getLocked(poolId);
      if (locked) return Response.json({ error:'Entries are locked!' }, { status:403 });
      const { name, picks, email } = body;
      if (!name?.trim()) return Response.json({ error:'Name required' }, { status:400 });
      if (!email?.trim()) return Response.json({ error:'Email required' }, { status:400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Response.json({ error:'Invalid email' }, { status:400 });
      if (!picks || picks.length !== 9) return Response.json({ error:'9 picks required' }, { status:400 });
      const entries = await getEntries(poolId);
      if (entries.find(e=>e.name.toLowerCase()===name.trim().toLowerCase()))
        return Response.json({ error:'Name already taken!' }, { status:409 });

      // Generate 6-char edit code
      const editCode = Math.random().toString(36).slice(2,8).toUpperCase();

      entries.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        editCode,
        picks,
        ts: Date.now(),
      });
      await saveEntries(poolId, entries);

      // Send edit code email
      if (process.env.RESEND_API_KEY) {
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
                  <p><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open Pool</a></p>
                  <p style="font-size:12px;color:#888;margin-top:30px;">Save this email — you'll need the code if you want to edit your picks before the tournament starts.</p>
                </div>
              `,
            }),
          });
        } catch (e) { console.error('email send failed:', e.message); }
      }

      return Response.json({ ok:true, entries, codeSent:true });
    }

    if (body.action === 'edit-entry') {
      const locked = await getLocked(poolId);
      if (locked) return Response.json({ error:'Entries are locked — cannot edit' }, { status:403 });
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
      if (locked) return Response.json({ error:'Entries are locked' }, { status:403 });
      const { name, code, picks } = body;
      if (!name || !code) return Response.json({ error:'Name and code required' }, { status:400 });
      if (!picks || picks.length !== 9) return Response.json({ error:'9 picks required' }, { status:400 });
      const entries = await getEntries(poolId);
      const idx = entries.findIndex(e =>
        e.name.toLowerCase() === name.toLowerCase() &&
        e.editCode?.toUpperCase() === code.toUpperCase()
      );
      if (idx === -1) return Response.json({ error:'Invalid name or code' }, { status:404 });
      entries[idx].picks = picks;
      entries[idx].ts = Date.now();
      await saveEntries(poolId, entries);
      return Response.json({ ok:true, entries });
    }

    if (body.action === 'resend-code') {
      const { name, email } = body;
      if (!name?.trim() || !email?.trim()) return Response.json({ error:'Name and email required' }, { status:400 });
      const entries = await getEntries(poolId);
      const entry = entries.find(e =>
        e.name.toLowerCase() === name.trim().toLowerCase() &&
        e.email?.toLowerCase() === email.trim().toLowerCase()
      );
      if (!entry) return Response.json({ error:'No entry found with that name and email' }, { status:404 });

      if (process.env.RESEND_API_KEY) {
        const meta = await getPoolMeta(poolId);
        const poolName = meta?.poolName || 'Golf Pool';
        const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: entry.email,
              subject: `Your edit code for ${poolName} (resent)`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;">Your edit code</h2>
                  <p>Hey ${entry.name},</p>
                  <p>Here's your edit code for <b>${poolName}</b>:</p>
                  <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                    <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1a2a5c;">${entry.editCode}</div>
                  </div>
                  <p><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open Pool</a></p>
                </div>
              `,
            }),
          });
        } catch (e) { console.error('email send failed:', e.message); }
      }
      return Response.json({ ok:true });
    }

    if (body.action === 'claim-entry') {
      // Note: This works even when entries are locked since adding an email
      // doesn't change picks — it's just to enable chat verification
      const { name, email } = body;
      if (!name?.trim() || !email?.trim()) return Response.json({ error:'Name and email required' }, { status:400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Response.json({ error:'Invalid email' }, { status:400 });
      const entries = await getEntries(poolId);
      const idx = entries.findIndex(e => e.name.toLowerCase() === name.trim().toLowerCase());
      if (idx === -1) return Response.json({ error:'Entry not found' }, { status:404 });
      if (entries[idx].email) return Response.json({ error:'This entry already has an email — use Resend Code instead' }, { status:409 });

      const editCode = Math.random().toString(36).slice(2,8).toUpperCase();
      entries[idx].email = email.trim().toLowerCase();
      entries[idx].editCode = editCode;
      await saveEntries(poolId, entries);

      if (process.env.RESEND_API_KEY) {
        const meta = await getPoolMeta(poolId);
        const poolName = meta?.poolName || 'Golf Pool';
        const poolUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com'}/pool/${poolId}`;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: email.trim(),
              subject: `Your edit code for ${poolName}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;">Your edit code ⛳</h2>
                  <p>Hey ${entries[idx].name},</p>
                  <p>You've added your email to your existing entry in <b>${poolName}</b>.</p>
                  <p>You can now edit your picks before entries lock using this code:</p>
                  <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                    <div style="font-size:11px;color:#888;letter-spacing:1px;margin-bottom:6px;">YOUR EDIT CODE</div>
                    <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1a2a5c;">${editCode}</div>
                  </div>
                  <p><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Open Pool</a></p>
                </div>
              `,
            }),
          });
        } catch (e) { console.error('email send failed:', e.message); }
      }
      return Response.json({ ok:true });
    }

    if (body.action === 'delete-own') {
      const locked = await getLocked(poolId);
      if (locked) return Response.json({ error:'Cannot remove — tournament started!' }, { status:403 });
      const entries = await getEntries(poolId);
      const filtered = entries.filter(e=>e.name.toLowerCase()!==body.name?.toLowerCase());
      if (filtered.length===entries.length) return Response.json({ error:'Entry not found' }, { status:404 });
      await saveEntries(poolId, filtered);
      return Response.json({ ok:true, entries:filtered });
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
      return Response.json({ ok:true, messages });
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
      });
      while (messages.length > 100) messages.shift();
      // Store with 30-day TTL (auto-clear between tournaments)
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

    if (body.action==='delete') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const entries = await getEntries(poolId);
      await saveEntries(poolId, entries.filter(e=>e.name!==body.name));
      return Response.json({ ok:true, entries:entries.filter(e=>e.name!==body.name) });
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

    if (body.action==='save-archive-earnings') {
      if (body.password!=='auto' && !await checkAdmin(body.password))
        return Response.json({ error:'Wrong password' }, { status:401 });
      const { major, year, earnings } = body;
      const archiveKey = k(poolId, `archive:${major}_${year}`);
      try {
        const r = await redis('GET', archiveKey);
        if (r) { const a=JSON.parse(r); a.earnings=earnings; await redis('SET', archiveKey, JSON.stringify(a)); }
        else await redis('SET', archiveKey, JSON.stringify({ major, year, archivedAt:new Date().toISOString(), entries:[], payments:{}, earnings }));
      } catch {}
      return Response.json({ ok:true });
    }

    if (body.action==='get-archives-public') {
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = [2025,2026,2027,2028];
      const archives = [];
      for (const major of MAJORS) {
        for (const year of years) {
          try {
            const r = await redis('GET', k(poolId, `archive:${major}_${year}`));
            if (r) archives.push({ ...JSON.parse(r), payments:{} });
          } catch {}
        }
      }
      archives.sort((a,b) => new Date(b.archivedAt) - new Date(a.archivedAt));
      return Response.json({ ok:true, archives });
    }

    if (body.action==='get-archives') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = [2025,2026,2027,2028];
      const archives = [];
      for (const major of MAJORS) {
        for (const year of years) {
          try {
            const r = await redis('GET', k(poolId, `archive:${major}_${year}`));
            if (r) archives.push(JSON.parse(r));
          } catch {}
        }
      }
      archives.sort((a,b) => new Date(b.archivedAt) - new Date(a.archivedAt));
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
