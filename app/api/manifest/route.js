// app/api/manifest/route.js — web app manifest (FINGERPRINT_V271_PUSH)
// Makes the site installable as a Home Screen app (full screen, own icon) — iPhones only allow
// notifications for sites opened that way. Per pool: an icon added from a pool page opens that pool.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const pool = String(new URL(request.url).searchParams.get('pool') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const manifest = {
    name: 'Tuna Golf Pool',
    short_name: 'Golf Pool',
    description: 'Your private golf pool — live leaderboard, picks and results.',
    start_url: pool ? `/pool/${pool}` : '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1a4d2e',
    theme_color: '#1a4d2e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
