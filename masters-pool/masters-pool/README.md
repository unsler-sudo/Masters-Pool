# ⛳ Masters Pool 2026

A golf pool app for The Masters. Pick 9 golfers across 3 tiers, track live scores via DataGolf API.

## Quick Deploy (15 minutes)

### 1. Create a free Upstash Redis database
- Go to [upstash.com](https://upstash.com) → Sign up (free)
- Click **Create Database** → pick any region → create
- Copy your **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** from the dashboard

### 2. Deploy to Vercel
```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# From this project folder:
vercel

# Follow the prompts (Yes to everything)
# It will give you a URL like masters-pool-xxxxx.vercel.app
```

### 3. Set environment variables
In Vercel dashboard → your project → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `DATAGOLF_API_KEY` | `e5543f4dc47d788c7601c220c3f4` |
| `UPSTASH_REDIS_REST_URL` | (from step 1) |
| `UPSTASH_REDIS_REST_TOKEN` | (from step 1) |
| `ADMIN_PASSWORD` | (whatever you want) |

### 4. Redeploy
```bash
vercel --prod
```

### 5. Share the URL with your buddies!

## How It Works

- **Scores**: Auto-refreshes from DataGolf API every 60 seconds (server-side, no CORS issues)
- **Entries**: Stored in Upstash Redis (free tier: 10K commands/day)
- **Tiers**: 15 Favorites / 25 Contenders / 51 Longshots based on Vegas odds
- **Picks**: 3 from each tier = 9 total
- **Earnings**: Calculated from current positions using the official Masters payout table

## Admin

Use the password you set in `ADMIN_PASSWORD` to:
- Lock entries before Round 1
- Remove entries
- Reset the pool

## Local Development
```bash
# Copy env file and fill in your values
cp .env.example .env.local

# Install and run
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)
