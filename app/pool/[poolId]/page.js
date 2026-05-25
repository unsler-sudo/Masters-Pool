'use client';
// build: pretournament-sort-v74-20260525-2030
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

// ─── MAJOR THEMES — visual/branding only, schedule data fetched from DataGolf ─
// eventName, courseName, purse, teeTime are auto-populated from the schedule API
// Only update: emoji, tagline, and color scheme (these don't change year to year)
const THEMES = {
  players: {
    emoji:'⛳', tagline:"Golf's Fifth Major",
    logoUrl:'https://upload.wikimedia.org/wikipedia/en/5/5d/ThePlayersChampionshipLogo.png',
    logoNoBg:true,
    logoHeight:50,
    eventName:'The Players Championship', courseName:'TPC Sawgrass · Ponte Vedra Beach, FL',
    teeTime:'2027-03-11T12:00:00Z', purse:25000000,
    primary:'#0f3d5c', dark:'#1e7090', mid:'#3290b0', accent:'#c8a84b', accentLight:'#faf3e0',
    navBg:'#fff', navActive:'#edf4f8', navBorder:'#0f3d5c',
    headerBg:'linear-gradient(170deg,#1e7090 0%,#3290b0 35%,#4ca8c8 65%,#68bcd8 100%)',
    bg:'linear-gradient(180deg,#bfcfd8 0%,#edf4f8 300px)',
    bodyBg:'#edf4f8', cardBorder:'#c4d4dc', inputBorder:'#b4c8d4', stripeBg:'#f4f9fc', rowHl:'#e0eef6',
  },
  masters: {
    emoji:'🌸', tagline:'A Tradition Unlike Any Other',
    logoUrl:'https://upload.wikimedia.org/wikipedia/en/2/23/Masters_Logo.png',
    logoNoBg:true,
    eventName:'The Masters', courseName:'Augusta National Golf Club',
    teeTime:'2026-04-09T11:00:00Z', purse:22500000,
    primary:'#2d5016', dark:'#5a9030', mid:'#6ba83a', accent:'#d94878', accentLight:'#f9e8ef',
    navBg:'#fff', navActive:'#f5f0e8', navBorder:'#1e5010',
    headerBg:'linear-gradient(170deg,#5a9030 0%,#6ba83a 35%,#7cbc46 65%,#90d058 100%)',
    bg:'linear-gradient(180deg,#d8d3c4 0%,#f3efe6 300px)',
    bodyBg:'#f3efe6', cardBorder:'#cdc8b8', inputBorder:'#c8c3b5', stripeBg:'#faf8f3', rowHl:'#f0ebd6',
  },
  pga: {
    emoji:'🏆', tagline:'The Wanamaker Trophy',
    logoUrl: new Date().getFullYear() === 2026
      ? '/logos/pga-2026-aronimink.svg'
      : new Date().getFullYear() === 2027
        ? '/logos/pga-2027-frisco.svg'
        : 'https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:r000.png/tournaments/logos/r033.png',
    logoNoBg:false,
    eventName:'PGA Championship', courseName:'Aronimink Golf Club · Newtown Square, PA',
    teeTime:'2026-05-14T11:00:00Z', purse:20500000,
    primary:'#1a2a5c', dark:'#3a4a8c', mid:'#5060a0', accent:'#c9a84c', accentLight:'#faf3e0',
    navBg:'#fff', navActive:'#eef0f8', navBorder:'#1a2a5c',
    headerBg:'linear-gradient(170deg,#3a4a8c 0%,#5060a0 35%,#6878b8 65%,#7c8cc8 100%)',
    bg:'linear-gradient(180deg,#c4c8d8 0%,#eef0f8 300px)',
    bodyBg:'#eef0f8', cardBorder:'#c8ccdc', inputBorder:'#b8bcd0', stripeBg:'#f5f7fc', rowHl:'#e8ecf8',
  },
  usopen: {
    emoji:'🇺🇸', tagline:'The Hardest Test in Golf',
    logoUrl:'https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:r000.png/tournaments/logos/r026.png',
    logoNoBg:true,
    logoHeight:90,
    eventName:'U.S. Open', courseName:'Shinnecock Hills Golf Club · Southampton, NY',
    teeTime:'2026-06-18T11:00:00Z', purse:21500000,
    primary:'#1a2a5c', dark:'#3a4a8c', mid:'#a82828', accent:'#c83030', accentLight:'#fdeaea',
    navBg:'#fff', navActive:'#eceff6', navBorder:'#1a2a5c',
    headerBg:'linear-gradient(170deg,#3a4a8c 0%,#5060a0 30%,#a82828 65%,#c83030 100%)',
    bg:'linear-gradient(180deg,#c8cbd6 0%,#eceff6 300px)',
    bodyBg:'#eceff6', cardBorder:'#c4c8d8', inputBorder:'#b4b8cc', stripeBg:'#f4f6fb', rowHl:'#e8eaf5',
  },
  open: {
    emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', tagline:'The Oldest Major',
    logoUrl:'https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:r000.png/tournaments/logos/r100.png',
    eventName:'The Open Championship', courseName:'Royal Birkdale · Southport, England',
    teeTime:'2026-07-16T05:35:00Z', purse:17000000,
    primary:'#5a3e28', dark:'#7a5a3c', mid:'#9a7a58', accent:'#8a6a9a', accentLight:'#f0ecf5',
    navBg:'#fff', navActive:'#f5f1ec', navBorder:'#5a3e28',
    headerBg:'linear-gradient(170deg,#7a5a3c 0%,#9a7a58 35%,#b89a78 65%,#ccb898 100%)',
    bg:'linear-gradient(180deg,#cec8bc 0%,#f0ece2 300px)',
    bodyBg:'#f0ece2', cardBorder:'#d0c8bc', inputBorder:'#c4bdb0', stripeBg:'#f7f3ee', rowHl:'#ede5d8',
  },
  // ─── PGA TOUR MODE — generic theme for any current PGA Tour event ────────────
  // Activated via admin toggle. Pulls current event name/course from DataGolf live model.
  // Pool admins use this to run their pool on whichever PGA Tour event is happening this week.
  pgatour: {
    emoji:'🏌️', tagline:'PGA Tour Event',
    logoUrl:'/logos/pga-tour.svg',
    logoNoBg:true,
    logoHeight:90,
    eventName:'PGA Tour Event', courseName:'Current PGA Tour event',
    teeTime:null, purse:9000000,
    primary:'#1a3d76', dark:'#1f4a8c', mid:'#2c5ba8', accent:'#c8a84c', accentLight:'#faf3e0',
    navBg:'#fff', navActive:'#e8eef7', navBorder:'#1a3d76',
    headerBg:'linear-gradient(170deg,#1f4a8c 0%,#2c5ba8 35%,#3c70c0 65%,#5088d4 100%)',
    bg:'linear-gradient(180deg,#c4cee0 0%,#e8eef7 300px)',
    bodyBg:'#e8eef7', cardBorder:'#c4cee0', inputBorder:'#b4bcd0', stripeBg:'#eff4f9', rowHl:'#d8e2ef',
  },
};

// ─── Per-event theme overrides for PGA Tour Mode ─────────────────────────────
// Colors verified via sponsor brand guidelines, tournament traditions, and venue branding.
// Keyed by DataGolf's event_name (lowercased). Merges on top of base pgatour theme.
// To add a custom logo: drop in /public/logos/<event-key>.svg and uncomment logoUrl.
const PGATOUR_EVENT_THEMES = {
  // ─── JANUARY ───────────────────────────────────────────────────────────────
  'the sentry': {
    // Sentry Insurance brand: deep blue + gold accent; "blue chairs" tradition at Kapalua
    tagline:'Signature · Tournament of Champions',
    // logoUrl:'/logos/the-sentry.svg',
    primary:'#003a70', dark:'#0050a0', mid:'#0070c8', accent:'#fcb913',
    headerBg:'linear-gradient(170deg,#003a70 0%,#0070c8 50%,#3a90e0 100%)',
    bodyBg:'#e6eef7', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf3f9', rowHl:'#d0e0ef',
  },
  'sony open in hawaii': {
    // Sony brand: black/blue + Hawaii ocean teal
    tagline:'Aloha · Waialae Country Club',
    // logoUrl:'/logos/sony-open.svg',
    primary:'#005bbb', dark:'#0070d8', mid:'#0a8ae8', accent:'#00b4a0',
    headerBg:'linear-gradient(170deg,#005bbb 0%,#0a8ae8 50%,#3aa8f0 100%)',
    bodyBg:'#e6eef7', cardBorder:'#bcd0e0', inputBorder:'#abc0d4', stripeBg:'#edf3f9', rowHl:'#d0deef',
  },
  'the american express': {
    // AmEx official brand: layered blues (Earth Blue, Deep Aqua, Battery Charged)
    tagline:'PGA WEST · La Quinta',
    // logoUrl:'/logos/american-express.svg',
    primary:'#2e77bb', dark:'#1d8ece', mid:'#27aee3', accent:'#9bd4f5',
    headerBg:'linear-gradient(170deg,#2e77bb 0%,#27aee3 50%,#6cc4ee 100%)',
    bodyBg:'#e6f0f7', cardBorder:'#b8d0e0', inputBorder:'#a8c0d4', stripeBg:'#edf4f9', rowHl:'#d4e4ef',
  },

  // ─── FEBRUARY ──────────────────────────────────────────────────────────────
  'farmers insurance open': {
    // Farmers trademark: light blue + dark blue + red + white
    tagline:'Torrey Pines · Pacific Cliffs',
    // logoUrl:'/logos/farmers-insurance.svg',
    primary:'#003c80', dark:'#005ba8', mid:'#0080d4', accent:'#d12028',
    headerBg:'linear-gradient(170deg,#003c80 0%,#0080d4 50%,#3aa0e0 100%)',
    bodyBg:'#e6eff7', cardBorder:'#b8d0e0', inputBorder:'#a8c0d4', stripeBg:'#edf4f9', rowHl:'#d0e0ef',
  },
  'wm phoenix open': {
    // Waste Management brand: green + yellow ("Greenest Show on Grass")
    tagline:"The People's Open",
    // logoUrl:'/logos/wm-phoenix.svg',
    primary:'#00833e', dark:'#0a9c50', mid:'#15b568', accent:'#ffd700',
    headerBg:'linear-gradient(170deg,#00833e 0%,#15b568 50%,#48cc88 100%)',
    bodyBg:'#e6f1e8', cardBorder:'#b8d4c2', inputBorder:'#a8c4b2', stripeBg:'#edf6f0', rowHl:'#d0e6d8',
  },
  "at&t pebble beach pro-am": {
    // AT&T brand: deep blue
    tagline:'Signature · Pebble Beach Golf Links',
    // logoUrl:'/logos/pebble-beach.svg',
    primary:'#00a8e0', dark:'#0089c0', mid:'#00b9f0', accent:'#005a8a',
    headerBg:'linear-gradient(170deg,#00598a 0%,#0089c0 50%,#00b9f0 100%)',
    bodyBg:'#e6f1f9', cardBorder:'#b8d2e4', inputBorder:'#a8c2d8', stripeBg:'#edf5fa', rowHl:'#d0e2f0',
  },
  'the genesis invitational': {
    // Genesis Motor luxury brand: black + silver + copper accents (and Tiger's red)
    tagline:"Signature · Tiger's Tournament",
    // logoUrl:'/logos/genesis.svg',
    primary:'#0d0d0d', dark:'#1f1f1f', mid:'#3a3a3a', accent:'#b8000a',
    headerBg:'linear-gradient(170deg,#0d0d0d 0%,#3a3a3a 50%,#6a6a6a 100%)',
    bodyBg:'#ebebeb', cardBorder:'#c4c4c4', inputBorder:'#b4b4b4', stripeBg:'#f4f4f4', rowHl:'#dcdcdc',
  },

  // ─── MARCH ─────────────────────────────────────────────────────────────────
  'cognizant classic in the palm beaches': {
    // Cognizant brand: blue + orange
    tagline:'PGA National · Champion Course',
    // logoUrl:'/logos/cognizant.svg',
    primary:'#0033a0', dark:'#0045c0', mid:'#1565d0', accent:'#f58220',
    headerBg:'linear-gradient(170deg,#0033a0 0%,#1565d0 50%,#4a8ce0 100%)',
    bodyBg:'#e6ecf5', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf2f9', rowHl:'#d0deef',
  },
  'arnold palmer invitational presented by mastercard': {
    // Arnold Palmer: iconic red cardigan, 4-color umbrella (red/yellow/blue/green)
    tagline:"Signature · The King's Tournament",
    // logoUrl:'/logos/arnold-palmer.svg',
    primary:'#c8302e', dark:'#a02424', mid:'#dc4844', accent:'#ffd700',
    headerBg:'linear-gradient(170deg,#a02424 0%,#dc4844 50%,#ec6464 100%)',
    bodyBg:'#fbe7e7', cardBorder:'#e8c0c0', inputBorder:'#d8b0b0', stripeBg:'#fcf0f0', rowHl:'#f5dadc',
  },
  'puerto rico open': {
    // Puerto Rico flag colors: red + white + blue + tropical accents
    tagline:'Tropical · Grand Reserve',
    // logoUrl:'/logos/puerto-rico-open.svg',
    primary:'#0050a0', dark:'#003a78', mid:'#1070c8', accent:'#ed1c2e',
    headerBg:'linear-gradient(170deg,#003a78 0%,#1070c8 50%,#4a98e0 100%)',
    bodyBg:'#e6ecf5', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf2f9', rowHl:'#d0deef',
  },
  'valspar championship': {
    // Valspar paint brand: orange + yellow; "Snake Pit" theme at Copperhead
    tagline:'Snake Pit · Copperhead Course',
    // logoUrl:'/logos/valspar.svg',
    primary:'#f47b20', dark:'#d8651c', mid:'#f89030', accent:'#1c5e2a',
    headerBg:'linear-gradient(170deg,#d8651c 0%,#f89030 50%,#fab068 100%)',
    bodyBg:'#fcefd9', cardBorder:'#e8d0a8', inputBorder:'#d8c098', stripeBg:'#fdf4e6', rowHl:'#f5e0bc',
  },
  "texas children's houston open": {
    // Texas Children's Hospital brand: red + white
    tagline:'Memorial Park · Houston',
    // logoUrl:'/logos/houston-open.svg',
    primary:'#cc0000', dark:'#a80000', mid:'#dc1818', accent:'#ffd700',
    headerBg:'linear-gradient(170deg,#a80000 0%,#dc1818 50%,#ec4040 100%)',
    bodyBg:'#fbe5e5', cardBorder:'#e8bcbc', inputBorder:'#d8acac', stripeBg:'#fcedef', rowHl:'#f5d8d8',
  },

  // ─── APRIL ─────────────────────────────────────────────────────────────────
  'valero texas open': {
    // Valero Energy: navy blue + red + yellow
    tagline:'TPC San Antonio · Oaks Course',
    // logoUrl:'/logos/valero-texas-open.svg',
    primary:'#003a70', dark:'#002c54', mid:'#0050a0', accent:'#fbb917',
    headerBg:'linear-gradient(170deg,#002c54 0%,#0050a0 50%,#3a78c0 100%)',
    bodyBg:'#e6eff7', cardBorder:'#b8d0e0', inputBorder:'#a8c0d4', stripeBg:'#edf4f9', rowHl:'#d0e0ef',
  },
  'rbc heritage': {
    // RBC Royal Bank: blue + yellow + iconic plaid tartan jacket (Harbour Town green/red plaid)
    tagline:'Signature · Plaid Jacket',
    // logoUrl:'/logos/rbc-heritage.svg',
    primary:'#003168', dark:'#00427c', mid:'#0058a0', accent:'#fdb913',
    headerBg:'linear-gradient(170deg,#003168 0%,#0058a0 50%,#3a80c8 100%)',
    bodyBg:'#e6ecf5', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf2f9', rowHl:'#d0deef',
  },
  'zurich classic of new orleans': {
    // Zurich Insurance: blue (Zurich Blue) + white
    tagline:'Team Event · TPC Louisiana',
    // logoUrl:'/logos/zurich-classic.svg',
    primary:'#2167ae', dark:'#1853a0', mid:'#3a80c8', accent:'#3aa8dc',
    headerBg:'linear-gradient(170deg,#1853a0 0%,#3a80c8 50%,#6ca0dc 100%)',
    bodyBg:'#e6ecf5', cardBorder:'#bccae0', inputBorder:'#abbad4', stripeBg:'#eef2f9', rowHl:'#d4dcef',
  },

  // ─── MAY ───────────────────────────────────────────────────────────────────
  'miami championship': {
    // Doral Blue Monster + Miami Vice teal/pink
    tagline:'Signature · Blue Monster',
    // logoUrl:'/logos/miami-championship.svg',
    primary:'#0a4a7c', dark:'#06365e', mid:'#1264a0', accent:'#ec6090',
    headerBg:'linear-gradient(170deg,#06365e 0%,#1264a0 50%,#4a90c8 100%)',
    bodyBg:'#e6eef5', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf3f9', rowHl:'#d0deef',
  },
  'truist championship': {
    // Truist Bank brand: purple/violet (Truist Purple #2E1A47) + amber accent
    tagline:'Signature · Quail Hollow',
    // logoUrl:'/logos/truist.svg',
    primary:'#430098', dark:'#2e1a47', mid:'#5b1ccc', accent:'#f5b942',
    headerBg:'linear-gradient(170deg,#2e1a47 0%,#430098 50%,#7048d4 100%)',
    bodyBg:'#ece5f3', cardBorder:'#c8b8d8', inputBorder:'#b8a8c8', stripeBg:'#f3edf8', rowHl:'#dccced',
  },
  'oneflight myrtle beach classic': {
    // Coastal SC: ocean teal + sand
    tagline:'Coastal · Dunes Club',
    // logoUrl:'/logos/myrtle-beach.svg',
    primary:'#0a7ba8', dark:'#0894c4', mid:'#1ca8d8', accent:'#f5b942',
    headerBg:'linear-gradient(170deg,#0a7ba8 0%,#1ca8d8 50%,#48c4e8 100%)',
    bodyBg:'#e6f1f9', cardBorder:'#b8d4e4', inputBorder:'#a8c4d4', stripeBg:'#edf5fa', rowHl:'#d0e6f0',
  },
  'the cj cup byron nelson': {
    // CJ Group corporate: navy + bright red (CJ logo)
    tagline:'TPC Craig Ranch · Texas',
    // logoUrl:'/logos/cj-cup.svg',
    primary:'#003478', dark:'#002354', mid:'#0050a0', accent:'#e60012',
    headerBg:'linear-gradient(170deg,#002354 0%,#0050a0 50%,#3878c0 100%)',
    bodyBg:'#e6edf5', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf2f9', rowHl:'#d0deef',
  },
  'charles schwab challenge': {
    // Charles Schwab brand: light blue (#00A0DC) + Colonial tartan red/yellow tradition
    tagline:'Colonial · Tartan Tradition',
    // logoUrl:'/logos/charles-schwab.svg',
    primary:'#00a0dc', dark:'#0085b8', mid:'#1cb4e8', accent:'#003a78',
    headerBg:'linear-gradient(170deg,#0085b8 0%,#1cb4e8 50%,#48c8f0 100%)',
    bodyBg:'#e6f1f9', cardBorder:'#b8d8ec', inputBorder:'#a8c8dc', stripeBg:'#edf5fa', rowHl:'#d0e6f0',
  },

  // ─── JUNE ──────────────────────────────────────────────────────────────────
  'the memorial tournament presented by workday': {
    // Memorial yellow tradition (Jack Nicklaus yellow shirt, Play Yellow CMN campaign)
    tagline:"Signature · Jack's Tournament",
    // logoUrl:'/logos/memorial.svg',
    primary:'#fcb913', dark:'#e8a30c', mid:'#ffc828', accent:'#0a3d1f',
    headerBg:'linear-gradient(170deg,#e8a30c 0%,#fcb913 50%,#ffd45c 100%)',
    bodyBg:'#fcf3d8', cardBorder:'#e8d098', inputBorder:'#d8c088', stripeBg:'#fdf7e3', rowHl:'#f5e8bc',
  },
  'rbc canadian open': {
    // Canadian flag red + RBC blue
    tagline:'Oh Canada · Osprey Valley',
    // logoUrl:'/logos/rbc-canadian.svg',
    primary:'#ff0000', dark:'#cc0000', mid:'#e82020', accent:'#003168',
    headerBg:'linear-gradient(170deg,#cc0000 0%,#e82020 50%,#f04848 100%)',
    bodyBg:'#fce5e7', cardBorder:'#e8bcc0', inputBorder:'#d8acb0', stripeBg:'#fcedef', rowHl:'#f5d8db',
  },
  'travelers championship': {
    // Travelers Insurance: iconic red umbrella
    tagline:'Signature · TPC River Highlands',
    // logoUrl:'/logos/travelers.svg',
    primary:'#cd1e25', dark:'#a01820', mid:'#dc3030', accent:'#003366',
    headerBg:'linear-gradient(170deg,#a01820 0%,#cd1e25 50%,#e84848 100%)',
    bodyBg:'#fce5e7', cardBorder:'#e8bcc0', inputBorder:'#d8acb0', stripeBg:'#fcedef', rowHl:'#f5d8db',
  },

  // ─── JULY ──────────────────────────────────────────────────────────────────
  'john deere classic': {
    // John Deere brand: iconic green + yellow
    tagline:'TPC Deere Run · Silvis',
    // logoUrl:'/logos/john-deere.svg',
    primary:'#367c2b', dark:'#2c6624', mid:'#48953a', accent:'#ffde00',
    headerBg:'linear-gradient(170deg,#2c6624 0%,#367c2b 50%,#48953a 100%)',
    bodyBg:'#ebf2e8', cardBorder:'#c4d4bc', inputBorder:'#b4c4ac', stripeBg:'#f0f6ec', rowHl:'#dae6d0',
  },
  'isco championship': {
    // ISCO Industries: blue + orange
    tagline:'Korn Ferry Crossover · Hurstbourne',
    // logoUrl:'/logos/isco.svg',
    primary:'#003a70', dark:'#0050a0', mid:'#1070c0', accent:'#f58220',
    headerBg:'linear-gradient(170deg,#003a70 0%,#1070c0 50%,#3a90d8 100%)',
    bodyBg:'#e6eef7', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf3f9', rowHl:'#d0deef',
  },
  'corales puntacana championship': {
    // Caribbean turquoise + sand + tropical sunset
    tagline:'Caribbean · Punta Cana',
    // logoUrl:'/logos/corales.svg',
    primary:'#00a8b8', dark:'#008898', mid:'#1cbccc', accent:'#ff9433',
    headerBg:'linear-gradient(170deg,#00a8b8 0%,#1cbccc 50%,#48d0dc 100%)',
    bodyBg:'#e6f4f6', cardBorder:'#b8d8dc', inputBorder:'#a8c8cc', stripeBg:'#edf7f8', rowHl:'#d0eaee',
  },
  'genesis scottish open': {
    // Scottish flag blue (Saltire) + Genesis luxury black accent
    tagline:'Links Golf · Renaissance Club',
    // logoUrl:'/logos/scottish-open.svg',
    primary:'#005eb8', dark:'#004a96', mid:'#1278d4', accent:'#ffffff',
    headerBg:'linear-gradient(170deg,#004a96 0%,#005eb8 50%,#3a82d4 100%)',
    bodyBg:'#e6eef9', cardBorder:'#b8cce8', inputBorder:'#a8bcd8', stripeBg:'#edf3fa', rowHl:'#d0deef',
  },
  '3m open': {
    // 3M brand: red + black
    tagline:'TPC Twin Cities · Minnesota',
    // logoUrl:'/logos/3m-open.svg',
    primary:'#ed1a3b', dark:'#c41530', mid:'#f53050', accent:'#1a1a1a',
    headerBg:'linear-gradient(170deg,#c41530 0%,#ed1a3b 50%,#f54860 100%)',
    bodyBg:'#fce5e8', cardBorder:'#e8bcc4', inputBorder:'#d8acb4', stripeBg:'#fcedef', rowHl:'#f5d8de',
  },

  // ─── AUGUST ────────────────────────────────────────────────────────────────
  'rocket classic': {
    // Rocket Companies brand: red + black ("Rocket Red")
    tagline:'Detroit Golf Club',
    // logoUrl:'/logos/rocket-classic.svg',
    primary:'#c8102e', dark:'#a00820', mid:'#dc1830', accent:'#1a1a1a',
    headerBg:'linear-gradient(170deg,#a00820 0%,#c8102e 50%,#e84048 100%)',
    bodyBg:'#fce5e7', cardBorder:'#e8bcc0', inputBorder:'#d8acb0', stripeBg:'#fcedef', rowHl:'#f5d8db',
  },
  'wyndham championship': {
    // Wyndham Hotels brand: blue + yellow gold
    tagline:'Sedgefield · Donald Ross Classic',
    // logoUrl:'/logos/wyndham.svg',
    primary:'#1b3a6f', dark:'#0f2855', mid:'#2c52a0', accent:'#f9a826',
    headerBg:'linear-gradient(170deg,#0f2855 0%,#1b3a6f 50%,#3a5fa8 100%)',
    bodyBg:'#e6eaf3', cardBorder:'#b8c2dc', inputBorder:'#a8b2cc', stripeBg:'#edf0f7', rowHl:'#d0d8eb',
  },
  'fedex st. jude championship': {
    // FedEx brand: purple + orange (iconic)
    tagline:'FedEx Cup Playoff #1',
    // logoUrl:'/logos/fedex-st-jude.svg',
    primary:'#4d148c', dark:'#3a0e6e', mid:'#6020a8', accent:'#ff6600',
    headerBg:'linear-gradient(170deg,#3a0e6e 0%,#4d148c 50%,#7028a8 100%)',
    bodyBg:'#ede5f3', cardBorder:'#cab8dc', inputBorder:'#baa8cc', stripeBg:'#f3edf8', rowHl:'#dacced',
  },
  'bmw championship': {
    // BMW brand: blue + white + light blue (BMW roundel)
    tagline:'FedEx Cup Playoff #2',
    // logoUrl:'/logos/bmw-championship.svg',
    primary:'#0066b1', dark:'#004080', mid:'#1c7ec8', accent:'#c8d4e0',
    headerBg:'linear-gradient(170deg,#004080 0%,#0066b1 50%,#3a8ad4 100%)',
    bodyBg:'#e6eef7', cardBorder:'#b8cce0', inputBorder:'#a8bcd0', stripeBg:'#edf3f9', rowHl:'#d0deef',
  },
  'tour championship': {
    // East Lake/FedEx Cup gold + Atlanta colors
    tagline:'FedEx Cup Finale · East Lake',
    // logoUrl:'/logos/tour-championship.svg',
    primary:'#cba135', dark:'#a8841c', mid:'#dcb848', accent:'#0a3d1f',
    headerBg:'linear-gradient(170deg,#a8841c 0%,#cba135 50%,#dcb848 100%)',
    bodyBg:'#f5ecd0', cardBorder:'#dccba0', inputBorder:'#ccbb90', stripeBg:'#faf3df', rowHl:'#ecdcb0',
  },
};

