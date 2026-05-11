// Vercel Cron — runs every 5 min, scrapes DataGolf, writes to Redis.
// Users never trigger this. The scrape-field route just reads from Redis.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET || '';
const CACHE_TTL   = 900; // 15 min — longer than cron interval so cache never goes stale

async function redisSet(key, value, ttl) {
  try {
    await fetch(REDIS_URL, {
      method:'POST', cache:'no-store',
      headers:{ Authorization:`Bearer ${REDIS_TOKEN}`, 'Content-Type':'application/json' },
      body: JSON.stringify(['SETEX', key, ttl, JSON.stringify(value)]),
    });
  } catch {}
}

export async function GET(request) {
  // Verify the request came from Vercel Cron (not a random user)
  const auth = request.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let browser;
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    const { chromium: pw } = await import('playwright-core');

    browser = await pw.launch({
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0',
        '--media-cache-size=0',
        '--aggressive-cache-discard',
        '--no-zygote',
      ],
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
      if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(rt)) return route.abort();
      route.continue();
    });

    let lastErr;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto('https://datagolf.com/major-fields?major=summary', {
          waitUntil: 'domcontentloaded', timeout: 30000,
        });
        await page.waitForSelector('.datarow', { timeout: 15000 });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await page.waitForTimeout(2000);
      }
    }
    if (lastErr) throw lastErr;

    const allFields = await page.evaluate(() => {
      const datarows = Array.from(document.querySelectorAll('.datarow'));
      const fields = { players:[], masters:[], pga:[], usopen:[], open:[] };

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
          if (/^[a-z](\.[a-z])+\.?$/.test(s)) return s.toUpperCase();
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

      Object.keys(fields).forEach(k => {
        fields[k].sort((a, b) => (a.dgRank || 9999) - (b.dgRank || 9999));
      });

      return { fields, rowCount: datarows.length };
    });

    await browser.close();
    browser = null;

    // Write all 5 majors to Redis with long TTL
    const now = new Date().toISOString();
    const results = {};
    for (const [m, players] of Object.entries(allFields.fields)) {
      if (players.length > 0) {
        const data = {
          players, major: m, scrapedAt: now,
          source: 'https://datagolf.com/major-fields?major=summary',
          debug: { playerCount: players.length, rowCount: allFields.rowCount },
        };
        await redisSet(`pool:scraped_field:${m}`, data, CACHE_TTL);
        results[m] = players.length;
      }
    }

    return Response.json({ ok: true, scrapedAt: now, counts: results });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[cron-scrape]', err.message);
    return Response.json({ error: err.message, debug: { threw: true } }, { status: 500 });
  }
}
