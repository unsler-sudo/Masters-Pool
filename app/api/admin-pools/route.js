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

    return Response.json({ ok: true, pools, stats: { totalPools, paidPools, totalRevenue } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