const DG_EVENT_IDS = { 11:'players', 14:'masters', 33:'pga', 26:'usopen', 100:'open' };

const TIER_DEFS = [
  { id:1, name:'Favorites',  label:'Group A — Favorites',  color:'#b8960c', picks:2 },
  { id:2, name:'Contenders', label:'Group B — Contenders', color:'#1a2a5c', picks:4 },
  { id:3, name:'Longshots',  label:'Group C — Longshots',  color:'#6b4c9a', picks:4 },
];
const TOTAL_PICKS = 10;

// Tier cutoffs by major — Masters has a smaller field (~90 players) so cuts scale down
// Format: [tier A max rank, tier B max rank] — anyone ranked higher is Tier C
const TIER_CUTS_BY_MAJOR = {
  pga:     [12, 68],   // Top 12 favorites, 13-68 contenders (56), 69+ longshots
  usopen:  [12, 68],
  open:    [12, 68],
  players: [12, 68],
  masters: [12, 36],   // Top 12 favorites, 13-36 contenders (24), 37+ longshots
  pgatour: [12, 56],   // Smaller fields for signature events (~70 players)
};
const TIER_CUTS = [12, 68]; // Default fallback (matches standard majors)

// Per-major payout distribution percentages
// PGA Championship: Per PGA of America 2026 distribution (verified against $3.69M winner / $20.5M purse)
// US Open: Per USGA 2025 distribution
// The Open: Per R&A 2025 distribution  
// Masters: Per Augusta National (Masters has slightly different — uses % of $20M base + bonuses)
// The Players: Standard PGA Tour event distribution
// PGA Championship payout distribution
// Percentages derived from official 2026 PGA Championship dollar amounts ($20.5M purse)
// Each percentage * purse = exact official payout
// This table works for any future PGA Championship purse — just multiply by that year's purse
const PAYOUT_PGA = {
  1:0.18000000,2:0.10800000,3:0.06800000,4:0.04800000,5:0.04000000,
  6:0.03549268,7:0.03322195,8:0.03104390,9:0.02896098,10:0.02697561,
  11:0.02508098,12:0.02328293,13:0.02157902,14:0.01997024,15:0.01845561,
  16:0.01703610,17:0.01571122,18:0.01448049,19:0.01334488,20:0.01230390,
  21:0.01135756,22:0.01050585,23:0.00974829,24:0.00913317,25:0.00854195,
  26:0.00797366,27:0.00742976,28:0.00690927,29:0.00641220,30:0.00593902,
  31:0.00556049,32:0.00522927,33:0.00494537,34:0.00470878,35:0.00451951,
  36:0.00433951,37:0.00416439,38:0.00399415,39:0.00382829,40:0.00366732,
  41:0.00351122,42:0.00336000,43:0.00321317,44:0.00307122,45:0.00293415,
  46:0.00280146,47:0.00267366,48:0.00255073,49:0.00243220,50:0.00231902,
  51:0.00220976,52:0.00210585,53:0.00200634,54:0.00191171,55:0.00182195,
  56:0.00173659,57:0.00165610,58:0.00159024,59:0.00153317,60:0.00148585,
  61:0.00144829,62:0.00142049,63:0.00139707,64:0.00137463,65:0.00135317,
  66:0.00133220,67:0.00131171,68:0.00129171,69:0.00127220,70:0.00125317,
  71:0.00123707,72:0.00122146,73:0.00120634,74:0.00119659,75:0.00118878,
  76:0.00118195,77:0.00117707,78:0.00117268,79:0.00116927,80:0.00116732,
  81:0.00116634,82:0.00116585
};

// US Open payout distribution
// Percentages derived from 2025 US Open at Oakmont official dollar amounts ($21.5M purse)
// J.J. Spaun won $4.3M (20%). Note: Source data showed tied-group totals only, so within each
// tie group, individual positions share the same value — produces correct payouts for both
// tied AND solo positions in typical scenarios
const PAYOUT_USOPEN = {
  1:0.20000000,2:0.10800000,3:0.06787367,4:0.04078460,5:0.04078460,
  6:0.04078460,7:0.02857781,8:0.02857781,9:0.02857781,10:0.02167149,
  11:0.02167149,12:0.01623102,13:0.01623102,14:0.01623102,15:0.01623102,
  16:0.01623102,17:0.01623102,18:0.01623102,19:0.01128056,20:0.01128056,
  21:0.01128056,22:0.01128056,23:0.00749451,24:0.00749451,25:0.00749451,
  26:0.00749451,27:0.00749451,28:0.00749451,29:0.00749451,30:0.00749451,
  31:0.00749451,32:0.00749451,33:0.00527921,34:0.00527921,35:0.00527921,
  36:0.00527921,37:0.00471530,38:0.00420502,39:0.00420502,40:0.00420502,
  41:0.00420502,42:0.00339270,43:0.00339270,44:0.00339270,45:0.00339270,
  46:0.00264856,47:0.00264856,48:0.00264856,49:0.00264856,50:0.00223726,
  51:0.00223726,52:0.00223726,53:0.00223726,54:0.00223726,55:0.00214330,
  56:0.00214330,57:0.00211270,58:0.00211270,59:0.00209228,60:0.00209228,
  61:0.00202070,62:0.00202070,63:0.00202070,64:0.00196981,65:0.00196981,
  66:0.00193916
};

// The Open Championship payout distribution
// Percentages derived from 2025 Open at Royal Portrush ($17M purse)
// Scottie Scheffler won $3.1M (18.24%). All 19 tied groups verified exact.
// Note: The Open winner gets ~18.24% (slightly different from PGA's 18% or Masters/USO's 20%)
const PAYOUT_OPEN = {
  1:0.18235294,2:0.10347059,3:0.06635294,4:0.04298041,5:0.04298041,
  6:0.04298041,7:0.02657847,8:0.02657847,9:0.02657847,10:0.01792059,
  11:0.01792059,12:0.01792059,13:0.01792059,14:0.01411765,15:0.01411765,
  16:0.01089753,17:0.01089753,18:0.01089753,19:0.01089753,20:0.01089753,
  21:0.01089753,22:0.01089753,23:0.00812000,24:0.00812000,25:0.00812000,
  26:0.00812000,27:0.00812000,28:0.00705588,29:0.00705588,30:0.00616765,
  31:0.00616765,32:0.00616765,33:0.00616765,34:0.00508924,35:0.00508924,
  36:0.00508924,37:0.00508924,38:0.00508924,39:0.00508924,40:0.00402000,
  41:0.00402000,42:0.00402000,43:0.00402000,44:0.00402000,45:0.00301094,
  46:0.00301094,47:0.00301094,48:0.00301094,49:0.00301094,50:0.00301094,
  51:0.00301094,52:0.00260882,53:0.00260882,54:0.00260882,55:0.00260882,
  56:0.00249024,57:0.00249024,58:0.00249024,59:0.00244412,60:0.00244412,
  61:0.00241765,62:0.00241765,63:0.00236941,64:0.00236941,65:0.00236941,
  66:0.00236941,67:0.00236941,68:0.00231765,69:0.00230000,70:0.00228824
};

// Masters Tournament payout distribution
// Percentages derived from official 2026 Masters dollar amounts ($22.5M purse)
// All tied positions verified exact (T3 4-way, T7, T9, T12 6-way, T18, T21, T24 6-way, T30, T33 5-way, T38, T41 5-way, T49)
// Note: Masters winner gets 20% (not 18% like other majors) — Augusta's distinct distribution
const PAYOUT_MASTERS = {
  1:0.20000000,2:0.10800000,3:0.06800000,4:0.04800000,5:0.04000000,
  6:0.03600000,7:0.03350000,8:0.03100000,9:0.02900000,10:0.02700000,
  11:0.02500000,12:0.02300000,13:0.02100000,14:0.01900000,15:0.01800000,
  16:0.01700000,17:0.01600000,18:0.01500000,19:0.01400000,20:0.01300000,
  21:0.01200000,22:0.01120000,23:0.01040000,24:0.00960000,25:0.00880000,
  26:0.00800000,27:0.00770000,28:0.00740000,29:0.00710000,30:0.00680000,
  31:0.00650000,32:0.00620000,33:0.00590000,34:0.00565000,35:0.00540000,
  36:0.00515000,37:0.00490000,38:0.00470000,39:0.00450000,40:0.00430000,
  41:0.00410000,42:0.00390000,43:0.00370000,44:0.00350000,45:0.00330000,
  46:0.00310000,47:0.00290000,48:0.00274000,49:0.00260000,50:0.00252000,
  51:0.00246000,52:0.00240000,53:0.00236000,54:0.00232000
};

// The Players Championship payout distribution
// Percentages derived from official 2026 Players at TPC Sawgrass ($25M purse)
// Cam Young won $4.5M (18%). All 16 tied groups verified exact.
const PAYOUT_PLAYERS = {
  1:0.18000000,2:0.10900000,3:0.06900000,4:0.04900000,5:0.03700000,
  6:0.03700000,7:0.03700000,8:0.02925000,9:0.02925000,10:0.02925000,
  11:0.02425000,12:0.02425000,13:0.01636111,14:0.01636111,15:0.01636111,
  16:0.01636111,17:0.01636111,18:0.01636111,19:0.01636111,20:0.01636111,
  21:0.01636111,22:0.01085000,23:0.01085000,24:0.00885000,25:0.00885000,
  26:0.00885000,27:0.00715000,28:0.00715000,29:0.00715000,30:0.00715000,
  31:0.00715000,32:0.00513000,33:0.00513000,34:0.00513000,35:0.00513000,
  36:0.00513000,37:0.00513000,38:0.00513000,39:0.00513000,40:0.00513000,
  41:0.00513000,42:0.00365000,43:0.00365000,44:0.00365000,45:0.00365000,
  46:0.00288500,47:0.00288500,48:0.00288500,49:0.00288500,50:0.00244333,
  51:0.00244333,52:0.00244333,53:0.00244333,54:0.00244333,55:0.00244333,
  56:0.00232000,57:0.00232000,58:0.00229000,59:0.00225000,60:0.00225000,
  61:0.00225000,62:0.00218000,63:0.00218000,64:0.00218000,65:0.00218000,
  66:0.00211000,67:0.00211000,68:0.00211000,69:0.00207000,70:0.00203000,
  71:0.00203000,72:0.00203000,73:0.00199000
};

// Standard PGA Tour event payout percentages (top 65 paid)
// Source: easyofficepools.com — used for non-major PGA Tour events
// Sums to exactly 100% — distributes full purse
const PAYOUT_PGATOUR = {
  1:0.18000, 2:0.10900, 3:0.06900, 4:0.04900, 5:0.04100,
  6:0.03625, 7:0.03375, 8:0.03125, 9:0.02925, 10:0.02725,
  11:0.02525, 12:0.02325, 13:0.02125, 14:0.01925, 15:0.01825,
  16:0.01725, 17:0.01625, 18:0.01525, 19:0.01425, 20:0.01325,
  21:0.01225, 22:0.01125, 23:0.01045, 24:0.00965, 25:0.00885,
  26:0.00805, 27:0.00775, 28:0.00745, 29:0.00715, 30:0.00685,
  31:0.00655, 32:0.00625, 33:0.00595, 34:0.00570, 35:0.00545,
  36:0.00520, 37:0.00495, 38:0.00475, 39:0.00455, 40:0.00435,
  41:0.00415, 42:0.00395, 43:0.00375, 44:0.00355, 45:0.00335,
  46:0.00315, 47:0.00295, 48:0.00279, 49:0.00265, 50:0.00257,
  51:0.00251, 52:0.00245, 53:0.00241, 54:0.00237, 55:0.00235,
  56:0.00233, 57:0.00231, 58:0.00229, 59:0.00227, 60:0.00225,
  61:0.00223, 62:0.00221, 63:0.00219, 64:0.00217, 65:0.00215,
  // Tour adds extra purse for players beyond 65 — decreases by 0.002% per position
  66:0.00213, 67:0.00211, 68:0.00209, 69:0.00207, 70:0.00205,
  71:0.00203, 72:0.00201, 73:0.00199, 74:0.00197, 75:0.00195,
  76:0.00193, 77:0.00191, 78:0.00189, 79:0.00187, 80:0.00185,
  81:0.00183, 82:0.00181, 83:0.00179, 84:0.00177, 85:0.00175
};

const PAYOUT_BY_MAJOR = {
  pga: PAYOUT_PGA,
  usopen: PAYOUT_USOPEN,
  open: PAYOUT_OPEN,
  masters: PAYOUT_MASTERS,
  players: PAYOUT_PLAYERS,
  pgatour: PAYOUT_PGATOUR,
};

// Default fallback
const PAYOUT = PAYOUT_PGA;

const FLAG_MAP = {
  USA:'🇺🇸',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',WAL:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',NIR:'🇬🇧',
  IRL:'🇮🇪',ESP:'🇪🇸',AUS:'🇦🇺',JPN:'🇯🇵',NOR:'🇳🇴',
  SWE:'🇸🇪',CAN:'🇨🇦',KOR:'🇰🇷',AUT:'🇦🇹',NZL:'🇳🇿',
  COL:'🇨🇴',RSA:'🇿🇦',DEN:'🇩🇰',CHN:'🇨🇳',MEX:'🇲🇽',
  FIN:'🇫🇮',ARG:'🇦🇷',THA:'🇹🇭',FIJ:'🇫🇯',GBR:'🇬🇧',
  GER:'🇩🇪',CHI:'🇨🇱',VEN:'🇻🇪',BEL:'🇧🇪',FRA:'🇫🇷',
  ITA:'🇮🇹',POR:'🇵🇹',CZE:'🇨🇿',SVK:'🇸🇰',POL:'🇵🇱',
  ZIM:'🇿🇼',NAM:'🇳🇦',PAR:'🇵🇾',URU:'🇺🇾',PER:'🇵🇪',
  ECU:'🇪🇨',BRA:'🇧🇷',PHI:'🇵🇭',IND:'🇮🇳',TPE:'🇹🇼',
  MAS:'🇲🇾',SIN:'🇸🇬',PNG:'🇵🇬',PUR:'🇵🇷',NED:'🇳🇱',
  SUI:'🇨🇭',ISL:'🇮🇸',JAM:'🇯🇲',BAH:'🇧🇸',IRN:'🇮🇷',
  ISR:'🇮🇱',RUS:'🇷🇺',UKR:'🇺🇦',TUR:'🇹🇷',VIE:'🇻🇳',
  INA:'🇮🇩',HKG:'🇭🇰',
};
const Flag = ({c}) => FLAG_MAP[c] ? <span>{FLAG_MAP[c]}</span> : null;

// Schedule retry button — shows after 5 seconds of loading so user isn't stuck
function ScheduleRetry({onRetry, primary}) {
  const [showRetry, setShowRetry] = useState(false);
  useEffect(()=>{
    const t = setTimeout(()=>setShowRetry(true), 5000);
    return ()=>clearTimeout(t);
  },[]);
  if(!showRetry) return null;
  return (
    <div style={{marginTop:24,textAlign:'center'}}>
      <p style={{fontSize:12,color:'#888',marginBottom:8}}>Taking longer than expected.</p>
      <button onClick={onRetry} style={{padding:'8px 16px',fontSize:13,fontWeight:600,background:primary,color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>Try Again</button>
    </div>
  );
}


function holeStyle(toPar) {
  if (toPar == null) return { bg:'#f0f0f0', text:'#ccc',  ring:'#ddd' };
  if (toPar <= -2)   return { bg:'#1565c0', text:'#fff',  ring:'#0d47a1', label:'🦅' };
  if (toPar === -1)  return { bg:'#f9a825', text:'#3e2000',ring:'#f57f17', label:'🐦' };
  if (toPar === 0)   return { bg:'#eeeeee', text:'#555',  ring:'#bdbdbd' };
  if (toPar === 1)   return { bg:'#ffcdd2', text:'#c62828',ring:'#ef9a9a' };
  if (toPar === 2)   return { bg:'#e53935', text:'#fff',  ring:'#b71c1c' };
  return               { bg:'#880e4f', text:'#fff',  ring:'#560027', label:'💀' };
}

const PAYOUT_OLD_REMOVED = null; // (old single PAYOUT table replaced by per-major tables above)

const fmt=n=>'$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
// Major venue coordinates for tee time timezone conversion
const MAJOR_VENUE_COORDS = {
  players: { lat: 30.20, lng: -81.39 },  // TPC Sawgrass, Ponte Vedra FL (ET)
  masters: { lat: 33.50, lng: -82.02 },  // Augusta National, GA (ET)
  pga: { lat: 39.99, lng: -75.40 },      // Aronimink, PA (ET) — 2026 venue
  usopen: { lat: 40.89, lng: -72.46 },   // Shinnecock Hills, NY (ET) — 2026 venue
  open: { lat: 53.63, lng: -3.02 },      // Royal Birkdale, England (BST) — 2026 venue
};

const parsePos=s=>{if(!s||s==='-'||/CUT|WD|DQ|MC/i.test(s))return null;return parseInt(String(s).replace('T',''),10);};
// Parse score like "-5", "+3", "E" to a number for sorting (lower = better)
const parseScoreToNum = s => {
  if (s == null || s === '' || s === '-') return 9999;
  const str = String(s).trim();
  if (str === 'E' || str === 'e') return 0;
  const n = parseInt(str, 10);
  return isNaN(n) ? 9999 : n;
};
const flip=n=>n.includes(', ')?n.split(', ').reverse().join(' '):n;
const fmtScore=n=>{if(n==null)return null;if(n===0)return'E';return n>0?`+${n}`:String(n);};
const toLastFirst=name=>{const p=name.trim().split(' ');if(p.length<2)return name;const last=p.pop();return`${last}, ${p.join(' ')}`;};

// Determine the tournament's local IANA timezone based on lat/long.
// PGA Tour events span US time zones plus a few international venues.
// This is a lightweight approximation — for production accuracy, use tz-lookup npm package.
function tournamentTimeZone(latitude, longitude) {
  if (latitude == null || longitude == null) return 'America/New_York';
  const lat = Number(latitude), lng = Number(longitude);
  // International venues
  if (lng > -30) {
    // Europe / UK / Scotland / Spain / Italy
    if (lat > 50 && lng < 2) return 'Europe/London';     // UK / Scotland / Ireland
    if (lat > 40 && lng < 20) return 'Europe/Madrid';     // Spain / France / Germany
    return 'Europe/London';
  }
  if (lng < -100 && lng > -130) {
    // US Mountain or Pacific
    if (lat < 37 && lng > -118) return 'America/Phoenix'; // Arizona (no DST)
    return 'America/Los_Angeles';
  }
  if (lng <= -100 && lng >= -103) return 'America/Chicago'; // Texas central edge
  if (lng < -100) return 'America/Denver';
  if (lng < -87) return 'America/Chicago';  // Central
  if (lng < -67) return 'America/New_York'; // Eastern
  if (lat < 20) return 'America/Puerto_Rico'; // Caribbean
  return 'America/New_York';
}

// Convert a DataGolf tee time string ("2026-05-22 12:43") to user's local time
// venueLat/venueLng specify the tournament location for source-tz interpretation
function convertTeeTimeToUserTZ(teetimeStr, venueLat, venueLng) {
  if (!teetimeStr) return null;
  const sourceTZ = tournamentTimeZone(venueLat, venueLng);
  // Parse "YYYY-MM-DD HH:MM" as if in the source tz
  // Trick: format the parsed time AS source-tz to get the UTC offset, then build a proper Date
  const [datePart, timePart] = teetimeStr.split(' ');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, min] = timePart.split(':').map(Number);
  if (!year || !month || !day || hour == null) return null;
  // Construct ISO string treating it as that timezone — using formatToParts to figure out offset
  // Simpler: assume local time matches the venue's offset on that date
  // Build a naive Date, then determine source-tz offset at that date and adjust.
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hour, min || 0));
  const localStr = new Intl.DateTimeFormat('en-US', {
    timeZone: sourceTZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(naiveUTC);
  // localStr is what naive UTC time looks like AT source-tz. The offset is the diff.
  const m = localStr.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, lm, ld, ly, lh, lmin] = m.map(Number);
  const naiveAsLocal = Date.UTC(ly, lm - 1, ld, lh, lmin);
  const offsetMs = naiveAsLocal - naiveUTC.getTime();
  const actualUTC = naiveUTC.getTime() - offsetMs;
  return new Date(actualUTC);
}

// Format a Date object as "h:MM AM/PM" in user's local time zone
function formatTeeTimeForUser(date) {
  if (!date) return null;
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}


function calcEarnings(players, purse, major, tournamentComplete){
  const payoutTable = (major && PAYOUT_BY_MAJOR[major]) || PAYOUT;
  const maxPos = Math.max(...Object.keys(payoutTable).map(Number));
  // Build groups for positions within the table
  const g={};
  // Track players who made cut but finished beyond the payout table (still earn min payout)
  const beyondMaxPos=[];
  players.forEach(p=>{
    const pos=parsePos(p.pos);
    if(pos){
      if(pos<=maxPos){
        if(!g[pos])g[pos]=[];
        g[pos].push(p.name);
      } else {
        // Made cut + finished tournament but ranked > maxPos: gets minimum cut-line payout
        beyondMaxPos.push(p.name);
      }
    }
  });
  const m={};
  Object.entries(g).forEach(([ps,pls])=>{
    const pos=+ps;
    // Live tournament: if multiple players tied at the LEAD (position 1), each gets full winner share (no split)
    // After tournament complete: revert to standard tied-split math
    if(pos===1 && pls.length>1 && !tournamentComplete){
      const winnerShare = Math.round(payoutTable[1]*purse);
      pls.forEach(n=>{m[n]=winnerShare;});
      return;
    }
    // Standard tied-split math for everyone else (or final results)
    let t=0;
    for(let i=0;i<pls.length;i++)t+=payoutTable[pos+i]||0;
    const e=Math.round(t/pls.length*purse);
    pls.forEach(n=>{m[n]=e;});
  });
  // Pay anyone beyond maxPos at the cut-line rate (last paid position)
  // PGA Tour rule: every player who makes the cut gets at least the minimum payout
  if (beyondMaxPos.length > 0) {
    const minPayout = Math.round((payoutTable[maxPos]||0)*purse);
    beyondMaxPos.forEach(n=>{m[n]=minPayout;});
  }
  return m;
}

