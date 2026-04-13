export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CACHE_TTL   = 300;

// No column index map needed — we use .summary-{id}-col selectors directly

async function redisFetch(key) {
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

async function redisSet(key, value, ttl) {
  try {
    await fetch(REDIS_URL, {
      method:'POST', cache:'no-store',
      headers:{ Authorization:`Bearer ${REDIS_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
    });
  } catch {}
}

async function redisGet(key) { return redisFetch(key); }
async function redisDel(key) {
  try {
    await fetch(REDIS_URL, {
      method:'POST', cache:'no-store',
      headers:{ Authorization:`Bearer ${REDIS_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify(['DEL', key]),
    });
  } catch {}
}

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const major   = searchParams.get('major') || 'pga';
  const nocache = searchParams.get('nocache') === '1';
  const cacheKey = `pool:scraped_field:${major}`;

  // Serve cached result if fresh
  if (!nocache) {
    const cached = await redisFetch(cacheKey);
    if (cached?.players?.length > 0) return Response.json({ ...cached, fromCache: true });
  }

  // ── Global scrape lock — only ONE browser at a time across all majors ──────
  const lockKey = 'pool:scrape_lock_global';
  const isLocked = await redisGet(lockKey);
  if (isLocked) {
    const stale = await redisFetch(cacheKey);
    if (stale?.players?.length > 0) return Response.json({ ...stale, fromCache: true, note: 'lock-stale' });
    return Response.json({ players: [], major, error: 'Scrape in progress, retry in 30s' }, { status: 429 });
  }
  await redisSet(lockKey, '1', 55);

  let browser;
  try {
    const chromium  = (await import('@sparticuz/chromium')).default;
    const { chromium: pw } = await import('playwright-core');

    browser = await pw.launch({
      args: [...chromium.args, '--disable-blink-features=AutomationControlled'],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const ctx  = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.route('**/*', route => {
      const rt = route.request().resourceType();
      if (['font', 'media'].includes(rt)) return route.abort();
      route.continue();
    });

    // ── Scrape the SUMMARY page — all 5 majors in one browser launch ────────
    await page.goto('https://datagolf.com/major-fields?major=summary', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    });
    await page.waitForSelector('.datarow', { timeout: 15000 });

    // Extract all 5 major fields at once
    const allFields = await page.evaluate(() => {
      const datarows = Array.from(document.querySelectorAll('.datarow'));
      const fields = { players:[], masters:[], pga:[], usopen:[], open:[] };

      // DataGolf event IDs — confirmed from debug: summary-11-col, summary-14-col, etc.
      const majorSelectors = {
        players: '.summary-11-col',
        masters: '.summary-14-col',
        pga:     '.summary-33-col',
        usopen:  '.summary-26-col',
        open:    '.summary-100-col',
      };

      for (const row of datarows) {
        const searchName = row.getAttribute('search-name') || '';
        const parts = searchName.trim().split(/\s+/).filter(Boolean);
        if (parts.length < 2) continue;
        const lastName  = parts[parts.length - 1];
        const firstName = parts.slice(0, -1).join(' ');
        const cap = s => {
          if (!s) return '';
          // Handle initials like "j.j." → "J.J." or "y.e." → "Y.E."
          if (/^[a-z](\.[a-z])+\.?$/.test(s)) return s.toUpperCase();
          // Handle Mc/Mac prefixes: "mcilroy" → "McIlroy", "macintyre" → "MacIntyre"
          if (/^mc[a-z]/i.test(s)) return 'Mc' + s.charAt(2).toUpperCase() + s.slice(3).toLowerCase();
          if (/^mac[a-z]/i.test(s)) return 'Mac' + s.charAt(3).toUpperCase() + s.slice(4).toLowerCase();
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        };
        const name = `${cap(lastName)}, ${firstName.split(' ').map(cap).join(' ')}`;

        const flagImg = row.querySelector('img[src*="flag"], img[src*="flags"]');
        let country = 'USA';
        if (flagImg) {
          const m = (flagImg.getAttribute('src') || '').match(/\/([A-Z]{2,3})\.(png|svg|jpg)/i);
          if (m) country = m[1].toUpperCase();
        }

        // Extract DG rank number from the rank cell (colored box showing 1, 2, 3...)
        const rankCell = row.querySelector('.data.rank-col.dg-col, [class*="dg-col"], .rank-col');
        const dgRank   = rankCell ? parseInt(rankCell.textContent.trim(), 10) : 9999;

        Object.entries(majorSelectors).forEach(([majorKey, selector]) => {
          const cell = row.querySelector(selector);
          if (!cell) return;
          const cls = cell.className || '';
          const isConfirmed = cls.includes('locked-in') && !cls.includes('not-locked-in');
          const isOnTrack   = cls.includes('not-locked-in');

          if (isConfirmed) {
            fields[majorKey].push({ name, country, confirmed:true, onTrack:false, dgRank });
          } else if (isOnTrack) {
            fields[majorKey].push({ name, country, confirmed:false, onTrack:true, dgRank });
          }
        });
      }

      // Sort each major's field by DG rank ascending
      Object.keys(fields).forEach(k => {
        fields[k].sort((a, b) => (a.dgRank || 9999) - (b.dgRank || 9999));
      });

      return { fields, rowCount: datarows.length };
    });

    await browser.close();
    browser = null;
    await redisDel(lockKey);

    // Cache all 5 major fields in Redis
    const now = new Date().toISOString();
    for (const [m, players] of Object.entries(allFields.fields)) {
      if (players.length > 0) {
        await redisSet(`pool:scraped_field:${m}`, {
          players, major: m, scrapedAt: now,
          source: 'https://datagolf.com/major-fields?major=summary',
          debug: { playerCount: players.length, rowCount: allFields.rowCount },
        }, CACHE_TTL);
      }
    }

    // Return the requested major
    const requestedPlayers = allFields.fields[major] || [];
    return Response.json({
      players: requestedPlayers,
      major,
      scrapedAt: now,
      source: 'https://datagolf.com/major-fields?major=summary',
      debug: {
        rowCount: allFields.rowCount,
        allCounts: Object.fromEntries(Object.entries(allFields.fields).map(([k,v])=>[k,v.length])),
      },
    });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    await redisDel(lockKey);
    console.error('[scrape-field]', err.message);
    return Response.json({ error: err.message, players: [], debug: { threw: true } }, { status: 500 });
  }
}
