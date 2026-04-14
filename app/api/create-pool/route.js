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

async function sendConfirmationEmail(meta, poolId) {
  if (!meta.commissionerEmail || !process.env.RESEND_API_KEY) return;
  const poolUrl = `${BASE_URL}/pool/${poolId}`;
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
          <p>Your golf pool <strong>${meta.poolName}</strong> is live and ready for <strong>${MAJOR_NAMES[meta.major]||meta.major}</strong>.</p>
          <p>Share this link with your group:</p>
          <div style="background:#f3f4f6;borderRadius:8px;padding:12px 16px;margin:16px 0;wordBreak:break-all;fontSize:14;fontWeight:600;color:#1a2a5c">
            ${poolUrl}
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${poolUrl}" style="background:#1a2a5c;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
              Go to Your Pool →
            </a>
          </div>
          <div style="background:#fef9e7;border:1px solid #f59e0b;border-radius:8px;padding:14px 16px;margin:20px 0">
            <p style="margin:0;font-size:13px;color:#92400e"><strong>Save your admin password:</strong><br/>
            Your pool ID is <code>${poolId}</code> and your admin password is the one you set at signup. Keep these safe — you'll need them to manage entries.</p>
          </div>
          <p style="color:#6b7280;font-size:12px">Join code for your pool: <strong>${meta.joinCode}</strong> — share this with people you want to join</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="color:#9ca3af;font-size:11px">Tuna Golf Pool · tunagolfpool.com · <a href="${BASE_URL}/terms" style="color:#9ca3af">Terms of Service</a></p>
        </div>
      `,
    }),
  }).catch(e => console.error('Confirmation email failed:', e.message));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { poolName, commissionerName, commissionerEmail, adminPassword, major, bypassCode } = body;

    if (!poolName?.trim())          return Response.json({ error:'Pool name required' }, { status:400 });
    if (!commissionerName?.trim())  return Response.json({ error:'Your name required' }, { status:400 });
    if (!commissionerEmail?.trim()) return Response.json({ error:'Your email required' }, { status:400 });
    if (!adminPassword?.trim())     return Response.json({ error:'Admin password required' }, { status:400 });
    if (!major)                     return Response.json({ error:'Major required' }, { status:400 });

    // Generate unique pool ID (retry if collision)
    let poolId;
    for (let i = 0; i < 5; i++) {
      const candidate = generatePoolId();
      const existing = await redis('GET', `pool:${candidate}:meta`);
      if (!existing) { poolId = candidate; break; }
    }
    if (!poolId) return Response.json({ error:'Could not generate pool ID' }, { status:500 });

    // Generate a 6-char join code (e.g. GOLF42)
    const joinCode = Array.from({length:6}, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]
    ).join('');

    const meta = {
      poolId,
      joinCode,
      poolName:          poolName.trim(),
      commissionerName:  commissionerName.trim(),
      commissionerEmail: commissionerEmail.trim().toLowerCase(),
      adminPassword:     adminPassword.trim(),
      major,
      paid:              false,
      active:            false,
      createdAt:         new Date().toISOString(),
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
      await sendConfirmationEmail(meta, poolId);
      return Response.json({
        ok: true, poolId, joinCode,
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
        'line_items[0][price_data][product_data][description]': `Access to your private golf pool for the current major`,
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
