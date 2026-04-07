export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'masters2026';

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd, ...args]),
  });
  const data = await res.json();
  return data.result;
}

async function getEntries() {
  try {
    const raw = await redis('GET', 'pool:entries');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveEntries(entries) {
  await redis('SET', 'pool:entries', JSON.stringify(entries));
}

async function getLocked() {
  try {
    const raw = await redis('GET', 'pool:locked');
    return raw === 'true';
  } catch { return false; }
}

// GET - fetch all entries + lock status
export async function GET() {
  try {
    const entries = await getEntries();
    const locked = await getLocked();
    return Response.json({ entries, locked });
  } catch (err) {
    return Response.json({ entries: [], locked: false, error: err.message });
  }
}

// POST - submit entry or admin action
export async function POST(request) {
  try {
    const body = await request.json();

    // Submit new entry
    if (body.action === 'submit') {
      const locked = await getLocked();
      if (locked) return Response.json({ error: 'Entries are locked' }, { status: 403 });

      const { name, picks } = body;
      if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 });
      if (!picks || picks.length !== 9) return Response.json({ error: '9 picks required' }, { status: 400 });

      const entries = await getEntries();
      if (entries.find(e => e.name.toLowerCase() === name.trim().toLowerCase())) {
        return Response.json({ error: 'Name taken' }, { status: 409 });
      }

      entries.push({ name: name.trim(), picks, ts: Date.now() });
      await saveEntries(entries);
      return Response.json({ ok: true, entries });
    }

    // Admin: lock/unlock
    if (body.action === 'lock' || body.action === 'unlock') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      await redis('SET', 'pool:locked', body.action === 'lock' ? 'true' : 'false');
      return Response.json({ ok: true, locked: body.action === 'lock' });
    }

    // Admin: delete entry
    if (body.action === 'delete') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      const entries = await getEntries();
      const filtered = entries.filter(e => e.name !== body.name);
      await saveEntries(filtered);
      return Response.json({ ok: true, entries: filtered });
    }

    // Admin: reset all
    if (body.action === 'reset') {
      if (body.password !== ADMIN_PW) return Response.json({ error: 'Wrong password' }, { status: 401 });
      await redis('DEL', 'pool:entries');
      await redis('DEL', 'pool:locked');
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
