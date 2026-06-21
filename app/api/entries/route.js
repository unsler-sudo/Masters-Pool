export const dynamic = 'force-dynamic';
// build: usopen-purse-22.5M-v143-20260618-1830

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const VALID_MAJORS = ['players','masters','pga','usopen','open','pgatour'];

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
const SRV_SIGNATURE_KEYS = ['sentry','pebble beach','genesis invitational','arnold palmer','rbc heritage','memorial','travelers'];
function srvIsSignature(eventName, purse) {
  const n = (eventName||'').toLowerCase();
  if (SRV_SIGNATURE_KEYS.some(k => n.includes(k))) return true;
  if (purse && purse >= 15000000) return true;
  return false;
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
function srvComputeEarnings(players, purse, eventName) {
  const useSig = srvIsSignature(eventName, purse);
  const table = useSig ? SRV_PAYOUT_SIGNATURE : SRV_PAYOUT_PGATOUR;
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
    if (meta?.pgaTourMode || (await redis('GET', `pool:${poolId}:major`)) === 'pgatour') {
      try {
        const year = new Date().getFullYear();
        const schedRes = await fetch(
          `https://feeds.datagolf.com/get-schedule?tour=pga&season=${year}&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (!schedRes.ok) return 'pgatour';
        const schedData = await schedRes.json();
        const events = (schedData.schedule || schedData.events || []).filter(e => e.start_date);

        // Find what event was active when this pool was last paid
        // We track the active event name on meta.currentPgatourEvent
        const ptRes = await fetch(
          `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
          { cache:'no-store', signal: AbortSignal.timeout(5000) }
        );
        if (!ptRes.ok) return 'pgatour';
        const ptData = await ptRes.json();
        const dgCurrentEventName = (ptData.event_name || '').toLowerCase();

        // What event did the pool last activate for? (stored when commissioner paid)
        const poolEventName = (meta?.currentPgatourEvent || '').toLowerCase();

        // First-time activation: just record current DG event and exit
        if (!poolEventName && dgCurrentEventName) {
          meta.currentPgatourEvent = ptData.event_name;
          await redis('SET', k(poolId,'meta'), JSON.stringify(meta));
          return 'pgatour';
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
            const inPlayUrl = `https://feeds.datagolf.com/preds/in-play?tour=pga&dead_heat=no&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`;
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
              // Also check timestamp — if last_updated > 12 hours ago, event is definitely over
              const lastUpdated = ipData.last_updated ? new Date(ipData.last_updated).getTime() : 0;
              const hoursStale = (now - lastUpdated) / (1000 * 60 * 60);
              const dataIsStale = lastUpdated > 0 && hoursStale > 12;
              priorEventConcluded = allR4Done || dataIsStale;
              console.log(`[pgatour rotation] event ${dgCurrentEventName} ≠ pool ${poolEventName}, R4done=${allR4Done}, stale=${dataIsStale}, concluded=${priorEventConcluded}`);
            }
          } catch (e) {
            console.log('[pgatour rotation] in-play check failed:', e.message);
            priorEventConcluded = false;
          }

          if (!inTuesdayWindow && !priorEventConcluded) return 'pgatour';

          // Archive results for the prior event
          const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
          if (entries.length > 0) {
            const slug = poolEventName.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
            const archiveKey = k(poolId, `archive:pgatour-${slug}_${year}`);

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
            const adminPurse = meta?.purses?.pgatour || null; // commissioner-set, if any
            const sigDefault = srvIsSignature(poolEventName, schedPurse) ? 20000000 : 9000000;
            const resolvedPurse = adminPurse || schedPurse || sigDefault;

            // Compute server-side earnings (keyed by normalized name), then map to each pick.
            let earningsByPick = existingEarnings;
            if (!existingHasMoney && finalInPlayPlayers && finalInPlayPlayers.length > 0) {
              const earnMap = srvComputeEarnings(finalInPlayPlayers, resolvedPurse, poolEventName);
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
            if (!logoUrl && concludedEvent?.event_id) {
              logoUrl = `https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:R000.png/tournaments/logos/R${String(concludedEvent.event_id).padStart(3,'0')}.png`;
              logoNoBg = false; logoHeight = 80;
            }

            await redis('SET', archiveKey, JSON.stringify({
              major: 'pgatour', eventName: meta.currentPgatourEvent, year,
              archivedAt: new Date().toISOString(),
              entries, payments, earnings: earningsByPick,
              entryFee: fee,
              prizes: prizes || null,
              logoUrl, logoNoBg, logoHeight,
              tournamentDate: existing?.tournamentDate || new Date().toISOString(),
              autoArchived: true,
            }));
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
      return 'pgatour';
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
        let existingEarnings = {};
        try { const ex = await redis('GET', archiveKey); if (ex) existingEarnings = JSON.parse(ex).earnings || {}; } catch {}
        // Get current entryFee before we reset for next major
        let currentEntryFee = 0;
        try { const m = await redis('GET', k(poolId,'meta')); if (m) currentEntryFee = JSON.parse(m).entryFee || 0; } catch {}
        await redis('SET', archiveKey, JSON.stringify({
          major: currentMajor, year,
          archivedAt: new Date().toISOString(),
          entries, payments, earnings: existingEarnings,
          entryFee: currentEntryFee,
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

  // Diagnostic mode: report what the rotation logic sees without running it
  if (diagnose) {
    try {
      const meta = await getPoolMeta(poolId);
      const year = new Date().getFullYear();
      const [ptRes, ipRes] = await Promise.all([
        fetch(`https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`, { cache:'no-store' }),
        fetch(`https://feeds.datagolf.com/preds/in-play?tour=pga&dead_heat=no&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`, { cache:'no-store' }),
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
      players: 25000000, masters: 22500000, pga: 20500000, usopen: 22500000, open: 17000000, pgatour: 9000000,
    };
    const purses = {};
    for (const m of Object.keys(PURSE_DEFAULTS)) {
      try {
        const stored = await redis('GET', `tournament:purse:${m}`);
        purses[m] = stored ? parseInt(stored, 10) : PURSE_DEFAULTS[m];
      } catch { purses[m] = PURSE_DEFAULTS[m]; }
    }

    return Response.json({ entries, locked, picksHidden, paymentsHidden, payments, major, meta, purses });
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
      const validPw = meta.adminPassword || process.env.ADMIN_PASSWORD || 'masters2026';
      return pw === validPw;
    };

    if (body.action === 'verify-admin') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      return Response.json({ ok:true });
    }

    if (body.action === 'submit') {
      const locked = await getLocked(poolId);
      if (locked) return Response.json({ error:'Entries are locked!' }, { status:403 });
      const { name, picks, email } = body;
      if (!name?.trim()) return Response.json({ error:'Name required' }, { status:400 });
      if (!email?.trim()) return Response.json({ error:'Email required' }, { status:400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Response.json({ error:'Invalid email' }, { status:400 });
      if (!picks || picks.length !== 10) return Response.json({ error:'10 picks required' }, { status:400 });
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
      // FINGERPRINT_V141_ROSTER — remember this player for future-pool invites
      await upsertRoster(poolId, name.trim(), email.trim().toLowerCase(), editCode);
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
      if (!picks || picks.length !== 10) return Response.json({ error:'10 picks required' }, { status:400 });
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
      // FINGERPRINT_V141_ROSTER
      await upsertRoster(poolId, entries[idx].name, email.trim().toLowerCase(), editCode);

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
        reactions: {},
      });
      while (messages.length > 100) messages.shift();
      // Store with 30-day TTL (auto-clear between tournaments)
      await redis('SETEX', k(poolId, 'chat'), 2592000, JSON.stringify(messages));
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
        const pat = `pool:${poolId}:archive:pgatour-*`;
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

      let sent = 0, failed = 0;
      // Send individually so each person gets a personal greeting (and we don't leak the email list)
      for (const p of roster) {
        if (!p.email) continue;
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: p.email,
              subject: `${poolName} is open for ${eventName} ⛳`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;">
                  <h2 style="color:#1a2a5c;margin-bottom:6px;">New week, new pool ⛳</h2>
                  <p>Hey ${p.name||'there'},</p>
                  <p><b>${poolName}</b> is now open for <b>${eventName}</b>.</p>
                  ${customNote ? `<p style="background:#f5f7fb;border-left:3px solid #1a2a5c;padding:10px 14px;margin:16px 0;">${customNote.replace(/</g,'&lt;')}</p>` : ''}
                  ${fee>0 ? `<p>Entry is <b>$${fee}</b>. Get your picks in before the first tee.</p>` : `<p>Get your picks in before the first tee.</p>`}
                  <p style="margin:22px 0;"><a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Make My Picks →</a></p>
                  <p style="font-size:12px;color:#888;margin-top:28px;">You're getting this because you entered a past ${poolName} pool. See you on the leaderboard.</p>
                </div>
              `,
            }),
          });
          if (res.ok) sent++; else failed++;
        } catch { failed++; }
      }
      return Response.json({ ok:true, sent, failed, total:roster.length });
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
      const archiveKey = (major === 'pgatour' && slug)
        ? k(poolId, `archive:pgatour-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      const archiveData = {
        major, year,
        eventName: eventName || undefined,
        archivedAt: new Date().toISOString(),
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
      const validMajors = ['players','masters','pga','usopen','open','pgatour'];
      if (!validMajors.includes(body.major)) {
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
        meta.pgaTourMode = body.major === 'pgatour';
        // When entering PGA Tour mode, capture the current DataGolf event so auto-rotation knows what we're on
        if (body.major === 'pgatour') {
          try {
            const ptRes = await fetch(
              `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${process.env.DATAGOLF_API_KEY}`,
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
      const archiveKey = (major === 'pgatour' && slug)
        ? k(poolId, `archive:pgatour-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
      const [entries, payments] = await Promise.all([getEntries(poolId), getPayments(poolId)]);
      const archiveData = {
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
      const archiveKey = (major === 'pgatour' && slug)
        ? k(poolId, `archive:pgatour-${slug}_${year}`)
        : k(poolId, `archive:${major}_${year}`);
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

    if (body.action==='get-archives-public') {
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = [2025,2026,2027,2028];
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
      // PGA Tour archives: archive:pgatour-{event-slug}_{year} — discover via SCAN
      try {
        let cursor = '0';
        do {
          const res = await redis('SCAN', cursor, 'MATCH', k(poolId, 'archive:pgatour-*'), 'COUNT', 100);
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
        if (a.major === 'pgatour' && b.major === 'pgatour') {
          return new Date(b.archivedAt||0) - new Date(a.archivedAt||0);
        }
        // pgatour events go after majors within the same year
        if (a.major === 'pgatour') return 1;
        if (b.major === 'pgatour') return -1;
        return (MAJOR_ORDER[b.major] || 0) - (MAJOR_ORDER[a.major] || 0);
      });
      return Response.json({ ok:true, archives });
    }

    if (body.action==='get-archives') {
      if (!await checkAdmin(body.password)) return Response.json({ error:'Wrong password' }, { status:401 });
      const MAJORS = ['players','masters','pga','usopen','open'];
      const years  = [2025,2026,2027,2028];
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
