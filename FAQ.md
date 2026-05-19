# Tuna Golf Pool — FAQ

Welcome to the Tuna Golf Pool platform — a friend-run, real-money pool that runs through all five major golf championships of the year. This FAQ covers how the pool works, how to enter, how the scoring works, and how the platform handles everything automatically.

---

## 🏌️ The Basics

### What is this?

A multi-tenant golf pool platform where anyone can create their own pool that follows the five major championships:

- **The Players Championship** (March)
- **The Masters** (April)
- **PGA Championship** (May)
- **U.S. Open** (June)
- **The Open Championship** (July)

Each pool is private to its members. Pool commissioners control entry fees, settings, and prize structure.

### How do I join?

1. Get the pool URL from your commissioner
2. If the pool requires a join code, enter it
3. Click "Enter Pool" tab and submit your picks
4. Pay your entry fee to your commissioner (Venmo, cash, whatever)

### How does picking work?

Pick **9 golfers total** — 3 from each tier:

- **Tier A (Favorites):** Top 10 by odds — Scheffler, McIlroy, etc.
- **Tier B (Contenders):** Players ranked 11-40 by odds
- **Tier C (Longshots):** Everyone else in the field

Each picked golfer earns you their official tournament prize money. Whoever has the highest total at the end wins.

---

## 💰 Earnings & Payouts

### How are earnings calculated?

Earnings are based on each major's **official published payout structure** — the exact same dollars the PGA Tour pays out.

| Major | Winner's Share | Purse |
|-------|----------------|-------|
| 🌸 Masters | 20.0% | $22.5M |
| 🇺🇸 U.S. Open | 20.0% | $21.5M (2025) |
| 🏆 PGA Championship | 18.0% | $20.5M |
| 🏴 The Open | 18.24% | $17M |
| ⛳ The Players | 18.0% | $25M |

Tied positions split prize money like real golf — T4 in a 3-way tie share positions 4+5+6 evenly.

### What if my golfer ties for the lead during the tournament?

During live play, tied leaders **each show the full winner's share** (not split). This reflects each player's real upside — if any one of them wins outright, they get the full prize.

Example: PGA Championship, Round 4, two players tied at -10:
- Both show **$3,690,000** projected (not $2,952,000 split)

Once the tournament ends, the standard tied-split math applies for final settlement.

### What about the pool prize money?

Your commissioner sets the **entry fee** per pool. The total pot is calculated automatically:

- **🥇 1st place** = Pot − (entry fee × 3)
- **🥈 2nd place** = Entry fee × 2
- **🥉 3rd place** = Entry fee × 1

Example with 25 entries at $25:
- Pot: $625
- 1st: $550
- 2nd: $50
- 3rd: $25

---

## 🔐 Privacy & Security

### Do I need an account?

No. You enter your name, optionally an email, and get an **edit code** that lets you modify your picks before tee time. The edit code is also used to verify yourself for chat.

### How is the pool private?

Commissioners can enable a **join code** in admin settings. Anyone trying to access the pool will need to enter the code first. Share the code only with people you want in your pool.

### Who can see my picks?

By default, picks are **hidden until first tee time** to keep the pool fair. Once the tournament starts, all picks become visible to everyone in the pool.

Commissioners can toggle this behavior in admin settings.

---

## 🤖 Automation

The platform handles most things automatically.

### Tournament rotation

When a major ends, the pool auto-rotates to the next major in the schedule. This happens on the **Tuesday morning following the tournament** (6-12 PM ET window) to give the dust time to settle and prevent accidental mid-tournament rotations.

### Entry locking & unlocking

- **Locked automatically** when the major rotates (pool waits for next event)
- **Auto-unlocks at 9 AM ET Monday** of tournament week (when DataGolf odds release)
- **Re-locks at tee time** when the tournament starts Thursday morning

Commissioners can manually lock or unlock anytime in admin settings.

### Archive

After each tournament ends, results are archived permanently with:
- All entries and their picks
- Final payouts
- Pool prize money distribution
- Logos and branding frozen in time

Past results are viewable forever in the **History** tab.

---

## 💬 Chat

### How does chat work?

Each pool has its own group chat where members can post messages, reactions, and trash talk. To post:

1. Click the **Chat** tab
2. Verify with your name + edit code (from your entry confirmation)
3. Start typing

Chat is filtered to **current pool members only** — if you don't have an entry in the current major, you can read but not post.

### Why can I read but not post?

If you played the previous major but didn't enter the current one, you stay logged in (your browser remembers you) but the server won't accept new messages from you until you re-enter the pool.

Enter the current major's pool → start chatting again.

---

## 🎨 Customization

### Custom pool logos

Commissioners can set a custom logo for their pool that overrides the default major branding. Add a logo URL in admin settings, optionally toggle transparent background, and set the height.

### Custom entry fees

Each commissioner controls their pool's entry fee independently. Set in admin → updates pool prize calculations automatically.

---

## 🛠️ For Commissioners

### Creating a pool

1. Pay the $10 platform fee
2. Receive a pool ID and join code via email
3. Share the pool URL (and join code if private) with your friends

### Admin features

Login to the **Admin** tab in your pool with the password emailed to you:

- **Lock/unlock entries** manually
- **Hide/show picks**
- **Mark payments as received** (no real money handled by platform)
- **Edit pool name** and commissioner info
- **Set entry fee** for prize calculations
- **Set custom logo** and pool branding
- **Toggle join code requirement**
- **Set/change join code**
- **Save final results** archive at tournament end
- **Remove entries** if needed

### Platform admin

Pool commissioners can't see other pools. The platform admin (Tuna) manages:

- Tournament purses for all 5 majors
- Auto-rotation safeguards
- Platform-wide settings

---

## 📚 Historical Data

### Where can I see past tournaments?

The **History** tab shows all archived majors for your pool. Each card displays:

- Tournament logo (frozen in time — 2026 PGA shows Aronimink branding forever, etc.)
- Tournament date and entry count
- Pool prize money distribution
- Top 3 finishers with their picks and earnings

Tap any card to expand and see full standings with individual pick breakdowns.

### Will my results be saved forever?

Yes. Archives are stored permanently and don't auto-expire. Even if the pool stops running, the historical data remains accessible.

---

## 🆘 Troubleshooting

### I can't enter — pool is locked

Pool is locked outside the tournament week. Auto-unlocks Monday 9 AM ET of tournament week. Wait until then.

### I lost my edit code

Click "Lost your code?" on the chat or edit screen. If you provided an email at entry time, your code will be resent.

### Pool isn't loading / shows "Pool not found"

The pool may have been deleted. Contact your commissioner.

### Chat says I'm verified but won't let me post

You don't have an entry in the current major. Submit an entry and try again.

### Earnings look wrong

The platform uses each major's official published payout structure. If you're comparing to another source, make sure you're looking at the same year and same scoring positions. Tied positions split the combined prize money for those slots.

---

## 🚀 Tech Stack

For the curious:

- **Frontend:** Next.js 14 (App Router), React
- **Backend:** Vercel serverless functions, Upstash Redis
- **Live scores:** DataGolf API + custom scraper droplet
- **Hosted:** Vercel (frontend) + DigitalOcean (scraper)
- **Email:** Resend
- **Storage:** Redis (Upstash)
- **No database, no user accounts** — pools are isolated by `poolId`, members verified by edit code

---

## 📞 Contact

Built and maintained by Tuna. Questions or feature requests? Open an issue on GitHub or contact your commissioner.

⛳🍻
