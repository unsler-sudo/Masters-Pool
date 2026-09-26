import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Tuna Golf Pool',
  description: 'Create your own private golf pool — majors, PGA Tour and DP World Tour events, and a Presidents Cup & Ryder Cup pick\'em, with a live money leaderboard.',
  // FINGERPRINT_V271_PUSH — installable Home Screen app (full screen, own icon). iPhones only allow
  // notifications for sites opened from the Home Screen this way.
  manifest: '/api/manifest',
  appleWebApp: { capable: true, title: 'Golf Pool', statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛳</text></svg>" />
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
