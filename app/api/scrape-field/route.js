// This route used to launch Chromium. Now it just reads from Redis.
// The actual scraping happens in /api/cron-scrape on a schedule.
// This makes user requests instant + bulletproof.

export const dynamic = 'force-dynamic';

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(key) {
  try {
    const r = await fetch(REDIS_URL, {
      method:'POST', cache:'no-store',
      headers:{ Authorization:`Bearer ${REDIS_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify(['GET', key]),
    });
    const d = await r.json();
    return d.result ? JSON.parse(d.result) : null;
  } catch { return null; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const major = searchParams.get('major') || 'pga';

  const cached = await redisGet(`pool:scraped_field:${major}`);

  if (cached?.players?.length > 0) {
    return Response.json({ ...cached, fromCache: true });
  }

  // No data in Redis yet — cron hasn't run yet or just rebooted
  return Response.json({
    players: [],
    major,
    error: 'Field data warming up — please refresh in a minute',
  });
}
