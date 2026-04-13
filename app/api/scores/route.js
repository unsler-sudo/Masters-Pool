export const dynamic = 'force-dynamic';

const DG_KEY = process.env.DATAGOLF_API_KEY || '';

export async function GET(request) {
  if (!DG_KEY) {
    return Response.json({ error: 'DATAGOLF_API_KEY not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'in-play';

  const urls = {
    'in-play':
      `https://feeds.datagolf.com/preds/in-play?tour=pga&odds_format=percent&file_format=json&key=${DG_KEY}`,
    'pre-tournament':
      `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=percent&file_format=json&key=${DG_KEY}`,
    'field-updates':
      `https://feeds.datagolf.com/field-updates?tour=pga&file_format=json&key=${DG_KEY}`,
    // Round-by-round strokes gained stats — used for player scorecards
    'live-stats':
      `https://feeds.datagolf.com/preds/live-tournament-stats?stats=sg_total,sg_putt,sg_arg,sg_app,sg_ott,driving_dist,driving_acc&round=event_avg&display=value&tour=pga&file_format=json&key=${DG_KEY}`,
  };

  const url = urls[endpoint];
  if (!url) return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return Response.json({ error: `DataGolf ${res.status}` }, { status: res.status });
    const data = await res.json();
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
