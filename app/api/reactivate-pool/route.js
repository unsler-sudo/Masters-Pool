export const dynamic = 'force-dynamic';

const REDIS_URL      = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;
const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY;
const BYPASS_CODE    = process.env.ADMIN_BYPASS_CODE || '';
const POOL_PRICE     = parseInt(process.env.POOL_PRICE_CENTS || '1000');
const BASE_URL       = process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com';

const MAJOR_NAMES = {
  players: 'The Players Championship',
  masters: 'The Masters',
  pga:     'PGA Championship',
  usopen:  'U.S. Open',
  open:    'The Open Championship',
};

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
    const body = await request.json();
    const { poolId, bypassCode } = body;

    if (!poolId) return Response.json({ error:'poolId required' }, { status:400 });

    // Load pool meta
    const metaRaw = await redis('GET', `pool:${poolId}:meta`);
    if (!metaRaw) return Response.json({ error:'Pool not found' }, { status:404 });
    const meta = JSON.parse(metaRaw);

    const majorName = MAJOR_NAMES[meta.major] || meta.major;

    // ── Bypass code — free reactivation ──────────────────────────────────────
    if (bypassCode && bypassCode === BYPASS_CODE) {
      meta.paid   = true;
      meta.paidAt = new Date().toISOString();
      await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
      await redis('SET', `pool:${poolId}:locked`, 'false');
      return Response.json({ ok:true, free:true, poolUrl:`${BASE_URL}/pool/${poolId}` });
    }

    // ── Stripe Checkout ───────────────────────────────────────────────────────
    if (!STRIPE_SECRET) return Response.json({ error:'Stripe not configured' }, { status:500 });

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
        'line_items[0][price_data][product_data][name]': `${meta.poolName} — ${majorName}`,
        'line_items[0][price_data][product_data][description]': `Unlock ${majorName} for your golf pool`,
        'line_items[0][price_data][unit_amount]': String(POOL_PRICE),
        'line_items[0][quantity]':       '1',
        'success_url':                   `${BASE_URL}/pool/${poolId}?activated=1`,
        'cancel_url':                    `${BASE_URL}/pool/${poolId}`,
        'metadata[poolId]':              poolId,
        'allow_promotion_codes':         'true',
      }),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      return Response.json({ error: err.error?.message || 'Stripe error' }, { status:500 });
    }

    const session = await stripeRes.json();
    return Response.json({ ok:true, checkoutUrl: session.url });

  } catch (err) {
    console.error('reactivate-pool error:', err);
    return Response.json({ error: err.message }, { status:500 });
  }
}
