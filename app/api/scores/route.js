export const dynamic = 'force-dynamic';

const DG_KEY = process.env.DATAGOLF_API_KEY || '';

// DataGolf event IDs for the 4 majors + Players
const MAJOR_EVENT_IDS = {
  players: 11,
  masters: 14,
  pga:     33,
  usopen:  26,
  open:    100,
};

export async function GET(request) {
  if (!DG_KEY) {
    return Response.json({ error: 'DATAGOLF_API_KEY not set' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'in-play';
  const season   = searchParams.get('season') || new Date().getFullYear();

  // Standard documented DataGolf endpoints
  const urls = {
    'in-play':
      `https://feeds.datagolf.com/preds/in-play?tour=pga&odds_format=percent&file_format=json&key=${DG_KEY}`,
    'pre-tournament':
      `https://feeds.datagolf.com/preds/pre-tournament?tour=pga&odds_format=american&file_format=json&key=${DG_KEY}`,
    'field-updates':
      `https://feeds.datagolf.com/field-updates?tour=pga&file_format=json&key=${DG_KEY}`,
    'dg-rankings':
      `https://feeds.datagolf.com/preds/get-dg-rankings?file_format=json&key=${DG_KEY}`,
    'schedule':
      `https://feeds.datagolf.com/get-schedule?tour=pga&season=${season}&file_format=json&key=${DG_KEY}`,
    'live-stats':
      `https://feeds.datagolf.com/preds/live-tournament-stats?stats=sg_total,sg_putt,sg_arg,sg_app,sg_ott&round=event_avg&display=value&tour=pga&file_format=json&key=${DG_KEY}`,
    'hole-scores':
      `https://feeds.datagolf.com/preds/live-hole-scores?tour=pga&file_format=json&key=${DG_KEY}`,
  };

  const url = urls[endpoint];
  if (!url) return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return Response.json({ error: `DataGolf ${res.status}` }, { status: res.status });
    const data = await res.json();
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
