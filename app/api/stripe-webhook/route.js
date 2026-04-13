export const dynamic = 'force-dynamic';

const REDIS_URL      = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;
const STRIPE_SECRET  = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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

// Verify Stripe webhook signature without the stripe npm package
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name:'HMAC', hash:'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return expected === signature;
}

export async function POST(request) {
  try {
    const payload   = await request.text();
    const sigHeader = request.headers.get('stripe-signature') || '';

    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      const valid = await verifyStripeSignature(payload, sigHeader, WEBHOOK_SECRET);
      if (!valid) return Response.json({ error:'Invalid signature' }, { status:400 });
    }

    const event = JSON.parse(payload);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const poolId  = session.metadata?.poolId;
      if (!poolId) return Response.json({ ok:true });

      // Activate the pool
      const metaRaw = await redis('GET', `pool:${poolId}:meta`);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        meta.paid   = true;
        meta.active = true;
        meta.paidAt = new Date().toISOString();
        meta.stripeSessionId = session.id;
        await redis('SET', `pool:${poolId}:meta`, JSON.stringify(meta));
      }

      // Unlock entries so people can start submitting
      await redis('SET', `pool:${poolId}:locked`, 'false');

      console.log(`[stripe-webhook] Pool ${poolId} activated`);
    }

    return Response.json({ ok:true });
  } catch (err) {
    console.error('stripe-webhook error:', err);
    return Response.json({ error:err.message }, { status:500 });
  }
}
