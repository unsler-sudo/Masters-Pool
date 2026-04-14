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

        // Send confirmation email
        if (meta.commissionerEmail && process.env.RESEND_API_KEY) {
          const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://tunagolfpool.com';
          const poolUrl  = `${BASE_URL}/pool/${poolId}`;
          const MAJOR_NAMES = {
            players:'The Players Championship', masters:'The Masters',
            pga:'PGA Championship', usopen:'U.S. Open', open:'The Open Championship',
          };
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Tuna Golf Pool <noreply@tunagolfpool.com>',
              to: meta.commissionerEmail,
              subject: `Your pool "${meta.poolName}" is live! ⛳`,
              html: `
                <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
                  <h2 style="color:#1a2a5c">Hey ${meta.commissionerName}! 🎉</h2>
                  <p>Payment confirmed! Your golf pool <strong>${meta.poolName}</strong> is live for <strong>${MAJOR_NAMES[meta.major]||meta.major}</strong>.</p>
                  <p>Share this link with your group:</p>
                  <div style="background:#f3f4f6;padding:12px 16px;margin:16px 0;font-size:14px;font-weight:600;color:#1a2a5c;word-break:break-all">
                    ${poolUrl}
                  </div>
                  <div style="text-align:center;margin:28px 0">
                    <a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
                      Go to Your Pool →
                    </a>
                  </div>
                  <div style="background:#fef9e7;border:1px solid #f59e0b;border-radius:8px;padding:14px 16px;margin:20px 0">
                    <p style="margin:0;font-size:13px;color:#92400e"><strong>Save your details:</strong><br/>
                    Pool ID: <code>${poolId}</code> · Join code: <strong>${meta.joinCode||'N/A'}</strong></p>
                  </div>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                  <p style="color:#9ca3af;font-size:11px">Tuna Golf Pool · tunagolfpool.com</p>
                </div>
              `,
            }),
          }).catch(e => console.error('Confirmation email failed:', e.message));
        }
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
