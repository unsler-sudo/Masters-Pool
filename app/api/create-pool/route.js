export const dynamic = 'force-dynamic';

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const BYPASS_CODE   = process.env.ADMIN_BYPASS_CODE || '';
const POOL_PRICE    = parseInt(process.env.POOL_PRICE_CENTS || '1000'); // $10.00
const BASE_URL      = process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com';

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

// Generate a random 8-char pool ID
function generatePoolId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length:8}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { poolName, commissionerName, adminPassword, major, bypassCode } = body;

    if (!poolName?.trim())         return Response.json({ error:'Pool name required' }, { status:400 });
    if (!commissionerName?.trim()) return Response.json({ error:'Your name required' }, { status:400 });
    if (!adminPassword?.trim())    return Response.json({ error:'Admin password required' }, { status:400 });
    if (!major)                    return Response.json({ error:'Major required' }, { status:400 });

    // Generate unique pool ID (retry if collision)
    let poolId;
    for (let i = 0; i < 5; i++) {
      const candidate = generatePoolId();
      const existing = await redis('GET', `pool:${candidate}:meta`);
      if (!existing) { poolId = candidate; break; }
    }
    if (!poolId) return Response.json({ error:'Could not generate pool ID' }, { status:500 });

    const meta = {
      poolId,
      poolName:         poolName.trim(),
      commissionerName: commissionerName.trim(),
      adminPassword:    adminPassword.trim(),
      major,
      paid:             false,
      active:           false,
      createdAt:        new Date().toISOString(),
    };

    // Save meta first (pending state)
    await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
    // Set initial major
    await redis('SET', `pool:${poolId}:major`, major);
    // Lock entries by default until paid + activated
    await redis('SET', `pool:${poolId}:locked`, 'true');
    await redis('SET', `pool:${poolId}:picks_hidden`, 'true');
    // Add to pools index
    await redis('SADD', 'pools:index', poolId);

    // ── Bypass code — skip payment (owner's free pools) ──────────────────────
    if (bypassCode && bypassCode === BYPASS_CODE) {
      meta.paid   = true;
      meta.active = true;
      await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
      await redis('SET', `pool:${poolId}:locked`, 'false');
      return Response.json({
        ok: true,
        poolId,
        poolUrl: `${BASE_URL}/pool/${poolId}`,
        free: true,
      });
    }

    // ── Stripe Checkout ───────────────────────────────────────────────────────
    if (!STRIPE_SECRET) {
      return Response.json({ error:'Stripe not configured' }, { status:500 });
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]':        'card',
        'mode':                          'payment',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `${poolName} — Golf Pool`,
        'line_items[0][price_data][product_data][description]': `Access to your private golf pool for all 2026 majors`,
        'line_items[0][price_data][unit_amount]': String(POOL_PRICE),
        'line_items[0][quantity]':       '1',
        'success_url':                   `${BASE_URL}/pool/${poolId}?activated=1`,
        'cancel_url':                    `${BASE_URL}?cancelled=1`,
        'metadata[poolId]':              poolId,
        'allow_promotion_codes':         'true',
      }),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      return Response.json({ error: err.error?.message || 'Stripe error' }, { status:500 });
    }

    const session = await stripeRes.json();
    return Response.json({ ok:true, poolId, checkoutUrl: session.url });

  } catch (err) {
    console.error('create-pool error:', err);
    return Response.json({ error: err.message }, { status:500 });
  }
}