const TABS=['Standings','Enter Pool','Field','Chat','History'];

export default function App(){
  const params       = useParams();
  const searchParams = useSearchParams();
  const poolId       = params?.poolId || 'default';
  const justActivated = searchParams?.get('activated') === '1';

  const [joinCodeEntry, setJoinCodeEntry] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [joinCodePassed, setJoinCodePassed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinCodePassed(localStorage.getItem(`jc_${poolId}`) === 'true');
    }
  }, [poolId]);

  const handleJoinCodeSubmit = async () => {
    setJoinCodeError('');
    const res = await fetch('/api/entries?poolId=' + poolId);
    const d = await res.json();
    const correct = d.meta?.joinCode?.toUpperCase();
    if (!correct || joinCodeEntry.toUpperCase().trim() === correct) {
      localStorage.setItem(`jc_${poolId}`, 'true');
      setJoinCodePassed(true);
    } else {
      setJoinCodeError('Incorrect join code — check with your pool commissioner.');
    }
  };

  const [tab,setTab]=useState('Standings');
  const [activeMajor,setActiveMajor]=useState('pga');
  const [scheduleData,setScheduleData]=useState({});
  const [entries,setEntries]=useState([]);
  const [poolMeta,setPoolMeta]=useState(null);
  const JOIN_CODE_REQUIRED = !!poolMeta?.joinCodeRequired;
  const [poolNotFound,setPoolNotFound]=useState(false);
  const [dynamicPurses,setDynamicPurses]=useState(null);
  const [payments,setPayments]=useState({});
  const [field,setField]=useState([]);
  const [fields,setFields]=useState({});
  const [fieldSource,setFieldSource]=useState('preliminary');
  const [fieldLastUpdated,setFieldLastUpdated]=useState(null);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('');
  const activeMajorRef=useRef('pga');
  const dynamicPursesRef=useRef(null);
  const [refreshing,setRefreshing]=useState(false);
  const [entryName,setEntryName]=useState('');
  const [entryEmail,setEntryEmail]=useState('');
  const [editMode,setEditMode]=useState(false);
  const [editCode,setEditCode]=useState('');
  const [showEditModal,setShowEditModal]=useState(null);
  const [showClaimModal,setShowClaimModal]=useState(null);
  const [picks,setPicks]=useState({1:[],2:[],3:[]});
  const [search,setSearch]=useState('');
  const [fieldSort,setFieldSort]=useState('leaderboard'); // 'leaderboard' or 'pairings'
  const [toast,setToast]=useState('');
  const [adminPw,setAdminPw]=useState('');
  const [adminOk,setAdminOk]=useState(false);
  const [adminAuthError,setAdminAuthError]=useState('');
  const [serverLocked,setServerLocked]=useState(false);
  const [serverPicksHidden,setServerPicksHidden]=useState(true);
  const [paymentsHidden,setPaymentsHidden]=useState(false);
  const [lastUp,setLastUp]=useState(null);
  const rawScoresRef=useRef(null);
  const liveStatsRef=useRef(null); // Cache live-stats map by player_name
  const [liveStatsLoaded,setLiveStatsLoaded]=useState(false);
  const [openCard,setOpenCard]=useState(null);
  // Player favorites — per-device using localStorage, scoped per pool
  const [favorites,setFavorites]=useState(new Set());
  const [showOnlyFavorites,setShowOnlyFavorites]=useState(false);
  // Load favorites from localStorage on mount
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`tuna-favorites-${poolId}`);
      if(stored) setFavorites(new Set(JSON.parse(stored)));
    } catch(e) {}
  },[poolId]);
  // Save favorites to localStorage whenever they change
  const toggleFavorite = (name) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if(next.has(name)) next.delete(name);
      else next.add(name);
      try {
        localStorage.setItem(`tuna-favorites-${poolId}`, JSON.stringify([...next]));
      } catch(e) {}
      return next;
    });
  };
  const [activeTier,setActiveTier]=useState(1);
  const [submitting,setSubmitting]=useState(false);
  const [now,setNow]=useState(Date.now());
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [holeData,setHoleData]=useState({round:null,holes:[],loading:false,error:null});
  const [archives,setArchives]=useState([]);
  const [expandedArchive,setExpandedArchive]=useState(null);
  const [showArchives,setShowArchives]=useState(false);
  const [publicArchives,setPublicArchives]=useState([]);
  const [historyLoaded,setHistoryLoaded]=useState(false);
  const [chatMessages,setChatMessages]=useState([]);
  const [chatName,setChatName]=useState('');
  const [chatCode,setChatCode]=useState('');
  const [chatVerified,setChatVerified]=useState(false);
  const [chatInput,setChatInput]=useState('');
  const [chatSending,setChatSending]=useState(false);
  const [chatVerifying,setChatVerifying]=useState(false);
  const chatScrollRef=useRef(null);
  const timer=useRef(null);

  // Build theme: base + dynamic schedule data + (if pgatour mode) per-event overrides
  const baseTheme = THEMES[activeMajor] || THEMES.pga;
  const scheduleOverrides = scheduleData[activeMajor] || {};
  let eventOverrides = {};
  if (activeMajor === 'pgatour' && scheduleOverrides.eventName) {
    const key = scheduleOverrides.eventName.toLowerCase().trim();
    if (PGATOUR_EVENT_THEMES[key]) {
      eventOverrides = PGATOUR_EVENT_THEMES[key];
    }
  }
  const T = { ...baseTheme, ...eventOverrides, ...scheduleOverrides };
  // Detect if schedule data hasn't loaded yet — without this gate the UI can default to wrong state:
  // - pgatour: no teeTime default → "not started" mode → could allow late entries
  // - majors in 2027+: hardcoded teeTime is 2026 → "tournament is over" → blocks legitimate entries
  const hardcodedDate = new Date(baseTheme.teeTime || 0);
  const hardcodedTooOld = baseTheme.teeTime && (Date.now() - hardcodedDate.getTime() > 60 * 24 * 60 * 60 * 1000); // 60 days past
  const scheduleNotReady = (activeMajor === 'pgatour' && !T.teeTime)
    || (activeMajor !== 'pgatour' && hardcodedTooOld && !scheduleOverrides.eventName);
  const TEE_TIME = new Date(T.teeTime).getTime();
  const TOURNAMENT_END = TEE_TIME + 6 * 24 * 60 * 60 * 1000; // 6 days after tee-off
  const effectivePurse = (dynamicPurses && dynamicPurses[activeMajor]) || T.purse;
  const TOURNAMENT = { name: T.eventName, purse: effectivePurse };
  const TIERS = TIER_DEFS.map(t => t.id===2 ? {...t, color:T.primary} : t);

  const pastTeeTime = now >= TEE_TIME && now <= TOURNAMENT_END;
  const isLive = pastTeeTime || activeMajor === 'pgatour'; // pgatour mode always shows live data
  const locked = serverLocked || pastTeeTime;
  const picksHidden = serverPicksHidden && !pastTeeTime;

  const getCountdown = () => {
    const diff = TEE_TIME - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (days > 0) return `${days}d ${hrs}h ${mins}m ${secs}s until entries lock`;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s until entries lock`;
    if (mins > 0) return `${mins}m ${secs}s until entries lock`;
    return `${secs}s until entries lock`;
  };
  const getCountdownShort = () => {
    const diff = TEE_TIME - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `${days}d ${hrs}h until lock`;
    if (hrs > 0) return `${hrs}h ${mins}m until lock`;
    return `${mins}m until lock`;
  };
  const countdown = getCountdown();
  const countdownShort = getCountdownShort();
  const allPicks=[...picks[1],...picks[2],...picks[3]];
  const totalPicked=allPicks.length;
  const msg=m=>{setToast(m);setTimeout(()=>setToast(''),3500);};

  const loadEntries=async()=>{
    try{
      const r=await fetch('/api/entries?poolId='+poolId);
      const d=await r.json();
      // If no meta returned, pool was deleted or never existed
      if(!d.meta){
        setPoolNotFound(true);
        return;
      }
      setPoolNotFound(false);
      if(d.entries)setEntries(d.entries);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
      if(d.paymentsHidden!==undefined)setPaymentsHidden(d.paymentsHidden);
      if(d.payments)setPayments(d.payments);
      if(d.meta)setPoolMeta(d.meta);
      if(d.purses){setDynamicPurses(d.purses); dynamicPursesRef.current=d.purses;}
      if(d.major&&THEMES[d.major]){
        const prevMajor = activeMajorRef.current;
        const isFirstLoad = !field || field.length === 0;
        setActiveMajor(d.major);
        activeMajorRef.current = d.major;
        if(d.major !== prevMajor || isFirstLoad){
          fetchField(d.major, true);
        }
      }
    }catch(e){console.error('loadEntries:',e);}
  };

  const fetchSchedule=async()=>{
    try{
      const year = new Date().getFullYear();
      const res = await fetch(`/api/scores?endpoint=schedule&season=${year}`);
      if(!res.ok) return;
      const data = await res.json();
      const events = data.schedule || data.events || data || [];
      const updates = {};

      for(const ev of events){
        const eventId = ev.event_id || ev.id;
        const majorKey = DG_EVENT_IDS[eventId];
        if(!majorKey) continue;

        const course = ev.course || ev.course_name || '';
        const city   = ev.location?.city || ev.city || '';
        const country= ev.location?.country || ev.country || '';
        const courseName = course ? `${course}${city?` · ${city}`:''}${country&&country!=='United States'?`, ${country}`:''}` : '';

        const startDate = ev.start_date || ev.date || '';
        const teeTime = startDate ? `${startDate}T11:00:00Z` : null;

        const purse = ev.purse || ev.total_purse || null;

        const evName = ev.event_name || ev.name || '';
        const eventName = evName ? `${evName} ${year}` : '';

        if(majorKey) updates[majorKey] = {
          ...(eventName && { eventName }),
          ...(courseName && { courseName }),
          ...(teeTime && { teeTime }),
          ...(purse && { purse }),
        };
      }

      if(Object.keys(updates).length > 0) setScheduleData(updates);

      // When in PGA Tour mode, also fetch the current week's event info
      if(activeMajor === 'pgatour'){
        try {
          const ptRes = await fetch(`/api/scores?endpoint=pre-tournament`);
          if(ptRes.ok){
            const ptData = await ptRes.json();
            const eventName = ptData.event_name || ptData.name || 'PGA Tour Event';
            // Find this event in the schedule to get course/location/start_date/event_id
            const currentEvent = events.find(e => 
              (e.event_name||'').toLowerCase() === eventName.toLowerCase()
            );
            const courseName = currentEvent
              ? `${currentEvent.course || ''}${currentEvent.location ? ' · ' + currentEvent.location : ''}`
              : 'PGA Tour';
            const teeDate = currentEvent?.start_date ? new Date(currentEvent.start_date + 'T11:00:00Z') : null;
            const teeTime = teeDate ? teeDate.toISOString() : null;
            // Build official PGA Tour logo URL from event_id (Cloudinary CDN, CORS-enabled)
            const eventId = currentEvent?.event_id;
            const logoUrl = eventId
              ? `https://res.cloudinary.com/pgatour-prod/d_tournaments:logos:R000.png/tournaments/logos/R${String(eventId).padStart(3,'0')}.png`
              : null;
            // Venue coordinates for tee time timezone conversion
            const venueLat = currentEvent?.latitude;
            const venueLng = currentEvent?.longitude;
            setScheduleData(prev => ({
              ...prev,
              pgatour: {
                eventName,
                courseName,
                ...(teeTime && { teeTime }),
                ...(logoUrl && { logoUrl, logoNoBg: false, logoHeight: 80 }),
                ...(venueLat != null && { venueLat, venueLng }),
              },
            }));
          }
        } catch(e) { console.warn('pgatour event fetch failed:', e.message); }
      }
    }catch(e){ console.warn('fetchSchedule failed:', e.message); }
  };

  const fetchField=async(major=activeMajor, updateDisplay=true)=>{
    const theme = THEMES[major] || THEMES.pga;
    if(updateDisplay){
      setFields(prev=>{
        const cached = prev[major];
        if(cached?.length > 0){
          // Filter cached data through confirmed/onTrack to prevent flicker
          // (old cache may have unfiltered players from pre-tournament views)
          const filteredCache = cached.filter(p=>p.confirmed||p.onTrack);
          setField(filteredCache);
          setFieldSource(`📡 datagolf.com/major-fields · ${filteredCache.length} confirmed in field ✓ · cached`);
        } else {
          setField([]);
          setFieldSource(`⏳ Loading ${theme.eventName} field...`);
        }
        return prev;
      });
    }
    try{
      // ─── PGA TOUR MODE — bypass scraper, fetch field from DataGolf directly ─
      if(major === 'pgatour'){
        const ptRes = await fetch('/api/scores?endpoint=pre-tournament');
        if(!ptRes.ok) return;
        const ptData = await ptRes.json();
        const players = ptData.baseline_history_fit || ptData.baseline || ptData.players || [];
        if(players.length < 5) return;

        // Sort players by win odds (highest first = best players)
        const sorted = [...players].sort((a, b) => (b.win || 0) - (a.win || 0));

        // Get venue coordinates by re-fetching the schedule (don't depend on state being populated)
        let venueLat = scheduleData?.pgatour?.venueLat;
        let venueLng = scheduleData?.pgatour?.venueLng;
        if (venueLat == null || venueLng == null) {
          try {
            const year = new Date().getFullYear();
            const schedRes = await fetch(`/api/scores?endpoint=schedule&season=${year}`);
            if (schedRes.ok) {
              const schedData = await schedRes.json();
              const events = schedData.schedule || schedData.events || [];
              const eventName = ptData.event_name || '';
              const ev = events.find(e => (e.event_name||'').toLowerCase() === eventName.toLowerCase());
              venueLat = ev?.latitude;
              venueLng = ev?.longitude;
            }
          } catch {}
        }
        console.log('[pgatour] Using venue coords:', venueLat, venueLng);

        // Fetch tee times from field-updates endpoint
        const teeTimeMap = {};
        try {
          const fuRes = await fetch('/api/scores?endpoint=field-updates');
          if(fuRes.ok){
            const fd = await fuRes.json();
            const fieldPlayers = fd.field || fd.players || [];
            const currentRound = fd.current_round || 1;
            fieldPlayers.forEach(p=>{
              const pname = (p.player_name||'').toLowerCase().trim();
              if(!pname) return;
              const teetimes = p.teetimes || [];
              const nextRound = teetimes
                .filter(t => t.round_num >= currentRound)
                .sort((a,b) => a.round_num - b.round_num)[0];
              if(!nextRound?.teetime) return;
              // Convert tournament-local time to user's local time
              const userDate = convertTeeTimeToUserTZ(nextRound.teetime, venueLat, venueLng);
              const teeTime = userDate ? formatTeeTimeForUser(userDate) : nextRound.teetime;
              const data = { teeTime, startHole: nextRound.start_hole, roundNum: nextRound.round_num };
              teeTimeMap[pname] = data;
              // Also store name variants
              if(pname.includes(',')){
                const parts = pname.split(',').map(s=>s.trim());
                if(parts.length===2) teeTimeMap[`${parts[1]} ${parts[0]}`] = data;
              } else {
                const pts = pname.split(' ');
                if(pts.length>=2) teeTimeMap[`${pts[pts.length-1]}, ${pts.slice(0,-1).join(' ')}`] = data;
              }
            });
          }
        } catch(e){ console.warn('pgatour tee times unavailable:', e.message); }

        // Build enriched player list
        const enriched = sorted.map((p, i) => {
          const name = p.player_name || p.name || '';
          // Convert "Last, First" → "First Last"
          const displayName = name.includes(',') ? name.split(',').reverse().map(s=>s.trim()).join(' ') : name;
          const win = p.win || 0;
          const odds = win > 0.001 ? `+${Math.round((1/win)*100-100)}` : 'n/a';
          // Tier cuts: Top 12 favorites, 13-56 contenders, 57+ longshots
          const tier = i < 12 ? 1 : i < 56 ? 2 : 3;
          // Look up tee time
          const nameKey = (p.player_name || '').toLowerCase().trim();
          const displayKey = displayName.toLowerCase().trim();
          const teeInfo = teeTimeMap[nameKey] || teeTimeMap[displayKey];
          return {
            name: displayName,
            country: p.country || 'USA',
            dgId: p.dg_id || null,
            odds,
            tier,
            rank: i,
            dgRank: i + 1,
            win,
            confirmed: true,
            onTrack: true,
            teeTime: teeInfo?.teeTime || null,
            startHole: teeInfo?.startHole || null,
            teeRoundNum: teeInfo?.roundNum || null,
            pairingTeeTime: teeInfo?.teeTime || null,
            pairingStartHole: teeInfo?.startHole || null,
            pairingRoundNum: teeInfo?.roundNum || null,
            pos: '-',
            score: 'E',
            today: '',
            thru: '',
            earnings: 0,
            r1: null, r2: null, r3: null, r4: null,
          };
        });

        setFields(prev => ({...prev, [major]: enriched}));
        if(updateDisplay){
          setField(enriched);
          const evName = ptData.event_name || 'PGA Tour Event';
          setFieldSource(`📡 datagolf.com · ${enriched.length} in ${evName} field`);
          // Immediately fetch and merge live scores (pgatour always has a live event)
          try {
            const liveRes = await fetch('/api/scores?endpoint=in-play');
            if(liveRes.ok){
              const liveData = await liveRes.json();
              const liveRaw = liveData.data || liveData.players || [];
              if(liveRaw.length > 0){
                rawScoresRef.current = liveRaw;
                const merged = mergeScoresIntoField(enriched, liveRaw);
                setField(merged);
                setFields(prev => ({...prev, [major]: merged}));
                setLastUp(new Date().toLocaleTimeString());
              }
            }
          } catch(e) { console.warn('pgatour scores fetch failed:', e.message); }
        }
        return;
      }

      const scrapeRes = await fetch(`/api/scrape-field?major=${major}`);
      if(!scrapeRes.ok) return;
      const scrapeData = await scrapeRes.json();
      const scrapedPlayers = scrapeData.players || [];
      if(scrapedPlayers.length < 5) return;

      // Build odds map — DataGolf returns names as "Last, First", scraper returns "First Last"
      // Store BOTH formats so lookups work regardless of which side queries
      // Only fetch odds for the active major - DataGolf's pre-tournament endpoint only has
      // current week's odds, so applying them to non-active majors is incorrect
      const oddsMap = {};
      const teeTimeMap = {};
      // Use the dynamically populated tee time (works for both majors and pgatour mode)
      // Falls back to the static theme tee time if schedule data hasn't loaded yet
      const dynamicTeeTime = scheduleData[major]?.teeTime || THEMES[major]?.teeTime;
      const teeT = new Date(dynamicTeeTime || 0).getTime();
      const cutoff = teeT + 6 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const isThisMajorInWindow = nowMs >= teeT && nowMs <= cutoff;
      if(updateDisplay && isThisMajorInWindow){
        let preds = [];
        const preRes = await fetch('/api/scores?endpoint=pre-tournament');
        if(preRes.ok){
          const pd = await preRes.json();
          preds = pd.baseline_history_fit||pd.baseline||pd.players||[];
        }
        if(preds.length < 10){
          const rankRes = await fetch('/api/scores?endpoint=dg-rankings');
          if(rankRes.ok){
            const rd = await rankRes.json();
            preds = (rd.rankings||rd.players||[]).map((p,idx)=>({player_name:p.player_name,win:1/(idx+1)}));
          }
        }

        // Fetch tee times from field-updates endpoint
        try {
          const fuRes = await fetch('/api/scores?endpoint=field-updates');
          if(fuRes.ok){
            const fd = await fuRes.json();
            const fieldPlayers = fd.field || fd.players || [];
            // Determine current tournament round (default to 1 if not specified)
            const currentRound = fd.current_round || 1;
            // Get venue coords for this major
            const venue = MAJOR_VENUE_COORDS[major];
            const venueLat = venue?.lat;
            const venueLng = venue?.lng;
            fieldPlayers.forEach(p=>{
              const pname = (p.player_name||'').toLowerCase().trim();
              if(!pname) return;
              // Find the tee time for the current round (or next upcoming round)
              const teetimes = p.teetimes || [];
              // Try current round first, then next round, then any future round
              const nextRound = teetimes
                .filter(t => t.round_num >= currentRound)
                .sort((a,b) => a.round_num - b.round_num)[0];
              if(!nextRound?.teetime) return;
              // Convert tournament-local time to user's local time
              const userDate = convertTeeTimeToUserTZ(nextRound.teetime, venueLat, venueLng);
              const teeTime = userDate ? formatTeeTimeForUser(userDate) : nextRound.teetime;
              const startHole = nextRound.start_hole;
              const roundNum = nextRound.round_num;
              const data = { teeTime, startHole, roundNum };
              teeTimeMap[pname] = data;
              if(pname.includes(',')){
                const parts = pname.split(',').map(s=>s.trim());
                if(parts.length===2) teeTimeMap[`${parts[1]} ${parts[0]}`] = data;
              } else {
                const pts = pname.split(' ');
                if(pts.length>=2) teeTimeMap[`${pts[pts.length-1]}, ${pts.slice(0,-1).join(' ')}`] = data;
              }
            });
          }
        } catch(e){ console.warn('tee times unavailable:', e.message); }

        preds.forEach(p=>{
          if(!p.player_name) return;
          const w = p.win||0;
          const raw = p.player_name.toLowerCase().trim();
          // Store original format (whatever DataGolf returned)
          oddsMap[raw] = w;
          // If "Last, First" format → also store as "First Last"
          if (raw.includes(',')) {
            const parts = raw.split(',').map(s => s.trim());
            if (parts.length === 2) {
              oddsMap[`${parts[1]} ${parts[0]}`] = w;
            }
          } else {
            // "First Last" format → also store as "Last, First"
            const pts = raw.split(' ');
            if(pts.length>=2) oddsMap[`${pts[pts.length-1]}, ${pts.slice(0,-1).join(' ')}`] = w;
          }
        });
      }

      const teeTimeMs = new Date(T.teeTime).getTime();
      const useOdds   = Date.now() >= teeTimeMs - 7 * 24 * 60 * 60 * 1000;

      const oddsRank = {};
      if(useOdds && Object.keys(oddsMap).length > 0){
        // Dedupe — only use one format (prefer "First Last") for sorting
        const seen = new Set();
        const sorted = Object.entries(oddsMap)
          .filter(([k]) => !k.includes(','))
          .filter(([k,v]) => { if(seen.has(k)) return false; seen.add(k); return v > 0; })
          .sort((a,b) => b[1]-a[1]);
        sorted.forEach(([name], idx) => {
          oddsRank[name] = idx;
          const parts = name.split(' ');
          if(parts.length >= 2)
            oddsRank[`${parts[parts.length-1]}, ${parts.slice(0,-1).join(' ')}`] = idx;
        });
      }

      // Always filter to confirmed/onTrack players (pre-tournament AND in-window)
      // This gives the cleanest accurate field count without showing potential entrants
      // who didn't actually make it (qualifiers, alternates not in)
      const playersToShow = scrapedPlayers.filter(p=>p.confirmed||p.onTrack);
      const cuts = TIER_CUTS_BY_MAJOR[major] || TIER_CUTS;
      const enriched = playersToShow.map((p,i)=>{
        const key  = p.name.toLowerCase().trim();
        const win  = oddsMap[key] ?? 0;
        const odds = win > 0.001 ? `+${Math.round((1/win)*100-100)}` : 'n/a';
        const baseRank = (p.dgRank && p.dgRank < 9999) ? p.dgRank - 1 : i;
        const rank = (useOdds && oddsRank[key] !== undefined) ? oddsRank[key] : baseRank;
        const teeInfo = teeTimeMap[key] || null;
        return {
          name:p.name, country:p.country||'USA', dgId: p.dg_id || p.dgId || null,
          odds, tier:rank<cuts[0]?1:rank<cuts[1]?2:3,
          rank, dgRank:p.dgRank, win,
          confirmed:p.confirmed,
          onTrack:p.onTrack||false,
          teeTime: teeInfo?.teeTime || null,
          startHole: teeInfo?.startHole || null,
          teeRoundNum: teeInfo?.roundNum || null,
          pairingTeeTime: teeInfo?.teeTime || null,
          pairingStartHole: teeInfo?.startHole || null,
          pairingRoundNum: teeInfo?.roundNum || null,
          pos:'-',score:'E',today:'',thru:'',earnings:0,r1:null,r2:null,r3:null,r4:null,
        };
      });

      setFields(prev=>({...prev,[major]:enriched}));

      if(updateDisplay){
        // Determine if this major is in its tournament window
        const teeT = new Date(THEMES[major]?.teeTime || 0).getTime();
        const cutoff = teeT + 6 * 24 * 60 * 60 * 1000; // 6 days after tee-off
        const nowMs = Date.now();
        const isThisMajorActive = nowMs >= teeT && nowMs <= cutoff;

        // Only merge with current field/raw scores if this major is in tournament window
        setField(prev=>{
          if(isThisMajorActive && rawScoresRef.current){
            return mergeScoresIntoField(enriched, rawScoresRef.current);
          }
          if(isThisMajorActive && prev && prev.length > 0){
            // Preserve existing live data for the active tournament
            return enriched.map(newP=>{
              const existing=prev.find(p=>p.name===newP.name);
              if(existing&&(existing.thru||existing.pos!=='-'||existing.earnings>0)){
                return{...newP,pos:existing.pos,score:existing.score,today:existing.today,
                  thru:existing.thru,earnings:existing.earnings,
                  r1:existing.r1,r2:existing.r2,r3:existing.r3,r4:existing.r4};
              }
              return newP;
            });
          }
          // Not the active tournament — return clean field with no score data
          return enriched;
        });
        const confirmed = enriched.filter(p=>p.confirmed).length;
        const onTrack   = enriched.filter(p=>p.onTrack&&!p.confirmed).length;
        const cached = scrapeData.fromCache ? ' · cached' : '';
        if(pastTeeTime){
          setFieldSource(`📡 ${confirmed} players in field${cached}`);
        } else {
          setFieldSource(`📡 datagolf.com/major-fields · ${confirmed} confirmed ✓  ${onTrack} on track –${cached}`);
        }
        setFieldLastUpdated(new Date().toLocaleTimeString());
      }
    }catch(e){ console.warn(`fetchField(${major}) failed:`,e.message); }
  };

  const fetchAllFields=async()=>{
    const MAJORS=['players','masters','pga','usopen','open'];
    const active = activeMajorRef.current;
    for(const major of MAJORS){
      await fetchField(major, major===active);
      await new Promise(r=>setTimeout(r, 8000));
    }
  };

  const fetchScores=async(quiet)=>{
    // Only fetch live scores if the major being viewed is in its tournament window
    // Otherwise scores from the in-play feed (current PGA) would incorrectly attach to other majors
    // EXCEPT: in pgatour mode, in-play feed always matches the active event, so always fetch
    const currentMajor = activeMajorRef.current || activeMajor;
    if(!pastTeeTime && currentMajor !== 'pgatour'){
      // Clear any stale score data and exit
      rawScoresRef.current=null;
      return;
    }
    // PGA Tour mode: skip in-play entirely Mon-Wed (it's always stale from prior week)
    // FINGERPRINT_V73_MONWEDSKIP
    if (currentMajor === 'pgatour') {
      const dow = new Date().getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu
      if (dow >= 1 && dow <= 3) {
        rawScoresRef.current = null;
        return;
      }
    }
    setRefreshing(true);
    try{
      const r=await fetch('/api/scores?endpoint=in-play');
      if(!r.ok)throw new Error('API '+r.status);
      const data=await r.json();
      const raw=data.data||data.players||data||[];
      if(!Array.isArray(raw)||raw.length===0)throw new Error('No live scores yet');

      // In pgatour mode, verify in-play event matches the active pgatour event.
      // DataGolf's in-play feed lags behind pre-tournament during between-event days (Mon-Wed).
      // If they mismatch — OR if in-play has no event_name at all — don't merge stale data.
      // FINGERPRINT_V72_IPGUARD
      if (currentMajor === 'pgatour') {
        const activeEventName = (scheduleData?.pgatour?.eventName||'').toLowerCase().trim();
        const ipEventName = (data.event_name||'').toLowerCase().trim();
        // Missing ipEventName = between-event window where DG hasn't refreshed in-play yet.
        // Treat as stale — skip merge entirely.
        if (activeEventName && (!ipEventName || activeEventName !== ipEventName)) {
          rawScoresRef.current = null;
          setRefreshing(false);
          return;
        }
      }

      rawScoresRef.current=raw; // Cache for re-merge when field updates

      setField(currentField=>{
        if(!currentField||currentField.length===0)return currentField;
        return mergeScoresIntoField(currentField, raw);
      });
      setLastUp(new Date().toLocaleTimeString());
      setStatus('');
      if(!quiet)msg('Scores updated');
    }catch(e){if(!quiet)setStatus(e.message);}
    setRefreshing(false);
  };

  // Pure function to merge live scores into field array
  const mergeScoresIntoField=(currentField, raw)=>{
    // Normalize names: lowercase, trim, remove diacritics, collapse whitespace
    const normalize = (s) => (s||'').toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove diacritics
      .replace(/\s+/g, ' ');  // collapse multiple spaces
    
    const updated=currentField.map(f=>{
      const fName=normalize(f.name);
      // Build all possible name format variants to match against
      const candidates = new Set([fName]);
      if(fName.includes(',')){
        const parts=fName.split(',').map(s=>s.trim());
        if(parts.length===2) candidates.add(`${parts[1]} ${parts[0]}`);
      } else {
        const parts=fName.split(' ');
        if(parts.length>=2){
          candidates.add(`${parts[parts.length-1]}, ${parts.slice(0,-1).join(' ')}`);
          if(parts.length>=3){
            candidates.add(`${parts.slice(1).join(' ')}, ${parts[0]}`);
            candidates.add(`${parts.slice(2).join(' ')}, ${parts.slice(0,2).join(' ')}`);
          }
          if(parts.length>=4){
            // For 4+ part names: try all reasonable last-name splits
            candidates.add(`${parts.slice(3).join(' ')}, ${parts.slice(0,3).join(' ')}`);
          }
        }
      }
      const match=raw.find(p=>{
        const pName=normalize(p.player_name||p.dg_player_name||'');
        return candidates.has(pName);
      });
      if(match){
        const total=match.current_score??match.total_to_par??match.total??null;
        const todayScore=match.today??null;
        const thruHoles=match.thru??null;
        return{...f,
          pos:match.current_pos!=null&&match.current_pos!=='--'?String(match.current_pos):(match.position||f.pos),
          score:total!=null?(total===0?'E':(total>0?`+${total}`:String(total))):f.score,
          today:todayScore!=null?(todayScore===0?'E':(todayScore>0?`+${todayScore}`:String(todayScore))):'',
          thru:thruHoles!=null&&thruHoles>0?String(thruHoles):'',
          r1:match.R1??match.round1??null,r2:match.R2??match.round2??null,
          r3:match.R3??match.round3??null,r4:match.R4??match.round4??null,
        };
      }
      return f;
    });

    // ── MISSED CUT DETECTION ─────────────────────────────────────────────
    // After R2, anyone without an upcoming tee time is cut.
    // GUARD: only flip CUT status if R3 tee times have actually been published.
    // We confirm publication by checking that a meaningful number of players have
    // upcoming tee times. If DataGolf is lagging and no one has R3 tees yet,
    // we leave everyone in their R2 position rather than marking the whole field CUT.
    const playersWithFutureTee = updated.filter(p => !!p.teeTime).length;
    const r3TeeTimesPublished = playersWithFutureTee >= 50;
    if (r3TeeTimesPublished) {
      updated.forEach(p => {
        const r1Done = p.r1 != null;
        const r2Done = p.r2 != null;
        const r3NotStarted = p.r3 == null;
        const noUpcomingTee = !p.teeTime;
        const notAlreadyMarked = !/CUT|WD|DQ|MC/i.test(p.pos||'');
        if (r1Done && r2Done && r3NotStarted && noUpcomingTee && notAlreadyMarked) {
          p.pos = 'CUT';
        }
      });
    }

    // Tournament is complete when every non-cut player has an r4 score
    const isComplete = updated.length > 0 && updated.every(p => {
      const isCut = /CUT|WD|DQ|MC/i.test(p.pos||'');
      return isCut || p.r4 != null;
    });
    // Use refs to avoid stale closures (especially when switching majors mid-session)
    const liveMajor = activeMajorRef.current || activeMajor;
    const livePurses = dynamicPursesRef.current;
    const liveTheme = THEMES[liveMajor] || THEMES.pga;
    const livePurse = (livePurses && livePurses[liveMajor]) || liveTheme.purse;
    const em=calcEarnings(updated, livePurse, liveMajor, isComplete);
    updated.forEach(p=>{p.earnings=em[p.name]||0;});
    if(Object.keys(em).length>0){
      fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'save-archive-earnings',password:adminPw||'auto',
          major:liveMajor,year:new Date().getFullYear(),earnings:em})
      }).catch(()=>{});
    }
    return updated;
  };

  const fetchHoleScores=async(playerName,roundNum)=>{
    if(holeData.round===roundNum&&!holeData.loading){
      setHoleData({round:null,holes:[],loading:false,error:null});return;
    }
    setHoleData({round:roundNum,holes:[],loading:true,error:null});
    try{
      const r=await fetch('/api/scores?endpoint=hole-scores');
      if(!r.ok)throw new Error('DataGolf unavailable ('+r.status+')');
      const data=await r.json();
      const all=data.data||data.players||data.scores||[];
      if(!all.length)throw new Error('No hole score data available yet');

      // Normalize names: lowercase, trim, remove diacritics, collapse whitespace
      const normalize = (s) => (s||'').toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

      // Build all possible name format variants (matches mergeScoresIntoField logic)
      const fName = normalize(flip(playerName));
      const candidates = new Set([fName]);
      const parts = fName.split(' ');
      if(parts.length>=2){
        candidates.add(`${parts[parts.length-1]}, ${parts.slice(0,-1).join(' ')}`);
        if(parts.length>=3){
          candidates.add(`${parts.slice(1).join(' ')}, ${parts[0]}`);
          candidates.add(`${parts.slice(2).join(' ')}, ${parts.slice(0,2).join(' ')}`);
        }
        if(parts.length>=4){
          candidates.add(`${parts.slice(3).join(' ')}, ${parts.slice(0,3).join(' ')}`);
        }
      }
      const player=all.find(p=>{
        const n=normalize(p.player_name||'');
        return candidates.has(n);
      });
      if(!player)throw new Error('Player not found in hole data');

      // Find the requested round in the rounds array
      const round=(player.rounds||[]).find(rd=>(rd.round_num??rd.round)===roundNum);
      if(!round||!round.scores)throw new Error('No hole data for R'+roundNum+' yet');

      // Each score is { hole, par, score } — score may be null if not played yet
      const holes=round.scores.slice(0,18).map(s=>({
        hole: s.hole,
        score: (s.score==null||s.score===0)?null:s.score,
        par: s.par||4,
        toPar: (s.score==null||s.score===0)?null:(s.score-(s.par||4)),
      }));

      if(holes.every(h=>h.score===null))throw new Error('No completed holes yet for R'+roundNum);

      setHoleData({round:roundNum,holes,loading:false,error:null});
    }catch(e){setHoleData({round:roundNum,holes:[],loading:false,error:e.message});}
  };

  const closeScorecard=()=>{setSelectedPlayer(null);setHoleData({round:null,holes:[],loading:false,error:null});};

  // Fetch DataGolf live tournament stats (SG breakdown) — cached for the session
  const fetchLiveStats=async()=>{
    if(liveStatsRef.current) return liveStatsRef.current;
    try{
      const r=await fetch('/api/scores?endpoint=live-stats');
      if(!r.ok)return null;
      const data=await r.json();
      const stats=data.live_stats||data.players||data.stats||[];
      const map={};
      stats.forEach(s=>{
        const name=(s.player_name||'').toLowerCase().trim();
        if(name)map[name]=s;
      });
      liveStatsRef.current=map;
      setLiveStatsLoaded(true);
      return map;
    }catch(e){return null;}
  };

  // Fetch live stats when scorecard opens
  useEffect(()=>{
    if(selectedPlayer && !liveStatsRef.current){
      fetchLiveStats();
    }
  },[selectedPlayer]);

  useEffect(()=>{
    fetchSchedule();
    // Load entries first - this determines the active major
    // Then loadEntries will call fetchField() with the correct major
    // Don't call fetchField() here directly because activeMajor defaults to 'pga'
    // which causes brief flash of PGA data when active major is different
    loadEntries().then(()=>setReady(true));
    fetchScores(true);
    setTimeout(()=>fetchAllFields(), 3000);
    timer.current=setInterval(()=>{
      fetchScores(true);
      loadEntries();
      // Refresh field every minute to pick up new round tee times once published
      fetchAllFields();
      setNow(Date.now());
    },60000);
    const clock=setInterval(()=>setNow(Date.now()),1000);

    // Refresh immediately when user returns to the page after backgrounding it
    const handleVisibility=()=>{
      if(document.visibilityState==='visible'){
        fetchScores(true);
        loadEntries();
        fetchAllFields();
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange',handleVisibility);

    return()=>{
      clearInterval(timer.current);
      clearInterval(clock);
      document.removeEventListener('visibilitychange',handleVisibility);
    };
  },[]);

  const togglePick=(name,tier)=>{
    const tp=picks[tier];const mx=TIERS.find(t=>t.id===tier)?.picks||3;
    if(tp.includes(name))setPicks({...picks,[tier]:tp.filter(p=>p!==name)});
    else if(tp.length<mx)setPicks({...picks,[tier]:[...tp,name]});
  };
  const removePick=name=>{const np={};for(const t of[1,2,3])np[t]=picks[t].filter(p=>p!==name);setPicks(np);};

  const submit=async()=>{
    if(!entryName.trim())return msg('Enter your name!');
    if(!editMode){
      if(!entryEmail.trim())return msg('Enter your email!');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entryEmail.trim()))return msg('Invalid email format');
    }
    for(const t of TIERS)if(picks[t.id].length!==t.picks)return msg(`Pick ${t.picks} from ${t.name}`);
    setSubmitting(true);
    try{
      const body=editMode
        ?{poolId,action:'update-entry',name:entryName.trim(),code:editCode,picks:allPicks}
        :{poolId,action:'submit',name:entryName.trim(),email:entryEmail.trim(),picks:allPicks};
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const d=await r.json();
      if(d.error){msg(d.error);setSubmitting(false);return;}
      if(d.entries)setEntries(d.entries);
      setEntryName('');setEntryEmail('');setPicks({1:[],2:[],3:[]});setSearch('');
      setEditMode(false);setEditCode('');
      msg(editMode?'Picks updated!':'Entry submitted! Check email for edit code 📧');
      setTab('Standings');
    }catch(e){msg('Error submitting — check connection');}
    setSubmitting(false);
  };

  const startEdit=async(name,code)=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'edit-entry',name,code})});
      const d=await r.json();
      if(d.error){msg(d.error);return false;}
      // Populate the form with existing picks
      const newPicks={1:[],2:[],3:[]};
      d.entry.picks.forEach(p=>{
        const player=field.find(f=>f.name===p);
        if(player&&player.tier)newPicks[player.tier].push(p);
      });
      setEntryName(d.entry.name);
      setEntryEmail(d.entry.email||'');
      setEditCode(code);
      setEditMode(true);
      setPicks(newPicks);
      setShowEditModal(null);
      setTab('Enter Pool');
      msg('Edit your picks below, then submit');
      return true;
    }catch{msg('Error');return false;}
  };

  const resendCode=async(name,email)=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'resend-code',name,email})});
      const d=await r.json();
      if(d.error){msg(d.error);return;}
      msg('Code resent — check your email 📧');
    }catch{msg('Error');}
  };

  const claimEntry=async(name,email)=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'claim-entry',name,email})});
      const d=await r.json();
      if(d.error){msg(d.error);return false;}
      loadEntries();
      msg('Email added! Check inbox for edit code 📧');
      return true;
    }catch{msg('Error');return false;}
  };

  // ─── CHAT ─────────────────────────────────────────────────────────────
  const fetchChat=async()=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'chat-fetch'})});
      const d=await r.json();
      if(d.messages){
        setChatMessages(d.messages);
        // Auto-scroll to bottom
        setTimeout(()=>{if(chatScrollRef.current)chatScrollRef.current.scrollTop=chatScrollRef.current.scrollHeight;},50);
      }
    }catch{}
  };

  const verifyChat=async()=>{
    if(!chatName||!chatCode)return msg('Enter your name and code');
    setChatVerifying(true);
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'chat-verify',name:chatName,code:chatCode})});
      const d=await r.json();
      if(d.error){msg(d.error);setChatVerifying(false);return;}
      // Save verification to localStorage
      if(typeof window!=='undefined'){
        localStorage.setItem(`chat_${poolId}_name`,d.verifiedName);
        localStorage.setItem(`chat_${poolId}_code`,chatCode.toUpperCase());
      }
      setChatName(d.verifiedName);
      setChatCode(chatCode.toUpperCase());
      setChatVerified(true);
      msg('Verified! You can chat now ✓');
      fetchChat();
    }catch{msg('Error verifying');}
    setChatVerifying(false);
  };

  const sendChatMessage=async()=>{
    if(!chatInput.trim())return;
    if(chatInput.length>300)return msg('Message too long (300 max)');
    setChatSending(true);
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'chat-post',name:chatName,code:chatCode,message:chatInput.trim()})});
      const d=await r.json();
      if(d.error){msg(d.error);setChatSending(false);return;}
      if(d.messages)setChatMessages(d.messages);
      setChatInput('');
      setTimeout(()=>{if(chatScrollRef.current)chatScrollRef.current.scrollTop=chatScrollRef.current.scrollHeight;},50);
    }catch{msg('Error sending');}
    setChatSending(false);
  };

  const deleteChatMessage=async(messageId)=>{
    if(!confirm('Delete this message?'))return;
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'chat-delete',password:adminPw,messageId})});
      const d=await r.json();
      if(d.error){msg(d.error);return;}
      if(d.messages)setChatMessages(d.messages);
    }catch{msg('Error');}
  };

  const reactToMessage=async(messageId,emoji)=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({poolId,action:'chat-react',name:chatName,code:chatCode,messageId,emoji})});
      const d=await r.json();
      if(d.error){msg(d.error);return;}
      if(d.messages)setChatMessages(d.messages);
    }catch{}
  };

  const [reactionPickerFor,setReactionPickerFor]=useState(null);
  const [customEmojiFor,setCustomEmojiFor]=useState(null);

  // Restore chat verification from localStorage
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const savedName=localStorage.getItem(`chat_${poolId}_name`);
    const savedCode=localStorage.getItem(`chat_${poolId}_code`);
    if(savedName&&savedCode){
      setChatName(savedName);
      setChatCode(savedCode);
      setChatVerified(true);
    }
  },[poolId]);

  // Refetch schedule when active major changes (so pgatour mode loads current event info)
  useEffect(()=>{
    if(activeMajor){
      fetchSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[activeMajor]);

  // Poll chat every 1 second when Chat tab is active (only active when tab is open)
  useEffect(()=>{
    if(tab!=='Chat')return;
    fetchChat();
    const interval=setInterval(fetchChat,1000);
    return()=>clearInterval(interval);
  },[tab]);

  // Auto-redirect away from Enter Pool tab when tournament starts (tab gets hidden)
  useEffect(()=>{
    if(pastTeeTime&&tab==='Enter Pool')setTab('Standings');
  },[pastTeeTime,tab]);

  const deleteOwnEntry=async(name)=>{
    if(!confirm(`Remove your entry "${name}"?`))return;
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,action:'delete-own',name})});
      const d=await r.json();
      if(d.error){msg(d.error);return;}
      if(d.entries)setEntries(d.entries);msg('Entry removed');
    }catch(e){msg('Error removing entry');}
  };

  const teamE=e=>e.picks.reduce((s,n)=>s+(field.find(f=>f.name===n)?.earnings||0),0);
  // Only re-rank entries once field has earnings data, otherwise keep stable order
  // This eliminates the loading flicker where rankings briefly shift as data streams in
  const fieldHasEarnings = field.some(f => f.earnings > 0);
  const ranked = fieldHasEarnings
    ? [...entries].sort((a,b)=>teamE(b)-teamE(a))
    : entries;
  const owners=n=>entries.filter(e=>e.picks.includes(n)).map(e=>e.name);
  // Parse "8:18 AM" → 818, "1:43 PM" → 1343 for sorting
  const parseTeeTime = (tt) => {
    if (!tt) return 9999;
    const m = tt.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 9999;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const isPM = m[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 100 + min;
  };
  // Detect if a round is currently in progress (anyone with thru 1-17)
  const aRoundIsLive = field.some(p => {
    const t = parseInt(p.thru, 10);
    return t > 0 && t < 18;
  });
  // Only consider this major "active" if it's actually within its tournament window
  const isActiveMajor = pastTeeTime || activeMajor === 'pgatour';
  // Detect if the tournament is fully complete: everyone has R4 score OR is cut
  const tournamentComplete = field.length > 0 && field.every(p => {
    const isCut = /CUT|WD|DQ|MC/i.test(p.pos);
    return isCut || p.r4 != null;
  });
  // Detect pre-tournament state: pgatour mode with no live data (no positions, no thru values)
  // FINGERPRINT_V74_PRETOURNSORT
  const isPreTournament = activeMajor === 'pgatour' && !aRoundIsLive && !tournamentComplete
    && !field.some(p => {
      const pn = parsePos(p.pos);
      return pn && pn > 0;
    });
  const sortF = (!isActiveMajor || isPreTournament)
    ? [...field].sort((a,b)=>{
        // Not in tournament window OR pre-tournament — sort by DG rank (odds-based)
        // Players without dgRank go to the bottom
        const ra = a.dgRank && a.dgRank < 9999 ? a.dgRank : 99999;
        const rb = b.dgRank && b.dgRank < 9999 ? b.dgRank : 99999;
        if (ra !== rb) return ra - rb;
        return a.name.localeCompare(b.name);
      })
    : ((aRoundIsLive || tournamentComplete) && fieldSort !== 'pairings')
    ? [...field].sort((a,b)=>{
        // Cut players always at bottom
        const aCut = /CUT|WD|DQ|MC/i.test(a.pos);
        const bCut = /CUT|WD|DQ|MC/i.test(b.pos);
        if (aCut && !bCut) return 1;
        if (bCut && !aCut) return -1;
        if (aCut && bCut) {
          const _fp = "FINGERPRINT_V54_CUTROUNDS";  // survives minification
          const aRounds = (a.r1!=null?1:0) + (a.r2!=null?1:0) + (a.r3!=null?1:0) + (a.r4!=null?1:0);
          const bRounds = (b.r1!=null?1:0) + (b.r2!=null?1:0) + (b.r3!=null?1:0) + (b.r4!=null?1:0);
          if (aRounds !== bRounds) return bRounds - aRounds;
          const sa = parseScoreToNum(a.score);
          const sb = parseScoreToNum(b.score);
          if (sa !== sb) return sa - sb;
          return a.name.localeCompare(b.name);
        }
        // Live mode OR tournament complete: sort by position (leaderboard order)
        const pa=parsePos(a.pos),pb=parsePos(b.pos);
        if(!pa&&!pb)return (a.rank??999)-(b.rank??999);
        if(!pa)return 1;
        if(!pb)return -1;
        return pa-pb;
      })
    : [...field].sort((a,b)=>{
        // Cut players always at bottom regardless of mode
        const aCut = /CUT|WD|DQ|MC/i.test(a.pos);
        const bCut = /CUT|WD|DQ|MC/i.test(b.pos);
        if (aCut && !bCut) return 1;
        if (bCut && !aCut) return -1;
        if (aCut && bCut) {
          // Within cut/WD/DQ group: players who completed MORE rounds sort higher
          const aRounds = (a.r1!=null?1:0) + (a.r2!=null?1:0) + (a.r3!=null?1:0) + (a.r4!=null?1:0);
          const bRounds = (b.r1!=null?1:0) + (b.r2!=null?1:0) + (b.r3!=null?1:0) + (b.r4!=null?1:0);
          if (aRounds !== bRounds) return bRounds - aRounds;
          // Same rounds completed: by score (best first)
          const sa = parseScoreToNum(a.score);
          const sb = parseScoreToNum(b.score);
          if (sa !== sb) return sa - sb;
          return a.name.localeCompare(b.name);
        }
        if (fieldSort === 'pairings') {
          // Pairings mode: physical pairing grouping
          // For R3+: ALL front-9 starters first (in tee time order), then ALL back-9 at bottom
          // For R1/R2: standard tee time order (everyone usually starts hole 1)
          const round = a.pairingRoundNum || a.teeRoundNum || b.pairingRoundNum || b.teeRoundNum || 1;
          if (round >= 3) {
            const ah = a.pairingStartHole || a.startHole || 1;
            const bh = b.pairingStartHole || b.startHole || 1;
            if (ah !== bh) return ah - bh;
            // Within front-9: tee time DESC (latest/final pairings on top)
            // Within back-9: tee time ASC (earliest first, since they go off first physically)
            const ta = parseTeeTime(a.pairingTeeTime || a.teeTime);
            const tb = parseTeeTime(b.pairingTeeTime || b.teeTime);
            if (ta !== tb) {
              return ah === 10 ? ta - tb : tb - ta;
            }
            const pa=parsePos(a.pos),pb=parsePos(b.pos);
            if(pa&&pb)return pa-pb;
            return (a.rank??999)-(b.rank??999);
          }
          // R1/R2: standard tee time DESC then start hole, then position
          const ta = parseTeeTime(a.pairingTeeTime || a.teeTime);
          const tb = parseTeeTime(b.pairingTeeTime || b.teeTime);
          if (ta !== tb) return tb - ta;
          const ah = a.pairingStartHole || a.startHole || 1;
          const bh = b.pairingStartHole || b.startHole || 1;
          if (ah !== bh) return ah - bh;
          const pa=parsePos(a.pos),pb=parsePos(b.pos);
          if(pa&&pb)return pa-pb;
          return (a.rank??999)-(b.rank??999);
        }
        // Default: Leaderboard mode — sort by position, then tee time DESC within ties
        const pa=parsePos(a.pos),pb=parsePos(b.pos);
        if(pa&&pb){
          if(pa!==pb) return pa-pb;
        } else if(!pa&&pb){
          return 1;
        } else if(pa&&!pb){
          return -1;
        } else {
          return (a.rank??999)-(b.rank??999);
        }
        const ta = parseTeeTime(a.teeTime);
        const tb = parseTeeTime(b.teeTime);
        if (ta !== tb) return tb - ta;
        const ah = a.startHole || 1;
        const bh = b.startHole || 1;
        if (ah !== bh) return ah - bh;
        return a.name.localeCompare(b.name);
      });
  const tierField=field.filter(p=>p.tier===activeTier).sort((a,b)=>a.name.localeCompare(b.name));
  const filteredTier=tierField.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const fieldVis=sortF.filter(p=>{
    if(!p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if(showOnlyFavorites && !favorites.has(p.name)) return false;
    return true;
  });

  const adminAction=async(action,extra={})=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,action,password:adminPw,...extra})});
      const d=await r.json();
      if(d.error){msg(d.error);return null;}
      if(d.entries!==undefined)setEntries(d.entries||[]);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
      if(d.paymentsHidden!==undefined)setPaymentsHidden(d.paymentsHidden);
      if(d.payments!==undefined)setPayments(d.payments||{});
      if(d.major!==undefined)setActiveMajor(d.major);
      return d;
    }catch(e){msg('Error');return null;}
  };

  const togglePayment=async(eName)=>{
    const paid=!!payments[eName];
    const d=await adminAction(paid?'mark-unpaid':'mark-paid',{entryName:eName});
    if(d?.ok)msg(paid?`${eName} marked unpaid`:`${eName} marked paid ✓`);
  };

  const switchMajor=async(major)=>{
    setActiveMajor(major);
    activeMajorRef.current = major;
    setField([]);
    setFieldSource(`⏳ Loading ${THEMES[major]?.eventName} field...`);
    const d=await adminAction('set-major',{major});
    if(d?.ok){
      msg(`Switched to ${THEMES[major].eventName} ${THEMES[major].emoji}`);
      fetchField(major, true);
    }
  };

  const pri={background:T.primary,color:'#faf6ed',border:'none',padding:'8px 18px',borderRadius:7,fontWeight:600,fontSize:13,cursor:'pointer'};
  const dan={background:'#8b2020',color:'#fff',border:'none',padding:'8px 18px',borderRadius:7,fontWeight:600,fontSize:13,cursor:'pointer'};
  const inp={flex:1,padding:'9px 12px',borderRadius:7,border:`1px solid ${T.inputBorder}`,fontSize:14,fontFamily:"'DM Sans',sans-serif",background:'#fff'};
  const bx={textAlign:'center',padding:'36px 16px',background:'#fff',borderRadius:12,border:`1px solid ${T.cardBorder}`};
  const sec={background:'#fff',padding:14,borderRadius:9,marginBottom:9,border:`1px solid ${T.cardBorder}`};
  const stl={fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,marginBottom:6};

  if(!ready)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:T.bodyBg,fontFamily:'sans-serif'}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:28,height:28,border:`3px solid ${T.primary}20`,borderTopColor:T.primary,borderRadius:'50%',animation:'sp .7s linear infinite',marginBottom:12}}/>
      <p style={{color:T.primary,fontSize:15}}>Loading pool...</p>
    </div>
  );

  // Show loading state if PGA Tour Mode schedule data hasn't loaded yet
  // Without this, the UI would default to "tournament hasn't started" mode and could allow late entries
  if(scheduleNotReady)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:T.bodyBg,fontFamily:'sans-serif',padding:20}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:28,height:28,border:`3px solid ${T.primary}20`,borderTopColor:T.primary,borderRadius:'50%',animation:'sp .7s linear infinite',marginBottom:12}}/>
      <p style={{color:T.primary,fontSize:15,marginBottom:6}}>Loading tournament info...</p>
      <ScheduleRetry onRetry={()=>{fetchSchedule();}} primary={T.primary}/>
    </div>
  );

  if(poolNotFound){
    return(
      <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:'100vh',background:'#f5f5f0',color:'#1a2e0a',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{textAlign:'center',maxWidth:420}}>
          <div style={{fontSize:64,marginBottom:16}}>⛳</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,marginBottom:12}}>Pool not found</h1>
          <p style={{color:'#6b7280',fontSize:14,lineHeight:1.5,marginBottom:24}}>
            This pool doesn't exist or has been deleted. The link may be incorrect, or the commissioner has removed the pool.
          </p>
          <a href="/" style={{display:'inline-block',background:'#1a2a5c',color:'#fff',padding:'10px 24px',borderRadius:8,textDecoration:'none',fontSize:14,fontWeight:600}}>← Back to home</a>
        </div>
      </div>
    );
  }

  // Join code gate — must come after ALL hooks to comply with Rules of Hooks
  if (JOIN_CODE_REQUIRED && !joinCodePassed && !justActivated) {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{background:'#fff',borderRadius:16,padding:36,maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <div style={{fontSize:48,marginBottom:12}}>⛳</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:'#1a2a5c',marginBottom:8}}>Private Pool</h2>
          <p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Enter the join code from your commissioner to access this pool.</p>
          <input
            style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1px solid #d1d5db',fontSize:18,textAlign:'center',letterSpacing:4,fontWeight:700,boxSizing:'border-box',marginBottom:12,textTransform:'uppercase'}}
            placeholder="XXXXXX"
            maxLength={8}
            value={joinCodeEntry}
            onChange={e=>setJoinCodeEntry(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==='Enter'&&handleJoinCodeSubmit()}
          />
          {joinCodeError&&<div style={{color:'#dc2626',fontSize:13,marginBottom:12}}>{joinCodeError}</div>}
          <button type="button" onClick={handleJoinCodeSubmit}
            style={{width:'100%',background:'#1a2a5c',color:'#fff',border:'none',borderRadius:8,padding:'12px',fontSize:15,fontWeight:700,cursor:'pointer'}}>
            Join Pool →
          </button>
        </div>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',color:'#1a2e0a'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes su{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes flagWave{0%,100%{transform:skewX(0deg)}25%{transform:skewX(-3deg)}75%{transform:skewX(2deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        button{cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}
        input:focus{outline:2px solid ${T.primary};outline-offset:1px}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.primary}30;border-radius:3px}
      `}</style>

      {toast&&<div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',background:'#1a2e0a',color:'#faf6ed',padding:'8px 20px',borderRadius:9,fontSize:13,fontWeight:600,zIndex:200,animation:'sd .25s ease',boxShadow:'0 4px 14px rgba(0,0,0,.2)',maxWidth:'90%',textAlign:'center'}}>{toast}</div>}

      {showEditModal&&(()=>{
        const entryToEdit=entries.find(e=>e.name===showEditModal);
        const handleSubmit=async()=>{
          const code=document.getElementById('editCodeInput').value.trim();
          if(!code)return msg('Enter your edit code');
          await startEdit(showEditModal,code);
        };
        return(
          <div onClick={()=>setShowEditModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,padding:24,maxWidth:380,width:'100%',animation:'su .25s ease'}}>
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:36,marginBottom:6}}>✏️</div>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:T.primary,marginBottom:4}}>Edit {showEditModal}'s Picks</h3>
                <p style={{fontSize:12,color:'#888'}}>Enter the edit code from your email</p>
              </div>
              <input id="editCodeInput" autoFocus style={{...inp,textAlign:'center',letterSpacing:6,fontSize:20,fontWeight:700,textTransform:'uppercase',width:'100%',marginBottom:10}} placeholder="XXXXXX" maxLength={6} onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
              <button type="button" onClick={handleSubmit} style={{...pri,width:'100%',padding:12,borderRadius:9,marginBottom:8}}>Unlock Picks →</button>
              {entryToEdit?.email&&<button type="button" onClick={()=>{resendCode(showEditModal,entryToEdit.email);setShowEditModal(null);}} style={{background:'transparent',border:'none',color:T.primary,fontSize:12,width:'100%',padding:8,cursor:'pointer',textDecoration:'underline'}}>Resend code to {entryToEdit.email}</button>}
              <button type="button" onClick={()=>setShowEditModal(null)} style={{background:'transparent',border:'none',color:'#888',fontSize:12,width:'100%',padding:8,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {customEmojiFor&&(()=>{
        const handleEmojiSubmit=()=>{
          const input=document.getElementById('customEmojiInput');
          const val=input.value.trim();
          if(!val)return;
          // Extract first emoji-like character (handles multi-codepoint emojis)
          const match=val.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u);
          const emoji=match?match[0]:val;
          if(emoji.length>10)return msg('Please pick a single emoji');
          reactToMessage(customEmojiFor,emoji);
          setCustomEmojiFor(null);
        };
        return(
          <div onClick={()=>setCustomEmojiFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:160,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,padding:24,maxWidth:340,width:'100%',animation:'su .25s ease'}}>
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:36,marginBottom:6}}>😀</div>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:T.primary,marginBottom:4}}>Pick any emoji</h3>
                <p style={{fontSize:12,color:'#888'}}>Tap below and use your emoji keyboard</p>
              </div>
              <input
                id="customEmojiInput"
                autoFocus
                type="text"
                inputMode="text"
                style={{...inp,width:'100%',fontSize:32,textAlign:'center',padding:'14px 12px',marginBottom:10}}
                placeholder="Tap here & open emoji keyboard"
                onKeyDown={e=>e.key==='Enter'&&handleEmojiSubmit()}
              />
              <button type="button" onClick={handleEmojiSubmit} style={{...pri,width:'100%',padding:12,borderRadius:9,marginBottom:8}}>Add Reaction →</button>
              <button type="button" onClick={()=>setCustomEmojiFor(null)} style={{background:'transparent',border:'none',color:'#888',fontSize:12,width:'100%',padding:8,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {showClaimModal&&(()=>{
        const handleSubmit=async()=>{
          const email=document.getElementById('claimEmailInput').value.trim();
          if(!email)return msg('Enter your email');
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return msg('Invalid email format');
          const ok=await claimEntry(showClaimModal,email);
          if(ok)setShowClaimModal(null);
        };
        return(
          <div onClick={()=>setShowClaimModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,padding:24,maxWidth:380,width:'100%',animation:'su .25s ease'}}>
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:36,marginBottom:6}}>📧</div>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:T.primary,marginBottom:4}}>Add email to {showClaimModal}'s Entry</h3>
                <p style={{fontSize:12,color:'#888'}}>This entry was submitted without an email. Add yours to enable picks editing.</p>
              </div>
              <input id="claimEmailInput" autoFocus type="email" style={{...inp,fontSize:14,width:'100%',marginBottom:10}} placeholder="your@email.com" onKeyDown={e=>e.key==='Enter'&&handleSubmit()}/>
              <button type="button" onClick={handleSubmit} style={{...pri,width:'100%',padding:12,borderRadius:9,marginBottom:8}}>Send Edit Code →</button>
              <p style={{fontSize:10,color:'#aaa',textAlign:'center',marginBottom:8}}>⚠️ Only do this if this is YOUR entry. The pool commissioner can see all emails.</p>
              <button type="button" onClick={()=>setShowClaimModal(null)} style={{background:'transparent',border:'none',color:'#888',fontSize:12,width:'100%',padding:8,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        );
      })()}

      {selectedPlayer&&(()=>{
        const p=selectedPlayer;
        const t=TIERS.find(t=>t.id===p.tier);
        const ow=owners(p.name);
        const coursePar = 70; // Aronimink par
        const toPar = (v) => v == null ? null : v - coursePar;
        const rounds=[
          {label:'R1',val:toPar(p.r1),raw:p.r1,num:1},
          {label:'R2',val:toPar(p.r2),raw:p.r2,num:2},
          {label:'R3',val:toPar(p.r3),raw:p.r3,num:3},
          {label:'R4',val:toPar(p.r4),raw:p.r4,num:4},
        ];
        const completedRounds=rounds.filter(r=>r.val!=null);
        const front=holeData.holes.slice(0,9);
        const back=holeData.holes.slice(9,18);
        const holeSummary=holeData.holes.reduce((acc,h)=>{
          if(h.toPar==null)return acc;
          if(h.toPar<=-2)acc.eagles++;else if(h.toPar===-1)acc.birdies++;
          else if(h.toPar===0)acc.pars++;else if(h.toPar===1)acc.bogeys++;else acc.doubles++;
          return acc;
        },{eagles:0,birdies:0,pars:0,bogeys:0,doubles:0});
        return(
          <div onClick={closeScorecard} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:150,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:'18px 18px 0 0',width:'100%',maxWidth:500,animation:'su .25s ease',boxShadow:'0 -8px 40px rgba(0,0,0,.25)',maxHeight:'92vh',overflowY:'auto'}}>
              <div style={{padding:'20px 20px 0'}}>
                <div style={{width:40,height:4,background:'#ddd',borderRadius:2,margin:'0 auto 16px'}}/>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <div style={{fontSize:38,lineHeight:1}}><Flag c={p.country}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800}}>{flip(p.name)}</div>
                    <div style={{fontSize:12,color:'#8a9580',marginTop:2}}>{p.country} · <span style={{fontWeight:700,color:t?.color}}>{t?.label}</span> · {p.odds}{p.confirmed&&!pastTeeTime&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 6px',borderRadius:8}}>✓ Confirmed</span>}{p.onTrack&&!p.confirmed&&!pastTeeTime&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 6px',borderRadius:8}}>– On Track</span>}</div>
                    {p.teeTime&&<div style={{fontSize:11,color:T.primary,marginTop:3,fontWeight:600}}>⏰ R{p.teeRoundNum||1} Tee: {p.teeTime}{p.startHole?` · Hole ${p.startHole}`:''}</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:26,fontWeight:800,color:T.primary}}>{p.score}</div>
                    <div style={{fontSize:12,color:'#8a9580'}}>Pos <b style={{color:'#333'}}>{p.pos}</b></div>
                  </div>
                </div>
                {(() => {
                  // liveStatsLoaded triggers re-render when stats arrive
                  if (!liveStatsLoaded) return null;
                  const stats = liveStatsRef.current?.[(p.name||'').toLowerCase().trim()];
                  if (!stats || stats.sg_total == null) return null;
                  const fmtSG = (v) => v == null ? '—' : (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
                  const sgColor = (v) => v == null ? '#888' : v > 0 ? '#1a6b1a' : v < 0 ? '#b02020' : '#555';
                  const cats = [
                    {label:'Total',val:stats.sg_total},
                    {label:'OTT',val:stats.sg_ott},
                    {label:'APP',val:stats.sg_app},
                    {label:'ARG',val:stats.sg_arg},
                    {label:'PUTT',val:stats.sg_putt},
                  ];
                  return (
                    <div style={{marginBottom:14,padding:'10px 12px',background:`${T.primary}08`,borderRadius:9,border:`1px solid ${T.primary}20`}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.primary,letterSpacing:1,marginBottom:6}}>STROKES GAINED · per round</div>
                      <div style={{display:'flex',justifyContent:'space-between',gap:4}}>
                        {cats.map(c => (
                          <div key={c.label} style={{flex:1,textAlign:'center'}}>
                            <div style={{fontSize:9,color:'#8a9580',fontWeight:600,letterSpacing:.5}}>{c.label}</div>
                            <div style={{fontSize:14,fontWeight:800,color:sgColor(c.val),marginTop:2}}>{fmtSG(c.val)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  // DataGolf profile link — uses dgId from player object, falls back to live-stats lookup
                  const stats = liveStatsRef.current?.[(p.name||'').toLowerCase().trim()];
                  const dgId = p.dgId || stats?.dg_id;
                  if (!dgId) return null;
                  return (
                    <a href={`https://datagolf.com/player-profiles?dg_id=${dgId}`} target="_blank" rel="noopener noreferrer"
                       style={{display:'block',textAlign:'center',padding:'8px 12px',marginBottom:14,fontSize:11,fontWeight:600,color:T.primary,background:'#fff',border:`1px solid ${T.primary}40`,borderRadius:8,textDecoration:'none'}}>
                      📊 View full profile on DataGolf →
                    </a>
                  );
                })()}
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',letterSpacing:1,marginBottom:8}}>ROUNDS — tap any started round for hole scores</div>
                  <div style={{display:'flex',gap:8}}>
                    {rounds.map(r=>{
                      const active=holeData.round===r.num;
                      const done=r.val!=null;
                      // A round is "in progress" if player has thru data > 0 but no completed round score
                      // Find the lowest round number that's not done — that's the current round
                      const playerCurrentRound = (()=>{
                        // Player is "in progress" only if they have an active thru count between 1-17
                        // (0 = haven't started, 18 = finished, then waiting for next round)
                        const thruNum = parseInt(p.thru, 10);
                        const isActivelyPlaying = thruNum > 0 && thruNum < 18;
                        if(!isActivelyPlaying)return null;
                        if(p.r1==null)return 1;
                        if(p.r2==null)return 2;
                        if(p.r3==null)return 3;
                        if(p.r4==null)return 4;
                        return null;
                      })();
                      const isInProgress = r.num === playerCurrentRound;
                      const clickable = done || isInProgress;
                      const col=done?(r.val<0?'#1a6b1a':r.val===0?'#000':'#b02020'):'#ccc';
                      return(<button key={r.label} type="button" onClick={()=>clickable&&fetchHoleScores(p.name,r.num)} disabled={!clickable||holeData.loading}
                        style={{flex:1,textAlign:'center',background:active?T.primary:done?'#f5f5f5':clickable?'#fafafa':'#fafafa',borderRadius:12,padding:'10px 4px',border:`2px solid ${active?T.primary:done?col+'44':clickable?'#ccc':'#eee'}`,cursor:clickable?'pointer':'default',transition:'all .15s'}}>
                        <div style={{fontSize:10,color:active?'#fff99a':'#888',fontWeight:600,marginBottom:4}}>{r.label}</div>
                        {done?<div style={{fontSize:22,fontWeight:800,color:active?'#fff':col}}>{r.raw}</div>:isInProgress?(() => {
                          const liveCol = p.today && p.today.startsWith('-') ? '#1a6b1a' : p.today === 'E' ? '#555' : p.today ? '#b02020' : '#666';
                          return <div style={{fontSize:22,fontWeight:800,color:active?'#fff':liveCol}}>{p.today||'E'}</div>;
                        })():<div style={{fontSize:20,fontWeight:800,color:clickable?'#666':'#ddd'}}>{clickable?'•••':'-'}</div>}
                        {(done||clickable)&&<div style={{fontSize:9,color:active?'#ffffff99':'#aaa',marginTop:2}}>{active?'▲ hide':isInProgress?'live':'tap'}</div>}
                      </button>);
                    })}
                  </div>
                </div>
                {holeData.loading&&<div style={{textAlign:'center',padding:'20px 0'}}><div style={{width:24,height:24,border:`3px solid ${T.primary}20`,borderTopColor:T.primary,borderRadius:'50%',animation:'sp .7s linear infinite',margin:'0 auto 8px'}}/><div style={{fontSize:12,color:'#aaa'}}>Loading hole scores...</div></div>}
                {!holeData.loading&&holeData.error&&holeData.round&&<div style={{textAlign:'center',padding:'16px 0',fontSize:12,color:'#bbb'}}>{holeData.error}</div>}
                {!holeData.loading&&holeData.holes.length>0&&(()=>{
                  const HoleCell=({h})=>{const s=holeStyle(h.toPar);return(
                    <div style={{flex:1,textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#aaa',marginBottom:2}}>H{h.hole}</div>
                      <div style={{width:30,height:30,borderRadius:h.toPar<=-1?'50%':'4px',background:s.bg,color:s.text,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,margin:'0 auto',outline:`2px solid ${s.ring}`,outlineOffset:1}}>{h.score??'-'}</div>
                      <div style={{fontSize:9,color:'#bbb',marginTop:2}}>p{h.par}</div>
                      {s.label&&<div style={{fontSize:9}}>{s.label}</div>}
                    </div>);};
                  return(<div style={{marginTop:14,marginBottom:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#aaa',letterSpacing:1,marginBottom:8}}>HOLE BY HOLE — ROUND {holeData.round}</div>
                    <div style={{display:'flex',gap:5,marginBottom:10,flexWrap:'wrap'}}>
                      {[{l:'Eagle',bg:'#1565c0',t:'#fff',r:true},{l:'Birdie',bg:'#f9a825',t:'#3e2000',r:true},{l:'Par',bg:'#eee',t:'#555'},{l:'Bogey',bg:'#ffcdd2',t:'#c62828'},{l:'Double+',bg:'#e53935',t:'#fff'}].map(x=>(
                        <span key={x.l} style={{fontSize:9,padding:'2px 6px',borderRadius:x.r?10:4,background:x.bg,color:x.t,fontWeight:600}}>{x.l}</span>))}
                    </div>
                    <div style={{fontSize:10,color:'#aaa',marginBottom:6,fontWeight:600}}>FRONT 9</div>
                    <div style={{display:'flex',gap:3,marginBottom:14}}>{front.map(h=><HoleCell key={h.hole} h={h}/>)}</div>
                    {back.length>0&&<><div style={{fontSize:10,color:'#aaa',marginBottom:6,fontWeight:600}}>BACK 9</div><div style={{display:'flex',gap:3,marginBottom:14}}>{back.map(h=><HoleCell key={h.hole} h={h}/>)}</div></>}
                    <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>
                      {holeSummary.eagles>0&&<span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#1565c0',color:'#fff',fontWeight:700}}>🦅 {holeSummary.eagles}</span>}
                      {holeSummary.birdies>0&&<span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#f9a825',color:'#3e2000',fontWeight:700}}>🐦 {holeSummary.birdies}</span>}
                      {holeSummary.pars>0&&<span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#eee',color:'#555',fontWeight:700}}>{holeSummary.pars} pars</span>}
                      {holeSummary.bogeys>0&&<span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#ffcdd2',color:'#c62828',fontWeight:700}}>{holeSummary.bogeys} bogey{holeSummary.bogeys>1?'s':''}</span>}
                      {holeSummary.doubles>0&&<span style={{fontSize:11,padding:'3px 9px',borderRadius:10,background:'#e53935',color:'#fff',fontWeight:700}}>{holeSummary.doubles} dbl+</span>}
                    </div>
                  </div>);
                })()}
                {!holeData.loading&&!holeData.round&&completedRounds.length===0&&p.thru&&(
                  <div style={{display:'flex',gap:8,marginTop:4,marginBottom:4}}>
                    <div style={{flex:2,textAlign:'center',background:`${T.primary}0a`,borderRadius:12,padding:'10px 8px',border:`2px solid ${T.primary}22`}}>
                      <div style={{fontSize:10,color:'#888',fontWeight:600,marginBottom:4}}>TODAY</div>
                      <div style={{fontSize:22,fontWeight:800,color:p.today&&p.today.startsWith('-')?'#1a6b1a':p.today==='E'?'#555':'#b02020'}}>{p.today||'E'}</div>
                    </div>
                    <div style={{flex:1,textAlign:'center',background:'#f5f5f5',borderRadius:12,padding:'10px 8px',border:'2px solid #eee'}}>
                      <div style={{fontSize:10,color:'#888',fontWeight:600,marginBottom:4}}>THRU</div>
                      <div style={{fontSize:22,fontWeight:800,color:'#555'}}>{p.thru}</div>
                    </div>
                  </div>)}
                {p.earnings>0&&<div style={{background:`${T.primary}10`,borderRadius:10,padding:'10px 14px',marginTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:T.primary,fontWeight:600}}>Projected Earnings</span><span style={{fontSize:20,fontWeight:800,color:T.primary}}>{fmt(p.earnings)}</span></div>}
                {!picksHidden&&<div style={{fontSize:12,color:'#8a9580',borderTop:'1px solid #f0ebe0',paddingTop:10,marginTop:12}}>{ow.length>0?(<><span style={{fontWeight:600}}>Picked by: </span>{ow.join(', ')}</>):'Not picked by anyone in the pool'}</div>}
                <button type="button" onClick={closeScorecard} style={{...pri,width:'100%',margin:'16px 0',padding:12,fontSize:14,borderRadius:10}}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      <header style={{background:T.headerBg,padding:0,color:'#faf6ed',position:'relative',overflow:'hidden',maxHeight:200}}>
        <div style={{maxWidth:600,margin:'0 auto',position:'relative'}}>
        <svg viewBox="0 0 800 200" style={{width:'100%',display:'block'}} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.dark}/><stop offset="100%" stopColor={T.primary}/></linearGradient>
            <linearGradient id="fairway" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.mid}/><stop offset="100%" stopColor={T.dark}/></linearGradient>
          </defs>
          <rect width="800" height="200" fill="url(#sky)"/>
          <ellipse cx="120" cy="95" rx="45" ry="35" fill={T.dark} opacity=".6"/><ellipse cx="200" cy="90" rx="55" ry="40" fill={T.dark} opacity=".5"/>
          <ellipse cx="300" cy="92" rx="40" ry="32" fill={T.dark} opacity=".55"/><ellipse cx="500" cy="88" rx="60" ry="42" fill={T.dark} opacity=".5"/>
          <ellipse cx="620" cy="93" rx="50" ry="36" fill={T.dark} opacity=".6"/><ellipse cx="720" cy="90" rx="45" ry="38" fill={T.dark} opacity=".5"/>
          <path d="M0,140 Q100,110 200,130 Q350,155 450,125 Q550,100 650,128 Q750,150 800,130 L800,200 L0,200 Z" fill="url(#fairway)"/>
          <path d="M0,160 Q150,140 300,155 Q450,170 600,150 Q700,140 800,155 L800,200 L0,200 Z" fill={T.mid} opacity=".7"/>
          <line x1="580" y1="72" x2="580" y2="120" stroke="#ddd" strokeWidth="1.5"/>
          <path d="M580,72 L608,80 L580,88 Z" fill={T.accent} style={{animation:'flagWave 3s ease-in-out infinite'}}/>
          <circle cx="80" cy="155" r="12" fill={T.accent} opacity=".25"/><circle cx="95" cy="150" r="10" fill={T.accent} opacity=".2"/>
          <circle cx="700" cy="148" r="11" fill={T.accent} opacity=".25"/><circle cx="715" cy="144" r="9" fill={T.accent} opacity=".2"/>
          <ellipse cx="370" cy="175" rx="50" ry="12" fill={T.dark} opacity=".3"/>
        </svg>
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
          <div style={{maxWidth:'36%'}}>
            {poolMeta?.poolName&&<div style={{fontFamily:"'Playfair Display',serif",fontSize:12,fontWeight:700,opacity:.95,letterSpacing:.5,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{poolMeta.poolName}</div>}
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:9,fontWeight:activeMajor==='pgatour'?600:400,fontStyle:'italic',opacity:.85,letterSpacing:.6,marginBottom:3,lineHeight:1.2}}>{activeMajor==='pgatour'?T.eventName:T.tagline}</div>
            <div style={{fontSize:10,opacity:.65}}>{fmt(TOURNAMENT.purse)} purse</div>
          </div>
          {(()=>{
            const customLogo = poolMeta?.customLogoUrl;
            const useCustom = !!customLogo;
            const logoSrc = customLogo || T.logoUrl;
            const noBg = useCustom ? poolMeta?.customLogoNoBg : T.logoNoBg;
            const baseLogoHeight = useCustom ? (poolMeta?.customLogoHeight || 72) : (T.logoHeight || 72);
            // Bump logo size on desktop (window width > 600px)
            const isDesktop = typeof window !== 'undefined' && window.innerWidth > 600;
            const logoHeight = isDesktop ? Math.round(baseLogoHeight * 1.5) : baseLogoHeight;
            if(!logoSrc) return null;
            // If logoSrc is a Cloudinary PGA Tour event logo, fall back to the local PGA Tour shield on error
            const onLogoError = (ev) => {
              const fallback = '/logos/pga-tour.svg';
              if (ev.target.src.indexOf(fallback) === -1 && logoSrc.indexOf('res.cloudinary.com') !== -1) {
                ev.target.src = fallback;
              } else {
                // Final fallback: hide
                if (noBg) ev.target.style.display = 'none';
                else if (ev.target.parentElement) ev.target.parentElement.style.display = 'none';
              }
            };
            return noBg
              ?<img src={logoSrc} alt="Pool logo" style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',height:logoHeight,width:'auto',filter:'drop-shadow(0 3px 8px rgba(0,0,0,.4))',pointerEvents:'none'}} onError={onLogoError}/>
              :<div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',background:'#fff',borderRadius:8,padding:'5px 10px',boxShadow:'0 3px 8px rgba(0,0,0,.4)',pointerEvents:'none'}}><img src={logoSrc} alt="Pool logo" style={{height:logoHeight,width:'auto',display:'block'}} onError={onLogoError}/></div>;
          })()}
          <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,position:'relative'}}>
            <button type="button" onClick={()=>setTab('Admin')} aria-label="Admin settings" style={{position:'absolute',top:-8,right:-4,background:'#ffffff18',border:'1px solid #ffffff20',borderRadius:'50%',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0,backdropFilter:'blur(4px)'}}>
              <span style={{fontSize:14,filter:'grayscale(.3)'}}>⚙</span>
            </button>
            <div style={{background:'#ffffff18',borderRadius:10,padding:'2px 8px',fontSize:10,fontWeight:600,backdropFilter:'blur(4px)',border:'1px solid #ffffff15',whiteSpace:'nowrap',marginTop:24}}>{entries.length} {entries.length===1?'entry':'entries'}</div>
            {countdown&&<div style={{fontSize:10,opacity:.7}}>⏱ {countdownShort}</div>}
            {lastUp&&!countdown&&<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'glow 2s infinite'}}/><span style={{fontSize:9,opacity:.5}}>Live · {lastUp}</span></div>}
          </div>
        </div>
        </div>
      </header>

      <nav style={{display:'flex',background:T.navBg,borderBottom:`2px solid ${T.navBorder}`,position:'sticky',top:0,zIndex:10,boxShadow:'0 2px 6px rgba(0,0,0,.06)',maxWidth:600,margin:'0 auto'}}>
        {TABS.filter(t=>!(t==='Enter Pool'&&pastTeeTime)).map(t=><button key={t} onClick={()=>{setTab(t);setSearch('');}} style={{flex:1,padding:'11px 4px',fontSize:12,fontWeight:tab===t?700:500,border:'none',background:tab===t?T.navActive:'transparent',color:tab===t?T.primary:'#8a9580',borderBottom:tab===t?`3px solid ${T.primary}`:'3px solid transparent',letterSpacing:.3}}>{t}</button>)}
      </nav>
      {lastUp&&!picksHidden&&<div style={{padding:'4px 14px',background:T.navActive,borderBottom:`1px solid ${T.cardBorder}`,textAlign:'center'}}><span style={{fontSize:10,color:'#8a9580'}}>Scores update automatically · Last: {lastUp}</span></div>}
      {justActivated&&<div style={{background:'#d1fae5',padding:'10px 16px',fontSize:13,color:'#065f46',textAlign:'center',fontWeight:600}}>🎉 Your pool is live! Share this link with your friends to start entering picks.</div>}
      {status&&<div style={{background:'#fef3cd',padding:'8px 16px',fontSize:12,color:'#856404',textAlign:'center'}}>{status}</div>}

      <main style={{padding:'12px 12px 80px',maxWidth:660,margin:'0 auto',animation:'fu .35s ease'}}>

        {tab==='Standings'&&(<>
          {!pastTeeTime&&poolMeta?.entryFee>0&&entries.length>=3&&(()=>{
            const fee=poolMeta.entryFee;
            const pot=entries.length*fee;
            const third=fee;
            const second=fee*2;
            const first=pot-third-second;
            return <div style={{background:'#fff',border:`1px solid ${T.cardBorder}`,borderRadius:11,padding:'10px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10,justifyContent:'space-around'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:18,fontWeight:800,color:T.primary}}>🥇 ${first}</div>
                <div style={{fontSize:9,color:'#8a9580',marginTop:1}}>1st place</div>
              </div>
              <div style={{textAlign:'center',opacity:.7}}>
                <div style={{fontSize:14,fontWeight:700,color:T.primary}}>🥈 ${second}</div>
                <div style={{fontSize:9,color:'#8a9580',marginTop:1}}>2nd</div>
              </div>
              <div style={{textAlign:'center',opacity:.55}}>
                <div style={{fontSize:13,fontWeight:700,color:T.primary}}>🥉 ${third}</div>
                <div style={{fontSize:9,color:'#8a9580',marginTop:1}}>3rd</div>
              </div>
              <div style={{textAlign:'center',marginLeft:'auto',borderLeft:`1px solid ${T.cardBorder}`,paddingLeft:10}}>
                <div style={{fontSize:13,fontWeight:700,color:'#555'}}>${pot}</div>
                <div style={{fontSize:9,color:'#8a9580',marginTop:1}}>total pot</div>
              </div>
            </div>;
          })()}          {!locked&&poolMeta?.paid!==false&&(()=>{
            const shareLink=typeof window!=='undefined'?window.location.origin+'/pool/'+poolId:'';
            const fee=poolMeta?.entryFee||0;
            const pot=entries.length*fee;
            const first=pot>0?pot-fee*3:0;
            const payoutLine=fee>0&&entries.length>=3
              ?`🏆 Pot: $${pot} ($${fee} entry × ${entries.length} entries)\n🥇 1st: $${first}  🥈 2nd: $${fee*2}  🥉 3rd: $${fee}\n\n`
              :fee>0
                ?`💵 Entry: $${fee} per person\n\n`
                :'';
            const countdownLine=countdown?`⏱ Entries close ${countdown.replace(' until entries lock','')}\n\n`:'';
            const shareText=`Join my ${T.eventName} pool on Tuna Golf Pool!

Pick 2 favorites, 4 contenders, 3 longshots — highest combined earnings wins.

${payoutLine}${countdownLine}→ ${shareLink}`;
            const handleShare=async()=>{
              if(navigator.share){
                try{await navigator.share({title:`Join ${poolMeta?.poolName||T.eventName}`,text:shareText});}catch{}
              }else{
                try{await navigator.clipboard.writeText(shareText);msg('Invite copied to clipboard!');}
                catch{msg('Could not copy — try long-press on the link');}
              }
            };
            return(
              <button type="button" onClick={handleShare} style={{
                width:'100%',background:'#fff',border:`2px dashed ${T.primary}55`,
                borderRadius:11,padding:'10px 14px',marginBottom:10,
                display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                fontSize:13,fontWeight:700,color:T.primary,cursor:'pointer',
              }}>
                <span style={{fontSize:16}}>🔗</span>
                <span>Invite friends to join</span>
              </button>
            );
          })()}
          {poolMeta?.paid===false&&<div style={{
            background:`linear-gradient(135deg,${T.dark} 0%,${T.mid} 100%)`,
            borderRadius:14,marginBottom:12,padding:'16px 18px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            boxShadow:`0 4px 16px ${T.primary}40`,
          }}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Next Major</div>
              <div style={{fontSize:20,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif",letterSpacing:-.5}}>{T.eventName}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:3}}>Unlock to start entering picks</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36}}>{T.emoji}</div>
              <button type="button" onClick={async()=>{
                const bypassCode=prompt('Promo/bypass code (leave blank to pay):')||'';
                const res=await fetch('/api/reactivate-pool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,bypassCode})});
                const d=await res.json();
                if(d.free){loadEntries();msg('Pool unlocked! ✓');}
                else if(d.checkoutUrl){window.location.href=d.checkoutUrl;}
                else msg(d.error||'Error');
              }} style={{marginTop:6,background:'#c9a84c',border:'none',color:'#1a2a5c',borderRadius:20,padding:'5px 14px',fontSize:11,fontWeight:800,cursor:'pointer'}}>
                Unlock — $10 →
              </button>
            </div>
          </div>}
          {countdown&&poolMeta?.paid!==false&&<div style={{
            background:`linear-gradient(135deg,${T.dark} 0%,${T.mid} 100%)`,
            borderRadius:14,marginBottom:12,padding:'16px 18px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            boxShadow:`0 4px 16px ${T.primary}40`,
          }}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{locked?'Tournament Tees Off In':'Entries Close In'}</div>
              <div style={{fontSize:26,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif",letterSpacing:-.5}}>{countdown.replace(' until entries lock','')}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:3}}>{T.courseName}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36}}>{T.emoji}</div>
              {!locked&&<button type="button" onClick={()=>setTab('Enter Pool')} style={{
                marginTop:6,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                color:'#fff',borderRadius:20,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer',
              }}>Enter Now →</button>}
            </div>
          </div>}
          {ranked.length===0?
          <div style={bx}><div style={{fontSize:44,marginBottom:10}}>🏌️</div><p style={{color:T.primary,fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:16,marginBottom:14}}>The field awaits your picks.</p><button type="button" style={pri} onClick={()=>setTab('Enter Pool')}>Enter the Pool</button></div>
          :<>
            {picksHidden&&<div style={{background:T.accentLight,padding:'12px 16px',borderRadius:9,marginBottom:10,fontSize:13,color:T.accent,textAlign:'center',border:`1px solid ${T.accent}30`}}>🏆 Picks hidden until first tee.{countdown?' '+countdown+'.':' Revealing soon!'}</div>}
            {ranked.map((e,i)=>{const tot=teamE(e),op=openCard===e.name,paid=!!payments[e.name];const isLast=i===ranked.length-1&&ranked.length>1&&!picksHidden;
            // Compute prize amounts for top 3
            const fee=poolMeta?.entryFee||0;
            const showPrizes=!picksHidden&&fee>0&&ranked.length>=3;
            const pot=ranked.length*fee;
            const prizes=[pot-fee*3, fee*2, fee];
            const prize=showPrizes&&i<3?prizes[i]:0;
            return(
              <div key={e.name} style={{background:'#fff',borderRadius:11,padding:'12px 14px',marginBottom:7,border:`1px solid ${T.cardBorder}`,animation:'fu .3s ease both',animationDelay:i*.04+'s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,cursor:picksHidden?'default':'pointer'}} onClick={()=>!picksHidden&&setOpenCard(op?null:e.name)}>
                  {!picksHidden&&<div style={{fontSize:i<3||isLast?18:14,fontWeight:800,width:32,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:isLast?'💩':i+1}</div>}
                  {picksHidden&&<div style={{width:32,textAlign:'center',fontSize:16}}>✅</div>}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700}}>{e.name}</span>
                      {prize>0&&<span style={{fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:10,background:i===0?'#fef3c7':i===1?'#e5e7eb':'#fde0c4',color:i===0?'#92400e':i===1?'#555':'#9a4a00',border:`1px solid ${i===0?'#fbbf24':i===1?'#999':'#e08040'}`}}>💰 ${prize}</span>}
                      {!paymentsHidden&&<span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10,background:paid?'#e8f5e8':'#f5f5f5',color:paid?'#2d7a1e':'#aaa',border:`1px solid ${paid?'#2d7a1e30':'#ddd'}`}}>{paid?'✓ Paid':'Unpaid'}</span>}
                    </div>
                    <div style={{fontSize:11,color:'#8a9580',marginTop:1}}>{picksHidden?'Entry submitted — picks hidden until tee-off':'Tap to '+(op?'collapse':'expand')}</div>
                  </div>
                  {!locked&&(e.email?
                    <button type="button" onClick={(ev)=>{ev.stopPropagation();setShowEditModal(e.name);}} style={{background:'transparent',border:`1px solid ${T.primary}30`,color:T.primary,padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>✏️ Edit</button>
                    :<button type="button" onClick={(ev)=>{ev.stopPropagation();setShowClaimModal(e.name);}} style={{background:'transparent',border:`1px solid #c9a84c80`,color:'#7a5500',padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>📧 Add email</button>
                  )}
                  {!picksHidden&&<div style={{fontWeight:800,fontSize:17,color:T.primary}}>{fmt(tot)}</div>}
                </div>
                {!picksHidden&&op&&<div style={{marginTop:8,borderTop:'1px solid #eee8dc',paddingTop:8,animation:'sd .2s ease'}}>
                  {TIERS.map(t=>{const tp=e.picks.filter(pn=>field.find(f=>f.name===pn)?.tier===t.id);if(!tp.length)return null;return<div key={t.id} style={{marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.color,marginBottom:3,letterSpacing:.5}}>{t.label.toUpperCase()}</div>
                    {tp.map(pn=>{const p=field.find(f=>f.name===pn);return<div key={pn} onClick={(ev)=>{ev.stopPropagation();if(p)setSelectedPlayer(p);}} style={{display:'flex',padding:'4px 0',borderBottom:'1px solid #f5f0e8',alignItems:'center',gap:6,cursor:p?'pointer':'default'}}>
                      <span style={{fontSize:14}}><Flag c={p?.country}/></span>
                      <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13,color:p?T.primary:'#333',textDecoration:p?'underline':'none',textDecorationStyle:'dotted',textUnderlineOffset:2}}>{flip(pn)}</span>{p&&<span style={{fontSize:11,color:'#8a9580',marginLeft:6}}>{p.pos} · {p.score}</span>}</div>
                      <span style={{fontWeight:700,fontSize:13,color:T.primary}}>{fmt(p?.earnings)}</span>
                    </div>;})}
                  </div>;})}
                </div>}
                {!picksHidden&&!op&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                  {e.picks.map(pn=>{const p=field.find(f=>f.name===pn);const t=TIERS.find(t=>t.id===p?.tier);return<span key={pn} onClick={(ev)=>{ev.stopPropagation();if(p)setSelectedPlayer(p);}} style={{fontSize:10,background:T.navActive,padding:'2px 7px',borderRadius:4,border:`1px solid ${T.cardBorder}`,borderLeft:`3px solid ${t?.color||'#ccc'}`,cursor:p?'pointer':'default'}}><Flag c={p?.country}/> {pn.split(', ')[0]} <b style={{color:T.primary}}>{fmt(p?.earnings)}</b></span>;})}
                </div>}
              </div>);})}
          </>}
        </>)}

        {tab==='Enter Pool'&&(locked
          ? poolMeta?.paid===false
            ?<div style={bx}>
              <div style={{fontSize:44,marginBottom:10}}>💳</div>
              <p style={{fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:16,color:T.primary,marginBottom:6}}>{poolMeta?.poolName}</p>
              <p style={{color:'#6b7280',fontSize:13,marginBottom:20}}>Unlock <b>{T.eventName}</b> to start entering picks for your group.</p>
              <button type="button" style={{...pri,marginBottom:10}} onClick={async()=>{
                const bypassCode = prompt('Promo/bypass code (leave blank to pay):') || '';
                const res = await fetch('/api/reactivate-pool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,bypassCode})});
                const d = await res.json();
                if(d.free){ loadEntries(); msg('Pool unlocked! ✓'); }
                else if(d.checkoutUrl){ window.location.href = d.checkoutUrl; }
                else msg(d.error||'Error');
              }}>Unlock for {T.eventName} — $10 →</button>
              <div style={{fontSize:11,color:'#9ca3af'}}>Your pool history and URL are preserved · Secure payment via Stripe</div>
            </div>
            :<div style={bx}><div style={{fontSize:44,marginBottom:10}}>🔒</div><p style={{color:'#6b7c5e',fontWeight:700,marginBottom:6}}>Entries locked</p><p style={{color:'#8a9580',fontSize:13}}>The pool is currently closed. Check back soon — entries reopen once odds are available.</p></div>
          :<>
            {countdown&&<div style={{background:T.accentLight,padding:'8px 14px',borderRadius:9,marginBottom:10,fontSize:12,color:T.accent,textAlign:'center',border:`1px solid ${T.accent}30`}}>⏱ {countdown}</div>}
            {editMode&&<div style={{background:'#fff7e6',border:'1px solid #f5c14a',borderRadius:9,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#7a5500',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span>✏️ Editing <b>{entryName}</b>'s picks</span>
              <button type="button" onClick={()=>{setEditMode(false);setEntryName('');setEntryEmail('');setEditCode('');setPicks({1:[],2:[],3:[]});}} style={{background:'transparent',border:'1px solid #7a550040',color:'#7a5500',padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            </div>}
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <input style={inp} placeholder="Your Name" value={entryName} disabled={editMode} onChange={e=>setEntryName(e.target.value)}/>
              <div style={{background:T.primary,color:'#faf6ed',minWidth:50,height:44,borderRadius:9,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>
                <span style={{fontSize:18,fontWeight:800}}>{totalPicked}</span><span style={{fontSize:9,opacity:.6}}>/{TOTAL_PICKS}</span>
              </div>
            </div>
            {!editMode&&<input style={{...inp,marginBottom:10,width:'100%'}} type="email" placeholder="Your Email (for edit code)" value={entryEmail} onChange={e=>setEntryEmail(e.target.value)}/>}
            {totalPicked>0&&<div style={{background:`${T.primary}10`,borderRadius:9,padding:10,marginBottom:10,border:`1px solid ${T.primary}1a`}}>
              <div style={{fontSize:10,fontWeight:700,color:T.primary,marginBottom:5,letterSpacing:1}}>YOUR PICKS</div>
              {TIERS.map(t=>{if(!picks[t.id].length)return null;return<div key={t.id} style={{marginBottom:4}}>
                <div style={{fontSize:10,color:t.color,fontWeight:600,marginBottom:2}}>{t.label} ({picks[t.id].length}/{t.picks})</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{picks[t.id].map(p=>{const pl=field.find(f=>f.name===p);return<button key={p} type="button" onClick={()=>removePick(p)} style={{background:t.color,color:'#faf6ed',border:'none',borderRadius:5,padding:'3px 9px',fontSize:11,fontWeight:500}}><Flag c={pl?.country}/> {flip(p)} ✕</button>;})}</div>
              </div>;})}
            </div>}
            <div style={{display:'flex',gap:0,marginBottom:8,borderRadius:8,overflow:'hidden',border:`1px solid ${T.inputBorder}`}}>
              {TIERS.map(t=>{const a=activeTier===t.id,full=picks[t.id].length>=t.picks;return<button key={t.id} type="button" onClick={()=>{setActiveTier(t.id);setSearch('');}} style={{flex:1,padding:'9px 4px',fontSize:11,fontWeight:a?700:500,border:'none',background:a?t.color:'#fff',color:a?'#fff':t.color,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><span>{t.name}</span><span style={{fontSize:10,opacity:.8}}>{picks[t.id].length}/{t.picks} {full?'✓':''}</span></button>;})}
            </div>
            <input style={{...inp,marginBottom:8}} placeholder={`Search ${TIERS.find(t=>t.id===activeTier)?.name||''}...`} value={search} onChange={e=>setSearch(e.target.value)}/>
            <div style={{maxHeight:320,overflowY:'auto',borderRadius:9,border:`1px solid ${T.inputBorder}`,background:'#fff'}}>
              {filteredTier.map(p=>{const sel=picks[activeTier].includes(p.name),full=!sel&&picks[activeTier].length>=TIERS.find(t=>t.id===activeTier)?.picks,ow=owners(p.name);return(
                <button key={p.name} type="button" onClick={()=>!full&&togglePick(p.name,activeTier)}
                  style={{display:'flex',alignItems:'center',padding:'8px 12px',border:'none',borderBottom:'1px solid #f0ebe0',width:'100%',background:sel?`${T.primary}0e`:'#fff',textAlign:'left',opacity:full?.3:1,cursor:full?'not-allowed':'pointer'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}><Flag c={p.country}/> {flip(p.name)}
                      {p.confirmed&&!pastTeeTime&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 5px',borderRadius:8}}>✓</span>}
                      {p.onTrack&&!p.confirmed&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 5px',borderRadius:8}}>– On Track</span>}
                    </div>
                    <div style={{fontSize:11,color:'#8a9580'}}>{p.country} · {p.odds}</div>
                    {!picksHidden&&ow.length>0&&<div style={{fontSize:10,color:'#8b6914',marginTop:1}}>Picked by: {ow.join(', ')}</div>}
                  </div>
                  <div style={sel?{width:20,height:20,borderRadius:'50%',background:T.primary,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}:{width:20,height:20,borderRadius:'50%',border:`2px solid ${T.inputBorder}`}}>{sel?'✓':''}</div>
                </button>);})}
            </div>
            <button type="button" disabled={submitting||totalPicked!==TOTAL_PICKS} style={{...pri,width:'100%',padding:12,fontSize:15,marginTop:10,borderRadius:9,opacity:(submitting||totalPicked!==TOTAL_PICKS)?.4:1}} onClick={submit}>
              {submitting?(editMode?'Updating...':'Submitting...'):(editMode?'Update Picks ('+totalPicked+'/'+TOTAL_PICKS+')':'Submit Entry ('+totalPicked+'/'+TOTAL_PICKS+')')}
            </button>
          </>)}

        {tab==='Field'&&<>
          <input style={{...inp,marginBottom:6}} placeholder="Search players..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:'flex',gap:6,marginBottom:8,justifyContent:'center',flexWrap:'wrap'}}>
            {isLive && !tournamentComplete && field.some(p=>p.pairingTeeTime||p.teeTime) && <>
              <button onClick={()=>setFieldSort('leaderboard')} style={{
                padding:'5px 12px',fontSize:11,fontWeight:600,borderRadius:6,cursor:'pointer',
                border:`1px solid ${fieldSort==='leaderboard'?T.primary:'#d0d4d0'}`,
                background:fieldSort==='leaderboard'?T.primary:'#fff',
                color:fieldSort==='leaderboard'?'#fff':'#5a6555',
              }}>Leaderboard</button>
              <button onClick={()=>setFieldSort('pairings')} style={{
                padding:'5px 12px',fontSize:11,fontWeight:600,borderRadius:6,cursor:'pointer',
                border:`1px solid ${fieldSort==='pairings'?T.primary:'#d0d4d0'}`,
                background:fieldSort==='pairings'?T.primary:'#fff',
                color:fieldSort==='pairings'?'#fff':'#5a6555',
              }}>Pairings</button>
            </>}
            {favorites.size > 0 && <button onClick={()=>setShowOnlyFavorites(v=>!v)} style={{
              padding:'5px 12px',fontSize:11,fontWeight:600,borderRadius:6,cursor:'pointer',
              border:`1px solid ${showOnlyFavorites?'#d4a017':'#d0d4d0'}`,
              background:showOnlyFavorites?'#d4a017':'#fff',
              color:showOnlyFavorites?'#fff':'#5a6555',
            }}>⭐ Favorites ({favorites.size})</button>}
          </div>
          {!pastTeeTime&&<div style={{marginBottom:8,textAlign:'center'}}>
            {fieldSource&&<div style={{fontSize:10,color:T.primary,background:`${T.primary}0a`,padding:'4px 10px',borderRadius:20,display:'inline-block',marginBottom:4}}>{fieldSource}</div>}
            {fieldLastUpdated&&<div style={{fontSize:10,color:'#8a9580',marginTop:2}}>Field last updated: {fieldLastUpdated} · auto-refreshes every 60s</div>}
          </div>}
          {!pastTeeTime&&<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,fontSize:10,color:'#8a9580',justifyContent:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{background:'#e8f5e8',color:'#2d7a1e',padding:'1px 5px',borderRadius:8,fontWeight:700,fontSize:9}}>✓</span> Confirmed</span>
            <span>·</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{background:'#fff0d6',color:'#7a4a00',padding:'1px 5px',borderRadius:8,fontWeight:700,fontSize:9}}>–</span> On Track</span>
            <span>·</span>
            <span>Tap player for scorecard</span>
          </div>}
          {pastTeeTime&&<div style={{fontSize:10,color:'#8a9580',textAlign:'center',marginBottom:8}}>Tap player for scorecard</div>}
          <div style={{borderRadius:9,border:`1px solid ${T.cardBorder}`,position:'relative'}}>
            <div style={{display:'flex',padding:'8px 10px',background:T.primary,color:'#faf6ed',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,position:'sticky',top:0,zIndex:10,boxShadow:'0 2px 6px rgba(0,0,0,.15)',borderTopLeftRadius:9,borderTopRightRadius:9}}>
              {pastTeeTime
                ?<><span style={{width:40,textAlign:'center'}}>Pos</span><span style={{flex:1}}>Player</span><span style={{width:30,textAlign:'center'}}>Tier</span><span style={{width:50,textAlign:'center'}}>Tee/Thru</span><span style={{width:40,textAlign:'center'}}>Tot</span><span style={{width:72,textAlign:'right'}}>Earnings</span></>
                :<><span style={{width:40,textAlign:'center'}}>#</span><span style={{flex:1}}>Player</span><span style={{width:30,textAlign:'center'}}>Tier</span><span style={{width:50,textAlign:'center'}}>DG Rank</span></>
              }
            </div>
            {field.length === 0 || (isLive && (!rawScoresRef.current || !field.some(p => p.pos && p.pos !== '-')))
              ? <div style={{padding:'40px 20px',textAlign:'center',color:'#8a9580',fontSize:13}}>
                  <div style={{display:'inline-block',width:24,height:24,border:`3px solid ${T.primary}30`,borderTop:`3px solid ${T.primary}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',marginBottom:10}}/>
                  <div>Loading field...</div>
                  <style>{`@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
                </div>
              : fieldVis.map((p,i)=>{const ow=owners(p.name),sc=String(p.score).startsWith('-')?'#1a6b1a':p.score==='E'?'#555':'#b02020';const t=TIERS.find(t=>t.id===p.tier);const isCut=/CUT|WD|DQ|MC/i.test(p.pos);
            const thruNum = parseInt(p.thru, 10);
            const isActivelyPlaying = thruNum > 0 && thruNum < 18;
            // Has player completed the round their tee time is scheduled for?
            // teeRoundNum tells us what round the tee time refers to (1, 2, 3, or 4)
            const teeRound = p.teeRoundNum || 1;
            const roundScore = teeRound===1?p.r1 : teeRound===2?p.r2 : teeRound===3?p.r3 : p.r4;
            const teeRoundAlreadyPlayed = roundScore != null;
            // In Pairings mode, mark start of a new pairing group (tee time + start hole changes)
            // Uses pairingTeeTime which stays locked across the round
            const prev = fieldVis[i-1];
            const prevPairTime = prev?.pairingTeeTime || prev?.teeTime;
            const myPairTime = p.pairingTeeTime || p.teeTime;
            const prevStartHole = prev?.pairingStartHole || prev?.startHole || 1;
            const myStartHole = p.pairingStartHole || p.startHole || 1;
            const isNewPairingGroup = fieldSort === 'pairings'
              && i > 0
              && !isCut
              && !/CUT|WD|DQ|MC/i.test(prev?.pos||'')
              && (prevPairTime !== myPairTime || prevStartHole !== myStartHole);
            const isCutTransition = fieldSort === 'pairings'
              && i > 0
              && isCut
              && !/CUT|WD|DQ|MC/i.test(prev?.pos||'');
            // Show group header before first player in each pairing (during Pairings mode)
            const isPairingGroupStart = fieldSort === 'pairings' && !isCut
              && (i === 0 || isNewPairingGroup);
            const showTeeTime = p.teeTime && !isActivelyPlaying && !isCut && !teeRoundAlreadyPlayed;
            return(<React.Fragment key={p.name}>
              {isPairingGroupStart && myPairTime && <div style={{display:'flex',padding:'4px 10px',background:`${T.primary}10`,fontSize:10,fontWeight:700,color:T.primary,letterSpacing:.5,borderTop:i===0?'none':`2px solid ${T.primary}`,borderBottom:`1px solid ${T.primary}30`}}>
                <span>⏰ {myPairTime}{myStartHole !== 1 ? ` · Hole ${myStartHole}` : ''}</span>
              </div>}
              <div onClick={()=>setSelectedPlayer(p)} style={{display:'flex',padding:'7px 10px',alignItems:'center',fontSize:12,borderBottom:'1px solid #eee8dc',borderTop:(fieldSort!=='pairings' && (isNewPairingGroup||isCutTransition))?`2px solid ${T.primary}`:(isCutTransition?`2px solid ${T.primary}`:'none'),background:isCut&&isLive?'#fafafa':favorites.has(p.name)?'#fff8d6':ow.length&&!picksHidden?T.rowHl:i%2===0?'#fff':T.stripeBg,cursor:'pointer',opacity:isCut&&isLive?.6:1,borderLeft:favorites.has(p.name)?`3px solid #d4a017`:'3px solid transparent'}}>
                <span style={{width:40,textAlign:'center',fontWeight:700,color:isCut&&isLive?'#999':T.primary,fontSize:12}}>{isLive?(isCut?(/WD/i.test(p.pos)?'🚑':/DQ/i.test(p.pos)?'🚫':'✂️'):p.pos):(i+1)}</span>
                <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                  <div style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    <span onClick={(e)=>{e.stopPropagation();toggleFavorite(p.name);}} style={{marginRight:5,cursor:'pointer',fontSize:13,verticalAlign:'middle',userSelect:'none'}}>{favorites.has(p.name)?'⭐':'☆'}</span>
                    <span style={{marginRight:3}}><Flag c={p.country}/></span>
                    <span style={{fontWeight:600,fontSize:12,textDecoration:isCut&&isLive?'line-through':'none',color:isCut&&isLive?'#999':'inherit'}}>{flip(p.name)}</span>
                    {p.confirmed&&!isLive&&<span style={{marginLeft:4,fontSize:9,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 5px',borderRadius:8,border:'1px solid #2d7a1e40'}}>✓</span>}
                    {p.onTrack&&!p.confirmed&&<span style={{marginLeft:4,fontSize:9,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 5px',borderRadius:8,border:'1px solid #c8840040'}}>–</span>}
                  </div>
                  {!picksHidden&&ow.length>0&&<div style={{fontSize:9,color:'#8b6914',marginTop:1,whiteSpace:'normal',wordBreak:'break-word',lineHeight:1.3}}>({ow.join(', ')})</div>}
                </div>
                <span style={{width:30,textAlign:'center'}}><span style={{fontSize:9,fontWeight:700,color:t?.color,background:t?.color+'18',padding:'1px 5px',borderRadius:3}}>{String.fromCharCode(64+p.tier)}</span></span>
                {isLive
                  ?<>
                    <span style={{width:50,textAlign:'center',fontSize:showTeeTime?9:11,color:showTeeTime?T.primary:'#888',fontWeight:showTeeTime?600:400,lineHeight:1.15}}>
                      {(() => {
                        if (isCut) return '—';
                        if (showTeeTime) return <>{p.teeTime}{p.startHole && p.startHole !== 1 ? <><br/><span style={{fontSize:8,opacity:.75}}>·H{p.startHole}</span></> : null}</>;
                        if (!p.thru) return '-';
                        // Normalize "18" to "F" (round finished)
                        const thruDisplay = (String(p.thru) === '18' || p.thru === 18) ? 'F' : p.thru;
                        const showAsterisk = (p.pairingStartHole||p.startHole)===10;
                        return <>{thruDisplay}{showAsterisk ? <span style={{color:T.primary,fontWeight:700}}>*</span> : null}</>;
                      })()}
                    </span>
                    <span style={{width:40,textAlign:'center',fontWeight:700,fontSize:12,color:isCut?'#999':sc}}>{p.score}</span>
                    <span style={{width:72,textAlign:'right',fontWeight:700,fontSize:12,color:isCut?'#999':'inherit'}}>{fmt(p.earnings)}</span>
                  </>
                  :<span style={{width:50,textAlign:'center',fontSize:11,color:'#888'}}>{p.dgRank||'-'}</span>
                }
              </div>
            </React.Fragment>);})}
          </div>
        </>}

        {tab==='Chat'&&<>
          {!chatVerified
            ?<div style={{background:'#fff',borderRadius:11,padding:24,border:`1px solid ${T.cardBorder}`,textAlign:'center'}}>
              <div style={{fontSize:36,marginBottom:10}}>💬</div>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:T.primary,marginBottom:6}}>Join the chat</h3>
              <p style={{fontSize:12,color:'#888',marginBottom:16}}>Verify with your edit code to start the trash talk.</p>
              <select value={chatName} onChange={e=>setChatName(e.target.value)}
                style={{...inp,width:'100%',marginBottom:8,cursor:'pointer'}}>
                <option value="">Select your name...</option>
                {entries.map(e=><option key={e.name} value={e.name}>{e.name}</option>)}
              </select>
              <input type="text" placeholder="Edit code (XXXXXX)" maxLength={6} value={chatCode}
                onChange={e=>setChatCode(e.target.value.toUpperCase())}
                onKeyDown={e=>e.key==='Enter'&&verifyChat()}
                style={{...inp,width:'100%',marginBottom:10,textAlign:'center',letterSpacing:6,fontSize:16,fontWeight:700,textTransform:'uppercase'}}/>
              <button type="button" onClick={verifyChat} disabled={chatVerifying}
                style={{...pri,width:'100%',padding:12,borderRadius:9,opacity:chatVerifying?.5:1}}>
                {chatVerifying?'Verifying...':'Join Chat →'}
              </button>
              {chatName&&(()=>{
                const entry=entries.find(e=>e.name===chatName);
                if(entry?.email){
                  return <button type="button" onClick={()=>{resendCode(chatName,entry.email);}}
                    style={{background:'transparent',border:'none',color:T.primary,fontSize:11,width:'100%',padding:8,cursor:'pointer',textDecoration:'underline',marginTop:4}}>
                    Lost your code? Resend to {entry.email}
                  </button>;
                }
                return <button type="button" onClick={()=>setShowClaimModal(chatName)}
                  style={{background:'transparent',border:'none',color:'#7a5500',fontSize:11,width:'100%',padding:8,cursor:'pointer',textDecoration:'underline',marginTop:4}}>
                  📧 No email on file? Add yours to get a code
                </button>;
              })()}
              <p style={{fontSize:10,color:'#aaa',marginTop:10}}>Your code was emailed to you when you submitted your entry.</p>
            </div>
            :<div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,padding:'8px 14px',background:`${T.primary}0a`,borderRadius:9}}>
                <span style={{fontSize:12,color:T.primary,fontWeight:600}}>💬 Chatting as <b>{chatName} ✓</b></span>
                <button type="button" onClick={()=>{
                  if(typeof window!=='undefined'){
                    localStorage.removeItem(`chat_${poolId}_name`);
                    localStorage.removeItem(`chat_${poolId}_code`);
                  }
                  setChatName('');setChatCode('');setChatVerified(false);
                }} style={{background:'transparent',border:'none',color:T.primary,fontSize:10,cursor:'pointer',textDecoration:'underline'}}>Sign out</button>
              </div>
              {!entries.find(e=>e.name===chatName)&&<div style={{background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:9,padding:'10px 14px',marginBottom:10,fontSize:12,color:'#92400e',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18}}>⚠️</span>
                <div>
                  <div style={{fontWeight:700,marginBottom:2}}>Enter the pool to chat</div>
                  <div style={{fontSize:11,opacity:.85}}>You can read messages but need an entry in the current major to post.</div>
                </div>
              </div>}
              <div ref={chatScrollRef} style={{
                background:'#fff',borderRadius:11,border:`1px solid ${T.cardBorder}`,
                height:380,overflowY:'auto',padding:12,marginBottom:10,
              }}>
                {chatMessages.length===0
                  ?<div style={{textAlign:'center',color:'#aaa',fontSize:13,padding:'40px 0'}}>
                    <div style={{fontSize:32,marginBottom:8}}>🗣️</div>
                    No messages yet — start the trash talk!
                  </div>
                  :chatMessages.map((m,mIdx)=>{
                    const isMe=m.name===chatName;
                    const isFirstMessage=mIdx===0;
                    const timeAgo=(()=>{
                      const diff=Date.now()-m.ts;
                      if(diff<60000)return 'just now';
                      if(diff<3600000)return Math.floor(diff/60000)+'m ago';
                      if(diff<86400000)return Math.floor(diff/3600000)+'h ago';
                      return Math.floor(diff/86400000)+'d ago';
                    })();
                    const reactions=m.reactions||{};
                    const reactionEntries=Object.entries(reactions);
                    const QUICK_REACTIONS=['👍','😂','🔥','💀','🤡','🦅','🐦','💯'];
                    return(
                      <div key={m.id} style={{
                        marginBottom:14,
                        display:'flex',
                        flexDirection:isMe?'row-reverse':'row',
                        gap:8,
                      }}>
                        <div style={{maxWidth:'75%',position:'relative'}}>
                          <div onClick={()=>setReactionPickerFor(reactionPickerFor===m.id?null:m.id)} style={{
                            background:isMe?T.primary:'#f1f1f1',
                            color:isMe?'#fff':'#222',
                            borderRadius:14,
                            padding:'8px 12px',
                            borderTopLeftRadius:isMe?14:4,
                            borderTopRightRadius:isMe?4:14,
                            cursor:'pointer',
                          }}>
                            <div style={{fontSize:10,fontWeight:700,opacity:.7,marginBottom:2}}>
                              {m.name} ✓ <span style={{fontWeight:400,marginLeft:4}}>{timeAgo}</span>
                            </div>
                            <div style={{fontSize:14,lineHeight:1.4,wordBreak:'break-word'}}>{m.message}</div>
                          </div>
                          {reactionEntries.length>0&&<div style={{display:'flex',gap:3,marginTop:4,flexWrap:'wrap',justifyContent:isMe?'flex-end':'flex-start'}}>
                            {reactionEntries.map(([emoji,users])=>{
                              const userReacted=users.includes(chatName);
                              return <button key={emoji} type="button" onClick={()=>reactToMessage(m.id,emoji)}
                                title={users.join(', ')}
                                style={{background:userReacted?`${T.primary}25`:'#fff',border:`1px solid ${userReacted?T.primary:'#ddd'}`,borderRadius:12,padding:'2px 7px',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                                <span>{emoji}</span>
                                <span style={{fontSize:10,fontWeight:700,color:userReacted?T.primary:'#666'}}>{users.length}</span>
                              </button>;
                            })}
                          </div>}
                          {reactionPickerFor===m.id&&<div style={{
                            position:'absolute',
                            [isFirstMessage?'top':'bottom']:'100%',
                            [isMe?'right':'left']:0,
                            [isFirstMessage?'marginTop':'marginBottom']:6,
                            background:'#fff',
                            borderRadius:20,
                            padding:'6px 8px',
                            boxShadow:'0 4px 16px rgba(0,0,0,.15)',
                            display:'flex',
                            gap:2,
                            zIndex:5,
                            alignItems:'center',
                          }} onClick={e=>e.stopPropagation()}>
                            {QUICK_REACTIONS.map(emoji=>(
                              <button key={emoji} type="button" onClick={()=>{reactToMessage(m.id,emoji);setReactionPickerFor(null);}}
                                style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer',padding:'2px 4px',borderRadius:6,lineHeight:1}}>
                                {emoji}
                              </button>
                            ))}
                            <div style={{width:1,height:20,background:'#ddd',margin:'0 2px'}}/>
                            <button type="button" onClick={()=>{setReactionPickerFor(null);setCustomEmojiFor(m.id);}}
                              title="Add any emoji"
                              style={{background:'#f0f0f0',border:'none',fontSize:14,cursor:'pointer',padding:'4px 8px',borderRadius:6,lineHeight:1,color:'#666',fontWeight:700}}>
                              +
                            </button>
                          </div>}
                        </div>
                        {adminOk&&<button type="button" onClick={()=>deleteChatMessage(m.id)}
                          style={{background:'transparent',border:'none',color:'#c44',cursor:'pointer',fontSize:10,padding:'4px 6px',alignSelf:'flex-end'}}>✕</button>}
                      </div>
                    );
                  })
                }
              </div>
              <div style={{display:'flex',gap:8}}>
                <input type="text" placeholder="Say something..." value={chatInput} maxLength={300}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&!chatSending&&sendChatMessage()}
                  style={{...inp,flex:1}}/>
                <button type="button" onClick={sendChatMessage} disabled={chatSending||!chatInput.trim()}
                  style={{...pri,padding:'10px 18px',opacity:(chatSending||!chatInput.trim())?.4:1}}>
                  {chatSending?'...':'Send'}
                </button>
              </div>
              <div style={{fontSize:10,color:'#aaa',textAlign:'center',marginTop:6}}>
                {chatInput.length}/300 · Live updates · Tap a message to react
              </div>
            </div>
          }
        </>}

        {tab==='History'&&<>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:T.primary,marginBottom:4}}>📚 Past Results</div>
            <div style={{fontSize:12,color:'#8a9580'}}>Final standings from previous majors</div>
          </div>
          {!historyLoaded
            ?<div style={{textAlign:'center',padding:40}}>
              <button type="button" style={pri} onClick={async()=>{
                const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,action:'get-archives-public'})});
                const d=await r.json();
                if(d?.archives){setPublicArchives(d.archives);setHistoryLoaded(true);}
              }}>Load Past Results</button>
            </div>
            :publicArchives.length===0
              ?<div style={bx}><div style={{fontSize:44,marginBottom:10}}>🏆</div><p style={{color:'#8a9580'}}>No past results yet — check back after the first major!</p></div>
              :publicArchives.map(a=>{
                const THEME={...THEMES[a.major]||THEMES.pga};
                const earnings=a.earnings||{};
                const hasEarnings=Object.keys(earnings).length>0;
                // For pgatour archives, include event slug in ID to avoid collisions
                const archiveId = a.major === 'pgatour'
                  ? `pgatour_${(a.eventName||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}_${a.year}`
                  : a.major+'_'+a.year;
                const isExpanded=expandedArchive===archiveId;
                // Use saved logo data if available, otherwise current theme
                const savedLogo = a.logoUrl || THEME.logoUrl;
                const savedLogoNoBg = a.logoNoBg !== null && a.logoNoBg !== undefined ? a.logoNoBg : THEME.logoNoBg;
                const savedLogoHeight = a.logoHeight || THEME.logoHeight || 36;
                // Use saved tournament date if available
                const displayDate = a.tournamentDate ? new Date(a.tournamentDate) : new Date(THEME.teeTime);
                const ranked=[...a.entries].map(e=>({
                  ...e,
                  total:e.picks.reduce((s,n)=>s+(earnings[n]||0),0),
                }))
                  .filter(e=>e.picks && e.picks.length > 0)
                  .sort((x,y)=>y.total-x.total);
                // Pool prize money — prefer saved prizes, fall back to computed from entryFee
                // Use the FULL entry count from the archive (a.entries.length), not the filtered ranked.length
                const archiveFee = a.entryFee || 0;
                const fullEntryCount = a.entries.length;
                const computedPot = fullEntryCount * archiveFee;
                const savedPrizes = a.prizes;
                const showPrizes = savedPrizes ? true : (archiveFee > 0 && fullEntryCount >= 3);
                const prizes = savedPrizes
                  ? [savedPrizes.first||0, savedPrizes.second||0, savedPrizes.third||0]
                  : (archiveFee > 0 && fullEntryCount >= 3
                    ? [computedPot - archiveFee * 3, archiveFee * 2, archiveFee]
                    : []);
                const pot = savedPrizes ? (prizes[0]+prizes[1]+prizes[2]) : computedPot;
                return<div key={archiveId} style={{marginBottom:16,borderRadius:12,overflow:'hidden',border:`1px solid ${THEME.cardBorder}`}}>
                  <div onClick={()=>setExpandedArchive(isExpanded?null:archiveId)} style={{background:THEME.headerBg,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                    {savedLogo && (savedLogoNoBg
                      ? <img src={savedLogo} alt={a.eventName || THEME.eventName} style={{height:36,width:'auto',filter:'drop-shadow(0 2px 4px rgba(0,0,0,.3))'}}/>
                      : <div style={{background:'#fff',borderRadius:6,padding:'3px 6px',display:'inline-flex',alignItems:'center',boxShadow:'0 2px 4px rgba(0,0,0,.2)'}}><img src={savedLogo} alt={a.eventName || THEME.eventName} style={{height:30,width:'auto',display:'block'}}/></div>
                    )}
                    {!savedLogo && <span style={{fontSize:24}}>{THEME.emoji}</span>}
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:15,color:'#fff'}}>{a.eventName || THEME.eventName}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{displayDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})} · {a.entries.length} entries{showPrizes&&<> · ${pot} pot</>}</div>
                    </div>
                    <span style={{fontSize:18,color:'rgba(255,255,255,0.6)'}}>{isExpanded?'▲':'▼'}</span>
                  </div>
                  {isExpanded&&<div style={{background:'#fff',animation:'sd .2s ease'}}>
                    {ranked.map((e,i)=>{
                      const picksWithEarnings=e.picks.map(pn=>({name:pn,earned:earnings[pn]||0})).sort((x,y)=>y.earned-x.earned);
                      const prize=showPrizes&&i<3?prizes[i]:0;
                      return<div key={e.name} style={{borderBottom:`1px solid ${THEME.cardBorder}`}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:i===0?`${THEME.primary}08`:'#fff'}}>
                          <span style={{fontSize:i<3?18:13,fontWeight:800,width:28,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
                          <span style={{flex:1,fontWeight:600,fontSize:14}}>{e.name}</span>
                          {prize>0&&<span style={{fontSize:11,fontWeight:800,padding:'2px 8px',borderRadius:10,background:i===0?'#fef3c7':i===1?'#e5e7eb':'#fde0c4',color:i===0?'#92400e':i===1?'#555':'#9a4a00',border:`1px solid ${i===0?'#fbbf24':i===1?'#999':'#e08040'}`}}>💰 ${prize}</span>}
                          {hasEarnings&&<span style={{fontWeight:800,color:THEME.primary,fontSize:14}}>{fmt(e.total)}</span>}
                        </div>
                        {hasEarnings&&<div style={{padding:'4px 14px 10px 50px',display:'flex',flexWrap:'wrap',gap:6,fontSize:11}}>
                          {picksWithEarnings.map(pk=><span key={pk.name} style={{background:`${THEME.primary}10`,padding:'2px 6px',borderRadius:4,color:THEME.primary}}>
                            {pk.name.split(', ')[0]} <b>{fmt(pk.earned)}</b>
                          </span>)}
                        </div>}
                      </div>;
                    })}
                  </div>}
                  {!isExpanded&&<div style={{padding:'10px 14px',background:'#fafafa',fontSize:11,color:'#888',textAlign:'center'}}>
                    Tap to see picks & earnings — Top 3: {ranked.slice(0,3).map(r=>r.name).join(' · ')}
                  </div>}
                </div>;
              })
          }
        </>}

        {tab==='Admin'&&(!adminOk?
          <div style={{background:'#fff',padding:20,borderRadius:11,border:`1px solid ${T.cardBorder}`}}>
            <p style={{color:'#6b7c5e',marginBottom:10,fontSize:13}}>Enter admin password:</p>
            {adminAuthError&&<p style={{color:'#c44',marginBottom:10,fontSize:12,fontWeight:600}}>{adminAuthError}</p>}
            <div style={{display:'flex',gap:8}}>
              <input style={inp} type="password" placeholder="Password" value={adminPw} onChange={e=>{setAdminPw(e.target.value);setAdminAuthError('');}} onKeyDown={async e=>{
                if(e.key==='Enter'){
                  const d=await adminAction('verify-admin',{});
                  if(d?.ok)setAdminOk(true);
                  else setAdminAuthError('Wrong password');
                }
              }}/>
              <button type="button" style={{...pri,padding:'10px 24px',minWidth:80}} onClick={async()=>{
                const d=await adminAction('verify-admin',{});
                if(d?.ok)setAdminOk(true);
                else setAdminAuthError('Wrong password');
              }}>Enter</button>
            </div>
          </div>
          :<>
            <div style={sec}>
              <h3 style={stl}>🏆 Active Major</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:12}}>Switch the active tournament for all users. Updates theme, tee time, course pars, and field.</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                {Object.entries(THEMES).map(([key,theme])=>{
                  const active=activeMajor===key;
                  return(
                    <button key={key} type="button" onClick={()=>switchMajor(key)}
                      style={{padding:'14px 10px',borderRadius:12,border:`2px solid ${active?theme.primary:'#e0e0e0'}`,background:active?theme.primary:'#fafafa',color:active?'#fff':'#555',fontWeight:active?700:500,fontSize:12,cursor:'pointer',transition:'all .2s',textAlign:'center'}}>
                      <div style={{fontSize:26,marginBottom:6}}>{theme.emoji}</div>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{theme.eventName.replace(' 2026','')}</div>
                      <div style={{fontSize:10,opacity:.7,marginBottom:active?4:0}}>{theme.courseName}</div>
                      {active&&<div style={{fontSize:10,background:'#ffffff30',borderRadius:8,padding:'2px 8px',display:'inline-block',marginTop:2}}>✓ Active</div>}
                    </button>
                  );
                })}
              </div>
              <div style={{background:'#f8f9ff',borderRadius:8,padding:'10px 12px',border:'1px solid #e0e4f0'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#555',letterSpacing:.5,marginBottom:6}}>⏰ AUTO-MANAGEMENT SCHEDULE</div>
                <div style={{fontSize:11,color:'#6b7c5e',lineHeight:1.7}}>
                  <div>🔓 <b>7 days before tee-off</b> — entries auto-unlock for next major</div>
                  <div>🔒 <b>At tee time</b> — entries lock for the tournament</div>
                  <div>🔄 <b>Tuesday morning (6 AM – 12 PM ET)</b> — auto-rotates to next major, archives current results</div>
                </div>
              </div>
            </div>

            <div style={sec}><h3 style={stl}>📡 Live Scores</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Auto-refreshes from DataGolf every 60s.</p>
              <button type="button" style={{...pri,opacity:refreshing?.5:1}} onClick={()=>fetchScores(false)} disabled={refreshing}>{refreshing?'Updating...':'⟳ Refresh Now'}</button>
              {lastUp&&<span style={{fontSize:11,color:'#8a9580',marginLeft:8}}>Last: {lastUp}</span>}
            </div>
            <div style={sec}><h3 style={stl}>🔒 Entry Lock</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Lock entries before R1 tees off.</p>
              <button type="button" style={locked?dan:pri} onClick={async()=>{const d=await adminAction(locked?'unlock':'lock');if(d?.ok)msg(locked?'Unlocked':'Locked!');}}>{locked?'🔓 Unlock':'🔒 Lock'} Entries</button>
            </div>
            <div style={sec}><h3 style={stl}>👀 Show/Hide Picks</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Picks are currently <b>{picksHidden?'hidden':'visible'}</b>.</p>
              <button type="button" style={picksHidden?pri:dan} onClick={async()=>{const d=await adminAction(picksHidden?'show-picks':'hide-picks');if(d?.ok)msg(picksHidden?'Picks revealed!':'Picks hidden');}}>{picksHidden?'👀 Reveal Picks':'🙈 Hide Picks'}</button>
            </div>
            <div style={sec}><h3 style={stl}>🏌️ PGA Tour Mode</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Switch the pool to whatever PGA Tour event is happening this week. Toggle off to return to the major schedule. Picks reset when switching.</p>
              <label style={{fontSize:13,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                <input type="checkbox" defaultChecked={activeMajor==='pgatour'} onChange={async(e)=>{
                  const enabled=e.target.checked;
                  if(enabled){
                    if(!confirm('Switch the pool to PGA Tour mode? This resets current entries and uses whatever event is active this week on the PGA Tour.'))return;
                    const d=await adminAction('set-major',{major:'pgatour'});
                    if(d?.ok){msg('Switched to PGA Tour mode');setActiveMajor('pgatour');activeMajorRef.current='pgatour';loadEntries();}
                  } else {
                    if(!confirm('Switch back to the major schedule? This resets current PGA Tour entries.'))return;
                    // Switch back to next upcoming major
                    const nextMajor='usopen'; // Default - rotation will determine actual next major
                    const d=await adminAction('set-major',{major:nextMajor});
                    if(d?.ok){msg('Switched back to major schedule');setActiveMajor(nextMajor);activeMajorRef.current=nextMajor;loadEntries();}
                  }
                }}/>
                <span style={{fontWeight:600}}>Run this week's PGA Tour event</span>
              </label>
              {activeMajor==='pgatour'&&<div style={{marginTop:10,padding:'10px 12px',background:`${T.primary}0a`,borderRadius:8,fontSize:11,color:T.primary}}>
                ✓ Currently in PGA Tour mode. The pool will track whichever event DataGolf has live this week.
              </div>}
            </div>
            <div style={sec}><h3 style={stl}>🔑 Join Code</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Optionally require a join code to enter the pool. Share the code only with the people you want to join.</p>
              <label style={{fontSize:13,display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginBottom:10}}>
                <input type="checkbox" id="joinCodeRequiredInput" defaultChecked={!!poolMeta?.joinCodeRequired} onChange={async(e)=>{
                  const required=e.target.checked;
                  const d=await adminAction('set-join-code',{joinCodeRequired:required,joinCode:poolMeta?.joinCode||''});
                  if(d?.ok){msg(required?'Join code now required':'Join code optional');setPoolMeta(prev=>({...prev,joinCodeRequired:required}));}
                }}/>
                <span style={{fontWeight:600}}>Require join code to enter pool</span>
              </label>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <input style={{...inp,marginBottom:0,textTransform:'uppercase',fontFamily:'monospace',letterSpacing:2,fontSize:16,fontWeight:700}} type="text" placeholder="ABCD12" id="joinCodeInput" defaultValue={poolMeta?.joinCode||''} maxLength={20}/>
                <button type="button" style={pri} onClick={async()=>{
                  const code=document.getElementById('joinCodeInput').value.trim().toUpperCase();
                  if(!code){msg('Code cannot be empty');return;}
                  const d=await adminAction('set-join-code',{joinCodeRequired:!!poolMeta?.joinCodeRequired,joinCode:code});
                  if(d?.ok){msg('Join code updated');setPoolMeta(prev=>({...prev,joinCode:code}));document.getElementById('joinCodeInput').value=code;}
                }}>💾 Save Code</button>
              </div>
              <p style={{fontSize:11,color:'#888',marginTop:8}}>Current code: <strong style={{fontFamily:'monospace',color:T.primary,fontSize:13}}>{poolMeta?.joinCode||'(none set)'}</strong></p>
            </div>
            <div style={sec}><h3 style={stl}>🎨 Custom Pool Logo</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Override the major's default logo with your own. Paste a public image URL (PNG/JPG). Leave blank to use the default major logo.</p>
              <input style={{...inp,marginBottom:6}} type="url" placeholder="https://example.com/my-logo.png" id="customLogoInput" defaultValue={poolMeta?.customLogoUrl||''}/>
              <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                <label style={{fontSize:11,display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
                  <input type="checkbox" id="customLogoNoBgInput" defaultChecked={poolMeta?.customLogoNoBg!==false}/>
                  Transparent (no white box)
                </label>
                <label style={{fontSize:11,display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
                  Height:
                  <input type="number" min="40" max="120" id="customLogoHeightInput" defaultValue={poolMeta?.customLogoHeight||72} style={{width:60,padding:'4px 6px',border:'1px solid #ccc',borderRadius:4,fontSize:12}}/>
                  px
                </label>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button type="button" style={pri} onClick={async()=>{
                  const url=document.getElementById('customLogoInput').value.trim();
                  const noBg=document.getElementById('customLogoNoBgInput').checked;
                  const height=parseInt(document.getElementById('customLogoHeightInput').value,10)||72;
                  const d=await adminAction('set-custom-logo',{customLogoUrl:url,customLogoNoBg:noBg,customLogoHeight:height});
                  if(d?.ok){msg('Logo updated');setPoolMeta(prev=>({...prev,customLogoUrl:url,customLogoNoBg:noBg,customLogoHeight:height}));}
                }}>💾 Save Logo</button>
                <button type="button" style={dan} onClick={async()=>{
                  if(!confirm('Reset to default major logo?'))return;
                  const d=await adminAction('set-custom-logo',{customLogoUrl:'',customLogoNoBg:true,customLogoHeight:72});
                  if(d?.ok){msg('Reset to default');document.getElementById('customLogoInput').value='';setPoolMeta(prev=>({...prev,customLogoUrl:'',customLogoNoBg:true,customLogoHeight:72}));}
                }}>↺ Reset</button>
              </div>
            </div>

            <div style={sec}><h3 style={stl}>💰 Show/Hide Payment Status</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Paid/Unpaid badges are currently <b>{paymentsHidden?'hidden':'visible'}</b>. Useful to hide during the tournament when payment status is no longer relevant.</p>
              <button type="button" style={paymentsHidden?pri:dan} onClick={async()=>{const d=await adminAction(paymentsHidden?'show-payments':'hide-payments');if(d?.ok){setPaymentsHidden(!paymentsHidden);msg(paymentsHidden?'Payment badges visible':'Payment badges hidden');}}}>{paymentsHidden?'👀 Show Payment Badges':'🙈 Hide Payment Badges'}</button>
            </div>
            <div style={sec}>
              <h3 style={stl}>💵 Entry Fee & Payouts</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:10}}>Set entry fee to display payouts in header. 3rd = 1× fee, 2nd = 2× fee, 1st = rest.</p>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                <span style={{fontSize:13,color:'#555'}}>$</span>
                <input type="number" min="0" placeholder="20" defaultValue={poolMeta?.entryFee||''}
                  id="entryFeeInput"
                  style={{...inp,maxWidth:100}}/>
                <button type="button" style={pri} onClick={async()=>{
                  const val=parseFloat(document.getElementById('entryFeeInput').value)||0;
                  const d=await adminAction('set-entry-fee',{entryFee:val});
                  if(d?.ok){loadEntries();msg(val>0?`Entry fee set to $${val}`:'Entry fee cleared');}
                }}>Save</button>
              </div>
              {poolMeta?.entryFee>0&&entries.length>=3&&(()=>{
                const fee=poolMeta.entryFee;
                const pot=entries.length*fee;
                const first=pot-fee*3;
                return <div style={{background:`${T.primary}0a`,borderRadius:8,padding:'10px 12px',fontSize:12,color:T.primary}}>
                  <div style={{fontWeight:700,marginBottom:4}}>Current Pot: ${pot} ({entries.length} × ${fee})</div>
                  <div>🥇 1st: <b>${first}</b> · 🥈 2nd: <b>${fee*2}</b> · 🥉 3rd: <b>${fee}</b></div>
                </div>;
              })()}
              {poolMeta?.entryFee>0&&entries.length<3&&<div style={{fontSize:11,color:'#888'}}>Payouts will show once you have 3+ entries.</div>}
            </div>
            <div style={sec}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <h3 style={{...stl,marginBottom:0,flex:1}}>👥 Entries & Payments ({entries.length})</h3>
                {(()=>{
                  const paidCount = entries.filter(e=>!!payments[e.name]).length;
                  const total = entries.length;
                  const pct = total>0?Math.round(paidCount/total*100):0;
                  return <span style={{background:'#e8f5e8',color:'#2d7a1e',borderRadius:8,padding:'2px 10px',fontSize:11,fontWeight:700}}>{paidCount}/{total} paid · {pct}%</span>;
                })()}
              </div>
              {entries.length===0?<p style={{color:'#8a9580',fontSize:12}}>No entries yet</p>:
                <div style={{border:'1px solid #f0ebe0',borderRadius:8,overflow:'hidden'}}>
                  <div style={{display:'flex',padding:'8px 10px',background:'#fafaf6',borderBottom:'1px solid #f0ebe0',fontSize:10,fontWeight:700,color:'#888',letterSpacing:.5}}>
                    <span style={{flex:1}}>NAME</span>
                    <span style={{width:50,textAlign:'center'}}>PICKS</span>
                    <span style={{width:80,textAlign:'center'}}>PAYMENT</span>
                    <span style={{width:60,textAlign:'right'}}>ACTION</span>
                  </div>
                  {entries.map(e=>{const paid=!!payments[e.name];return(
                    <div key={e.name} style={{display:'flex',alignItems:'center',padding:'8px 10px',borderBottom:'1px solid #f5f0e8',fontSize:13}}>
                      <span style={{flex:1,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                      <span style={{width:50,textAlign:'center',fontSize:11,color:'#8a9580'}}>{e.picks.length}</span>
                      <button type="button" onClick={()=>togglePayment(e.name)} style={{width:74,marginLeft:3,marginRight:3,background:paid?'#e8f5e8':'#f5f5f5',border:`1px solid ${paid?'#2d7a1e':'#ccc'}`,color:paid?'#2d7a1e':'#888',padding:'4px 0',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>{paid?'✓ Paid':'Mark Paid'}</button>
                      <button type="button" style={{width:54,marginLeft:3,background:'transparent',border:'1px solid #c44',color:'#c44',padding:'4px 0',borderRadius:5,fontSize:11,cursor:'pointer'}} onClick={async()=>{
                        if(!confirm(`Remove ${e.name}'s entry?`))return;
                        const d=await adminAction('delete',{name:e.name});
                        if(d?.ok){msg(`Removed ${e.name}`);loadEntries();}
                      }}>Remove</button>
                    </div>);})}
                </div>
              }
            </div>
            <div style={sec}>
              <h3 style={stl}>📚 Past Results</h3>
              {entries.length>0&&<div style={{marginBottom:10}}>
                <button type="button" style={{...pri,fontSize:12,marginBottom:4}} onClick={async()=>{
                  const earnings={};
                  field.forEach(p=>{if(p.earnings>0)earnings[p.name]=p.earnings;});
                  const d=await adminAction('save-full-archive',{
                    major:activeMajor,
                    year:new Date().getFullYear(),
                    earnings,
                    logoUrl: T.logoUrl,
                    logoNoBg: T.logoNoBg,
                    logoHeight: T.logoHeight,
                    tournamentDate: T.teeTime,
                  });
                  if(d?.ok)msg(`Archived ${d.archived?.entries||0} entries, ${d.archived?.earnings||0} payouts ✓`);
                }}>💾 Save Final Results Now</button>
                <div style={{fontSize:10,color:'#8a9580'}}>Run after the final round to lock in earnings before Tuesday rotation.</div>
              </div>}
              <button type="button" style={{...pri,opacity:.8}} onClick={async()=>{
                if(showArchives){setShowArchives(false);return;}
                const d=await adminAction('get-archives');
                if(d?.archives){setArchives(d.archives);setShowArchives(true);}
              }}>{showArchives?'Hide Archives':'View Past Results'}</button>
              {showArchives&&<div style={{marginTop:12}}>
                {archives.length===0
                  ?<p style={{fontSize:13,color:'#888'}}>No archived results yet.</p>
                  :archives.map(a=>{
                    const THEME=THEMES[a.major]||THEMES.pga;
                    const earnings=a.earnings||{};
                    const hasEarnings=Object.keys(earnings).length>0;
                    const ranked=[...a.entries].map(e=>({
                      ...e,
                      total:e.picks.reduce((s,n)=>s+(earnings[n]||0),0),
                    })).sort((x,y)=>y.total-x.total);
                    // Compute pool prize money based on archive's entryFee
                    const archiveFee = a.entryFee || 0;
                    const pot = ranked.length * archiveFee;
                    const showPrizes = archiveFee > 0 && ranked.length >= 3;
                    const prizes = showPrizes ? [pot - archiveFee * 3, archiveFee * 2, archiveFee] : [];
                    return<div key={a.major+'_'+a.year} style={{marginBottom:16,background:THEME.bodyBg,borderRadius:10,padding:12,border:`1px solid ${THEME.cardBorder}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{fontSize:20}}>{THEME.emoji}</span>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:THEME.primary}}>{a.eventName || THEME.eventName} {a.year}</div>
                          <div style={{fontSize:10,color:'#8a9580'}}>
                            {new Date(a.archivedAt).toLocaleDateString()} · {a.entries.length} entries
                            {showPrizes&&<span style={{marginLeft:6}}>· ${pot} pot</span>}
                            {!hasEarnings&&<span style={{color:'#e5a000',marginLeft:6}}>· no earnings saved</span>}
                          </div>
                        </div>
                      </div>
                      {ranked.map((e,i)=>{
                        const paid=!!a.payments?.[e.name];
                        const prize=showPrizes&&i<3?prizes[i]:0;
                        return<div key={e.name} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:`1px solid ${THEME.cardBorder}`,fontSize:13}}>
                          <span style={{fontSize:i<3?16:13,fontWeight:800,width:28,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
                          <span style={{flex:1,fontWeight:600}}>{e.name}</span>
                          {prize>0&&<span style={{fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:8,background:i===0?'#fef3c7':i===1?'#e5e7eb':'#fde0c4',color:i===0?'#92400e':i===1?'#555':'#9a4a00',border:`1px solid ${i===0?'#fbbf24':i===1?'#999':'#e08040'}`}}>💰 ${prize}</span>}
                          {hasEarnings&&<span style={{fontWeight:700,color:THEME.primary,fontSize:13}}>{fmt(e.total)}</span>}
                          <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,background:paid?'#e8f5e8':'#f5f5f5',color:paid?'#2d7a1e':'#aaa'}}>{paid?'✓':'Unpaid'}</span>
                        </div>;
                      })}
                    </div>;
                  })}
              </div>}
            </div>

            <div style={sec}>
              <h3 style={stl}>💬 Chat Moderation</h3>
              <p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>{chatMessages.length} messages in pool chat. Use the X button next to messages to delete individual ones.</p>
              <button type="button" style={dan} onClick={async()=>{
                if(!confirm('Clear ALL chat messages? This cannot be undone.'))return;
                console.log('Clearing chat with adminPw:', adminPw?.length, 'chars');
                const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({poolId,action:'chat-clear-all',password:adminPw})});
                const d=await r.json();
                console.log('Clear chat response:', d);
                if(d.error){msg('Error: '+d.error);return;}
                setChatMessages([]);msg('Chat cleared');
              }}>🗑 Clear All Chat Messages</button>
            </div>

            <div style={{...sec,borderColor:'#d4444460'}}><h3 style={{...stl,color:'#a03030'}}>⚠ Danger</h3><button type="button" style={dan} onClick={async()=>{if(!confirm('Reset everything?'))return;await adminAction('reset');setEntries([]);setPayments({});msg('Reset done');}}>Reset All</button></div>
          </>)}
      </main>

      <footer style={{textAlign:'center',padding:'16px 12px',fontSize:10,color:'#8a9580',borderTop:`1px solid ${T.cardBorder}`,background:T.bodyBg}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:12,color:T.primary,marginBottom:4}}>2 Favorites · 4 Contenders · 4 Longshots</div>
        <div>Highest combined earnings wins</div>
      </footer>
    </div>
  );
}