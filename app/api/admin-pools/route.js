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

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!PLATFORM_PW || password !== PLATFORM_PW)
      return Response.json({ error: 'Wrong password' }, { status: 401 });

    // Get all pool IDs from index
    const poolIds = await redis('SMEMBERS', 'pools:index') || [];

    // Load meta for each pool
    const pools = [];
    for (const poolId of poolIds) {
      try {
        const metaRaw = await redis('GET', `pool:${poolId}:meta`);
        if (!metaRaw) continue;
        const meta = JSON.parse(metaRaw);
        // Get entry count
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

    // Sort by createdAt descending
    pools.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalPools   = pools.length;
    const paidPools    = pools.filter(p => p.paid).length;
    const totalRevenue = paidPools * 10;

    return Response.json({ ok: true, pools, stats: { totalPools, paidPools, totalRevenue } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
