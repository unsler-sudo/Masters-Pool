export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'masters2026';

async function redis(cmd, ...args) {
  const body = [cmd, ...args];
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Redis error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.result;
}

async function getEntries() {
  try {
    const raw = await redis('GET', 'pool:entries');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('getEntries error:', e);
    return [];
  }
}

async function saveEntries(entries) {
  await redis('SET', 'pool:entries', JSON.stringify(entries));
}

async function getLocked() {
  try {
    const raw = await redis('GET', 'pool:locked');
    return raw === 'true';
  } catch {
    return false;
  }
}

async function getPicksHidden() {
  try {
    const raw = await redis('GET', 'pool:picks_hidden');
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

// payments: { "Entry Name": true/false }
async function getPayments() {
  try {
    const raw = await redis('GET', 'pool:payments');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function savePayments(payments) {
  await redis('SET', 'pool:payments', JSON.stringify(payments));
}

// GET - fetch all entries + lock status + picks visibility + payments
export async function GET() {
  try {
    const [entries, locked, picksHidden, payments] = await Promise.all([
      getEntries(),
      getLocked(),
      getPicksHidden(),
      getPayments(),
    ]);
    return Response.json({ entries, locked, picksHidden, payments });
  } catch (err) {
    console.error('GET /api/entries error:', err);
    return Response.json({ entries: [], locked: false, picksHidden: true, payments: {}, error: err.message });
  }
}

// POST - submit entry or admin action
export async function POST(request) {
  try {
    const body = await request.json();

    // Submit new entry
    if (body.action === 'submit') {
      const locked = await getLocked();
      if (locked) return Response.json({ error: 'Entries are locked — tournament has started!' }, { status: 403 });

      const { name, picks } = body;
      if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });
      if (!picks || picks.length !== 9) return Response.json({ error: '9 picks required' }, { status: 400 });

      const entries = await getEntries();
      if (entries.find(e => e.name.toLowerCase() === name.trim().toLowerCase())) {
        return Response.json({ error: 'Name already taken!' }, { status: 409 });
      }

      entries.push({ name: name.trim(), picks, ts: Date.now() });
      await saveEntries(entries);
      return Response.json({ ok: true, entries });
    }

    // Delete own entry (no password, entries must not be locked)
    if (body.action === 'delete-own') {
      const locked = await getLocked();
      if (locked) return Response.json({ error: 'Cannot remove entry — tournament has started!' }, { status: 403 });

      const entries = await getEntries();
      const filtered = entries.filter(e => e.name.toLowerCase() !== body.name?.toLowerCase());
      if (filtered.length === entries.length) return Response.json({ error: 'Entry not found' }, { status: 404 });
      await saveEntries(filtered);
      return Response.json({ ok: true, entries: filtered });
    }

    // Admin: lock/unlock
    if (body.action === 'lock' || body.action === 'unlock') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      await redis('SET', 'pool:locked', body.action === 'lock' ? 'true' : 'false');
      return Response.json({ ok: true, locked: body.action === 'lock' });
    }

    // Admin: show/hide picks
    if (body.action === 'show-picks' || body.action === 'hide-picks') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      await redis('SET', 'pool:picks_hidden', body.action === 'hide-picks' ? 'true' : 'false');
      return Response.json({ ok: true, picksHidden: body.action === 'hide-picks' });
    }

    // Admin: delete any entry
    if (body.action === 'delete') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      const entries = await getEntries();
      const filtered = entries.filter(e => e.name !== body.name);
      await saveEntries(filtered);
      return Response.json({ ok: true, entries: filtered });
    }

    // Admin: mark paid
    if (body.action === 'mark-paid' || body.action === 'mark-unpaid') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      if (!body.entryName) return Response.json({ error: 'entryName required' }, { status: 400 });
      const payments = await getPayments();
      payments[body.entryName] = body.action === 'mark-paid';
      await savePayments(payments);
      return Response.json({ ok: true, payments });
    }

    // Admin: reset all
    if (body.action === 'reset') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      await redis('DEL', 'pool:entries');
      await redis('DEL', 'pool:locked');
      await redis('DEL', 'pool:picks_hidden');
      await redis('DEL', 'pool:payments');
      return Response.json({ ok: true, entries: [], payments: {} });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/entries error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
