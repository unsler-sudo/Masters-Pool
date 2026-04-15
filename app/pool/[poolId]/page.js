'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

// ─── MAJOR THEMES — visual/branding only, schedule data fetched from DataGolf ─
// eventName, courseName, purse, teeTime are auto-populated from the schedule API
// Only update: emoji, tagline, and color scheme (these don't change year to year)
const THEMES = {
  players: {
    emoji:'⛳', tagline:"Golf's Fifth Major",
    // Fallback values used until schedule API loads
    eventName:'The Players Championship', courseName:'TPC Sawgrass · Ponte Vedra Beach, FL',
    teeTime:'2027-03-11T12:00:00Z', purse:25000000,
    primary:'#0f3d5c', dark:'#061e2e', mid:'#1a5a7a', accent:'#c8a84b', accentLight:'#faf3e0',
    navBg:'#fff', navActive:'#edf4f8', navBorder:'#0f3d5c',
    headerBg:'linear-gradient(170deg,#061e2e 0%,#0f3d5c 40%,#1a5a7a 70%,#1e7090 100%)',
    bg:'linear-gradient(180deg,#bfcfd8 0%,#edf4f8 300px)',
    bodyBg:'#edf4f8', cardBorder:'#c4d4dc', inputBorder:'#b4c8d4', stripeBg:'#f4f9fc', rowHl:'#e0eef6',
  },
  masters: {
    emoji:'🌸', tagline:'A Tradition Unlike Any Other',
    eventName:'The Masters', courseName:'Augusta National Golf Club',
    teeTime:'2026-04-09T11:00:00Z', purse:21000000,
    primary:'#2d5016', dark:'#0a1f04', mid:'#1e5010', accent:'#d94878', accentLight:'#f9e8ef',
    navBg:'#fff', navActive:'#f5f0e8', navBorder:'#1e5010',
    headerBg:'linear-gradient(170deg,#0a1f04 0%,#163a0a 30%,#1e5010 60%,#2a6818 100%)',
    bg:'linear-gradient(180deg,#d8d3c4 0%,#f3efe6 300px)',
    bodyBg:'#f3efe6', cardBorder:'#cdc8b8', inputBorder:'#c8c3b5', stripeBg:'#faf8f3', rowHl:'#f0ebd6',
  },
  pga: {
    emoji:'🏆', tagline:'The Wanamaker Trophy',
    eventName:'PGA Championship', courseName:'Aronimink Golf Club · Newtown Square, PA',
    teeTime:'2026-05-14T11:00:00Z', purse:20000000,
    primary:'#1a2a5c', dark:'#050d1a', mid:'#243475', accent:'#c9a84c', accentLight:'#faf3e0',
    navBg:'#fff', navActive:'#eef0f8', navBorder:'#1a2a5c',
    headerBg:'linear-gradient(170deg,#050d1a 0%,#0d1a2e 35%,#1a2a5c 65%,#243475 100%)',
    bg:'linear-gradient(180deg,#c4c8d8 0%,#eef0f8 300px)',
    bodyBg:'#eef0f8', cardBorder:'#c8ccdc', inputBorder:'#b8bcd0', stripeBg:'#f5f7fc', rowHl:'#e8ecf8',
  },
  usopen: {
    emoji:'🇺🇸', tagline:'The Hardest Test in Golf',
    eventName:'U.S. Open', courseName:'Shinnecock Hills Golf Club · Southampton, NY',
    teeTime:'2026-06-18T11:00:00Z', purse:21500000,
    primary:'#1a2a5c', dark:'#0d1a2e', mid:'#8a1818', accent:'#b02020', accentLight:'#fdeaea',
    navBg:'#fff', navActive:'#eceff6', navBorder:'#1a2a5c',
    headerBg:'linear-gradient(170deg,#0d1a2e 0%,#1a2a5c 40%,#8a1818 65%,#b02020 100%)',
    bg:'linear-gradient(180deg,#c8cbd6 0%,#eceff6 300px)',
    bodyBg:'#eceff6', cardBorder:'#c4c8d8', inputBorder:'#b4b8cc', stripeBg:'#f4f6fb', rowHl:'#e8eaf5',
  },
  open: {
    emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', tagline:'The Oldest Major',
    eventName:'The Open Championship', courseName:'Royal Birkdale · Southport, England',
    teeTime:'2026-07-16T05:35:00Z', purse:17000000,
    primary:'#5a3e28', dark:'#1a0f08', mid:'#7a5a3c', accent:'#8a6a9a', accentLight:'#f0ecf5',
    navBg:'#fff', navActive:'#f5f1ec', navBorder:'#5a3e28',
    headerBg:'linear-gradient(170deg,#1a0f08 0%,#2e1e0f 30%,#5a3e28 65%,#7a5a3c 100%)',
    bg:'linear-gradient(180deg,#cec8bc 0%,#f0ece2 300px)',
    bodyBg:'#f0ece2', cardBorder:'#d0c8bc', inputBorder:'#c4bdb0', stripeBg:'#f7f3ee', rowHl:'#ede5d8',
  },
};

// DataGolf event IDs → our major keys (for schedule API matching)
const DG_EVENT_IDS = { 11:'players', 14:'masters', 33:'pga', 26:'usopen', 100:'open' };

// ─── TIER DEFINITIONS (Contenders color overridden in component to match theme) ─
const TIER_DEFS = [
  { id:1, name:'Favorites',  label:'Group A — Favorites',  color:'#b8960c', picks:2 },
  { id:2, name:'Contenders', label:'Group B — Contenders', color:'#1a2a5c', picks:4 },
  { id:3, name:'Longshots',  label:'Group C — Longshots',  color:'#6b4c9a', picks:3 },
];
const TOTAL_PICKS = 9;
const TIER_CUTS = [10, 40];

// ─── COUNTRY FLAGS ─────────────────────────────────────────────────────────
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
  MAS:'🇲🇾',SIN:'🇸🇬',PNG:'🇵🇬',
};
const Flag = ({c}) => FLAG_MAP[c] ? <span>{FLAG_MAP[c]}</span> : null;

// ─── Hole color coding ─────────────────────────────────────────────────────
function holeStyle(toPar) {
  if (toPar == null) return { bg:'#f0f0f0', text:'#ccc',  ring:'#ddd' };
  if (toPar <= -2)   return { bg:'#1565c0', text:'#fff',  ring:'#0d47a1', label:'🦅' };
  if (toPar === -1)  return { bg:'#f9a825', text:'#3e2000',ring:'#f57f17', label:'🐦' };
  if (toPar === 0)   return { bg:'#eeeeee', text:'#555',  ring:'#bdbdbd' };
  if (toPar === 1)   return { bg:'#ffcdd2', text:'#c62828',ring:'#ef9a9a' };
  if (toPar === 2)   return { bg:'#e53935', text:'#fff',  ring:'#b71c1c' };
  return               { bg:'#880e4f', text:'#fff',  ring:'#560027', label:'💀' };
}

// ─── PAYOUT TABLE ──────────────────────────────────────────────────────────
const PAYOUT={1:.20,2:.109,3:.069,4:.049,5:.041,6:.03625,7:.03375,8:.03125,9:.02925,10:.02725,11:.02525,12:.02325,13:.02125,14:.01925,15:.01825,16:.01725,17:.01625,18:.01525,19:.01425,20:.01325,21:.01225,22:.01125,23:.01045,24:.00965,25:.00885,26:.00805,27:.00775,28:.00745,29:.00715,30:.00685,31:.00655,32:.00625,33:.00595,34:.0057,35:.00545,36:.0052,37:.00495,38:.00475,39:.00455,40:.00435,41:.00415,42:.00395,43:.00375,44:.00355,45:.00335,46:.00315,47:.00295,48:.00279,49:.00265,50:.00257,51:.00251,52:.00245,53:.00241,54:.00237,55:.00235,56:.00233,57:.00231,58:.00229,59:.00227,60:.00225,61:.00223,62:.00221,63:.00219,64:.00217,65:.00215};

const fmt=n=>'$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
const parsePos=s=>{if(!s||s==='-'||/CUT|WD|DQ|MC/i.test(s))return null;return parseInt(String(s).replace('T',''),10);};
const flip=n=>n.includes(', ')?n.split(', ').reverse().join(' '):n;
const fmtScore=n=>{if(n==null)return null;if(n===0)return'E';return n>0?`+${n}`:String(n);};
const toLastFirst=name=>{const p=name.trim().split(' ');if(p.length<2)return name;const last=p.pop();return`${last}, ${p.join(' ')}`;};

function calcEarnings(players, purse){
  const g={};players.forEach(p=>{const pos=parsePos(p.pos);if(pos&&pos<=65){if(!g[pos])g[pos]=[];g[pos].push(p.name);}});
  const m={};Object.entries(g).forEach(([ps,pls])=>{const pos=+ps;let t=0;for(let i=0;i<pls.length;i++)t+=PAYOUT[pos+i]||0;const e=Math.round(t/pls.length*purse);pls.forEach(n=>{m[n]=e;});});
  return m;
}

// ─── SEED FIELD ────────────────────────────────────────────────────────────

const TABS=['Standings','Enter Pool','Field','History','Admin'];

export default function App(){
  const params       = useParams();
  const searchParams = useSearchParams();
  const poolId       = params?.poolId || 'default';
  const justActivated = searchParams?.get('activated') === '1';

  // ─── Join code gate ────────────────────────────────────────────────────────
  // Set JOIN_CODE_REQUIRED = true to enable gating. Currently disabled.
  const JOIN_CODE_REQUIRED = true;
  const [joinCodeEntry, setJoinCodeEntry] = useState('');
  const [joinCodeError, setJoinCodeError] = useState('');
  const [joinCodePassed, setJoinCodePassed] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem(`jc_${poolId}`) === 'true'
      : true
  );

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

  // Show join code gate if required and not yet passed
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
  // ─── State ────────────────────────────────────────────────────────────────
  const [tab,setTab]=useState('Standings');
  const [activeMajor,setActiveMajor]=useState('pga');
  const [scheduleData,setScheduleData]=useState({}); // auto-populated from DataGolf schedule API
  const [entries,setEntries]=useState([]);
  const [poolMeta,setPoolMeta]=useState(null);
  const [payments,setPayments]=useState({});
  const [field,setField]=useState([]);
  const [fields,setFields]=useState({}); // cache of all 5 major fields
  const [fieldSource,setFieldSource]=useState('preliminary');
  const [fieldLastUpdated,setFieldLastUpdated]=useState(null);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('');
  const activeMajorRef=useRef('pga'); // always current, safe inside intervals
  const [refreshing,setRefreshing]=useState(false);
  const [entryName,setEntryName]=useState('');
  const [picks,setPicks]=useState({1:[],2:[],3:[]});
  const [search,setSearch]=useState('');
  const [toast,setToast]=useState('');
  const [adminPw,setAdminPw]=useState('');
  const [adminOk,setAdminOk]=useState(false);
  const [serverLocked,setServerLocked]=useState(false);
  const [serverPicksHidden,setServerPicksHidden]=useState(true);
  const [lastUp,setLastUp]=useState(null);
  const [openCard,setOpenCard]=useState(null);
  const [activeTier,setActiveTier]=useState(1);
  const [submitting,setSubmitting]=useState(false);
  const [now,setNow]=useState(Date.now());
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [holeData,setHoleData]=useState({round:null,holes:[],loading:false,error:null});
  const [archives,setArchives]=useState([]);
  const [showArchives,setShowArchives]=useState(false);
  const [publicArchives,setPublicArchives]=useState([]);
  const [historyLoaded,setHistoryLoaded]=useState(false);
  const timer=useRef(null);

  // ─── Theme derived from activeMajor + live schedule data ──────────────────
  const T = { ...THEMES[activeMajor]||THEMES.pga, ...scheduleData[activeMajor] };
  const TEE_TIME = new Date(T.teeTime).getTime();
  const TOURNAMENT = { name: T.eventName, purse: T.purse };
  const TIERS = TIER_DEFS.map(t => t.id===2 ? {...t, color:T.primary} : t);

  const pastTeeTime = now >= TEE_TIME;
  const locked = serverLocked || pastTeeTime;
  const picksHidden = serverPicksHidden && !pastTeeTime;

  const getCountdown = () => {
    const diff = TEE_TIME - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `${days}d ${hrs}h until entries lock`;
    if (hrs > 0) return `${hrs}h ${mins}m until entries lock`;
    return `${mins}m until entries lock`;
  };
  const countdown = getCountdown();
  const allPicks=[...picks[1],...picks[2],...picks[3]];
  const totalPicked=allPicks.length;
  const msg=m=>{setToast(m);setTimeout(()=>setToast(''),3500);};

  const loadEntries=async()=>{
    try{
      const r=await fetch('/api/entries?poolId='+poolId);
      const d=await r.json();
      if(d.entries)setEntries(d.entries);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
      if(d.payments)setPayments(d.payments);
      if(d.meta)setPoolMeta(d.meta);
      if(d.major&&THEMES[d.major]){
        const prevMajor = activeMajorRef.current;
        setActiveMajor(d.major);
        activeMajorRef.current = d.major;
        if(d.major !== prevMajor){
          fetchField(d.major, true);
        }
      }
    }catch(e){console.error('loadEntries:',e);}
  };

  // ─── Fetch schedule from DataGolf — auto-populates eventName, courseName, purse, teeTime ──
  // Runs once on load. Falls back to THEMES values if API unavailable.
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

        // Build course name from city + course
        const course = ev.course || ev.course_name || '';
        const city   = ev.location?.city || ev.city || '';
        const country= ev.location?.country || ev.country || '';
        const courseName = course ? `${course}${city?` · ${city}`:''}${country&&country!=='United States'?`, ${country}`:''}` : '';

        // Parse tee time — DataGolf gives start_date like "2026-05-14"
        const startDate = ev.start_date || ev.date || '';
        // Default to 11:00 UTC (7am ET) if no time given
        const teeTime = startDate ? `${startDate}T11:00:00Z` : null;

        // Purse
        const purse = ev.purse || ev.total_purse || null;

        // Event name with year
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
    }catch(e){ console.warn('fetchSchedule failed:', e.message); }
  };
  // updateDisplay=true → updates the visible field tab
  // updateDisplay=false → silently caches in Redis + local state (background prefetch)
  const fetchField=async(major=activeMajor, updateDisplay=true)=>{
    const theme = THEMES[major] || THEMES.pga;
    // When switching majors, immediately show loading state or cached data
    if(updateDisplay){
      setFields(prev=>{
        const cached = prev[major];
        if(cached?.length > 0){
          setField(cached);
          setFieldSource(`📡 datagolf.com/major-fields · ${cached.length} confirmed in field ✓ · cached`);
        } else {
          setField([]); // Clear old major's data while loading
          setFieldSource(`⏳ Loading ${theme.eventName} field...`);
        }
        return prev;
      });
    }
    try{
      const scrapeRes = await fetch(`/api/scrape-field?major=${major}`);
      if(!scrapeRes.ok) return;
      const scrapeData = await scrapeRes.json();
      const scrapedPlayers = scrapeData.players || [];
      if(scrapedPlayers.length < 5) return;

      // Enrich with odds — use scraper index (i) for tier assignment
      // DataGolf summary table is sorted by DG rank: i=0=Scheffler, i=1=McIlroy etc.
      // This is reliable regardless of name format. Odds fetched separately for display only.
      const oddsMap = {};
      if(updateDisplay){
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
        preds.forEach(p=>{
          if(!p.player_name) return;
          const w = p.win||0;
          const raw = p.player_name.toLowerCase().trim();
          oddsMap[raw] = w;
          const pts = raw.split(' ');
          if(pts.length>=2) oddsMap[`${pts[pts.length-1]}, ${pts.slice(0,-1).join(' ')}`] = w;
        });
      }

      // Tier assignment strategy:
      // > 7 days before tee time → use scraper index (DG rank order, always available)
      // ≤ 7 days before tee time → use pre-tournament odds (major-specific, published ~1 week out)
      const teeTimeMs = new Date(T.teeTime).getTime();
      const useOdds   = Date.now() >= teeTimeMs - 7 * 24 * 60 * 60 * 1000;

      // Build odds rank only when within 7 days
      const oddsRank = {};
      if(useOdds && Object.keys(oddsMap).length > 0){
        // Sort by win probability descending → assign rank
        const sorted = Object.entries(oddsMap)
          .filter(([k]) => !k.includes(',')) // dedupe — only use "first last" keys
          .sort((a,b) => b[1]-a[1]);
        sorted.forEach(([name], idx) => {
          oddsRank[name] = idx;
          // Also store "last, first" version
          const parts = name.split(' ');
          if(parts.length >= 2)
            oddsRank[`${parts[parts.length-1]}, ${parts.slice(0,-1).join(' ')}`] = idx;
        });
      }

      const enriched = scrapedPlayers.filter(p=>p.confirmed||p.onTrack).map((p,i)=>{
        const key  = p.name.toLowerCase().trim();
        const win  = oddsMap[key] ?? 0;
        const odds = win > 0.001 ? `+${Math.round((1/win)*100-100)}` : 'n/a';
        // dgRank = explicit DG rank number from scraper (1=Scheffler, 2=McIlroy etc.)
        // Falls back to scraper index i if dgRank not available
        const baseRank = (p.dgRank && p.dgRank < 9999) ? p.dgRank - 1 : i;
        // Within 7 days of tee time, use odds rank if we have a match
        const rank = (useOdds && oddsRank[key] !== undefined) ? oddsRank[key] : baseRank;
        return {
          name:p.name, country:p.country||'USA',
          odds, tier:rank<TIER_CUTS[0]?1:rank<TIER_CUTS[1]?2:3,
          confirmed:p.confirmed,
          onTrack:p.onTrack||false,
          pos:'-',score:'E',today:'',thru:'',earnings:0,r1:null,r2:null,r3:null,r4:null,
        };
      });

      // Always store in local fields cache for instant major-switching
      setFields(prev=>({...prev,[major]:enriched}));

      // Only update visible field if this is the displayed major
      if(updateDisplay){
        setField(enriched);
        const confirmed = enriched.filter(p=>p.confirmed).length;
        const onTrack   = enriched.filter(p=>p.onTrack&&!p.confirmed).length;
        const cached = scrapeData.fromCache ? ' · cached' : '';
        setFieldSource(`📡 datagolf.com/major-fields · ${confirmed} confirmed ✓  ${onTrack} on track –${cached}`);
        setFieldLastUpdated(new Date().toLocaleTimeString());
      }
    }catch(e){ console.warn(`fetchField(${major}) failed:`,e.message); }
  };

  // ─── Fetch all 5 major fields staggered (background refresh every 60s) ──────
  // Staggered by 8s each so Vercel never runs more than one Chromium at a time.
  // Results cached in Redis for 5 min so most calls are instant Redis reads.
  const fetchAllFields=async()=>{
    const MAJORS=['players','masters','pga','usopen','open'];
    const active = activeMajorRef.current;
    for(const major of MAJORS){
      await fetchField(major, major===active);
      // Wait between majors — gives previous scrape time to finish and release lock
      await new Promise(r=>setTimeout(r, 8000));
    }
  };

  const fetchScores=async(quiet)=>{
    if(quiet&&picksHidden)return;
    setRefreshing(true);
    try{
      const r=await fetch('/api/scores?endpoint=in-play');
      if(!r.ok)throw new Error('API '+r.status);
      const data=await r.json();
      const raw=data.data||data.players||data||[];
      if(!Array.isArray(raw)||raw.length===0)throw new Error('No live scores yet');
      const updated=field.map(f=>{
        const match=raw.find(p=>{
          const pName=(p.player_name||p.dg_player_name||'').toLowerCase();
          const fName=f.name.toLowerCase();
          const ln=(p.last_name||'').toLowerCase();
          const fn=(p.first_name||'').toLowerCase();
          return pName===fName||fName===`${ln}, ${fn}`;
        });
        if(match){
          const total=match.current_score??match.total_to_par??match.total??null;
          const todayScore=match.today??null;
          const thruHoles=match.thru??null;
          return{...f,
            pos:match.current_pos!=null?String(match.current_pos):(match.position||f.pos),
            score:total!=null?(total===0?'E':(total>0?`+${total}`:String(total))):f.score,
            today:todayScore!=null?(todayScore===0?'E':(todayScore>0?`+${todayScore}`:String(todayScore))):'',
            thru:thruHoles!=null?String(thruHoles):'',
            r1:match.R1??match.round1??null,r2:match.R2??match.round2??null,
            r3:match.R3??match.round3??null,r4:match.R4??match.round4??null,
          };
        }
        return f;
      });
      const em=calcEarnings(updated, TOURNAMENT.purse);
      updated.forEach(p=>{p.earnings=em[p.name]||0;});
      setField(updated);
      setLastUp(new Date().toLocaleTimeString());
      setStatus('');
      // Auto-persist earnings to Redis so archive has them even if no manual save
      if(Object.keys(em).length>0){
        fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({poolId,action:'save-archive-earnings',password:adminPw||'auto',
            major:activeMajor,year:new Date().getFullYear(),earnings:em})
        }).catch(()=>{});
      }
      if(!quiet)msg('Scores updated');
    }catch(e){if(!quiet)setStatus(e.message);}
    setRefreshing(false);
  };

  // ─── Hole scores from DataGolf ────────────────────────────────────────────
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
      const flipped=flip(playerName).toLowerCase();
      const lastName=flipped.split(' ').pop();
      const record=all.find(s=>{
        const n=(s.player_name||'').toLowerCase();
        const roundMatch=(s.round_num??s.round??0)===roundNum;
        return roundMatch&&(n.includes(lastName)||lastName.includes(n.split(' ').pop()));
      });
      let holeScores=null;
      if(record){
        holeScores=record.hole_scores||record.scores||record.strokes||null;
        if(!Array.isArray(holeScores)&&holeScores&&typeof holeScores==='object')holeScores=Object.values(holeScores);
      }else{
        const playerObj=all.find(s=>{const n=(s.player_name||'').toLowerCase();return n.includes(lastName)||lastName.includes(n.split(' ').pop());});
        if(playerObj){const key=`R${roundNum}`;const alt=playerObj[key]||playerObj[`round${roundNum}`]||playerObj[`round_${roundNum}`];if(Array.isArray(alt))holeScores=alt;}
      }
      if(!holeScores||!holeScores.length)throw new Error('No hole data for R'+roundNum+' yet');
      const holes=holeScores.slice(0,18).map((score,i)=>{
        const s=typeof score==='string'?parseInt(score,10):Number(score);
        // Use par from the API record if available, fall back to 4
        const par=record?.course_par?.[i]??record?.hole_pars?.[i]??record?.par?.[i]??4;
        return{hole:i+1,score:isNaN(s)?null:s,par,toPar:isNaN(s)?null:s-par};
      });
      setHoleData({round:roundNum,holes,loading:false,error:null});
    }catch(e){setHoleData({round:roundNum,holes:[],loading:false,error:e.message});}
  };

  const closeScorecard=()=>{setSelectedPlayer(null);setHoleData({round:null,holes:[],loading:false,error:null});};

  useEffect(()=>{
    // Fetch schedule first so eventName/courseName/purse/teeTime are up to date
    fetchSchedule();
    // Load active major field immediately on mount
    Promise.all([loadEntries(),fetchField()]).then(()=>setReady(true));
    fetchScores(true);
    // Prefetch all other 4 majors in background (after 3s so active major loads first)
    setTimeout(()=>fetchAllFields(), 3000);
    // Every 60s: refresh scores + entries + all 5 major fields (Redis cached, fast)
    timer.current=setInterval(()=>{fetchScores(true);loadEntries();fetchAllFields();setNow(Date.now());},60000);
    const clock=setInterval(()=>setNow(Date.now()),30000);
    return()=>{clearInterval(timer.current);clearInterval(clock);};
  },[]);

  const togglePick=(name,tier)=>{
    const tp=picks[tier];const mx=TIERS.find(t=>t.id===tier)?.picks||3;
    if(tp.includes(name))setPicks({...picks,[tier]:tp.filter(p=>p!==name)});
    else if(tp.length<mx)setPicks({...picks,[tier]:[...tp,name]});
  };
  const removePick=name=>{const np={};for(const t of[1,2,3])np[t]=picks[t].filter(p=>p!==name);setPicks(np);};

  const submit=async()=>{
    if(!entryName.trim())return msg('Enter your name!');
    for(const t of TIERS)if(picks[t.id].length!==t.picks)return msg(`Pick ${t.picks} from ${t.name}`);
    setSubmitting(true);
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,action:'submit',name:entryName.trim(),picks:allPicks})});
      const d=await r.json();
      if(d.error){msg(d.error);setSubmitting(false);return;}
      if(d.entries)setEntries(d.entries);
      setEntryName('');setPicks({1:[],2:[],3:[]});setSearch('');
      msg('Entry submitted!');setTab('Standings');
    }catch(e){msg('Error submitting — check connection');}
    setSubmitting(false);
  };

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
  const ranked=[...entries].sort((a,b)=>teamE(b)-teamE(a));
  const owners=n=>entries.filter(e=>e.picks.includes(n)).map(e=>e.name);
  const sortF=[...field].sort((a,b)=>{const pa=parsePos(a.pos),pb=parsePos(b.pos);if(!pa&&!pb)return 0;if(!pa)return 1;if(!pb)return -1;return pa-pb;});
  const tierField=field.filter(p=>p.tier===activeTier).sort((a,b)=>a.name.localeCompare(b.name));
  const filteredTier=tierField.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const fieldVis=sortF.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  const adminAction=async(action,extra={})=>{
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({poolId,action,password:adminPw,...extra})});
      const d=await r.json();
      if(d.error){msg(d.error);return null;}
      if(d.entries!==undefined)setEntries(d.entries||[]);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
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

  // Switch active major — saves to Redis, re-fetches field
  const switchMajor=async(major)=>{
    setActiveMajor(major);
    activeMajorRef.current = major; // keep ref in sync immediately
    setField([]);                   // clear old field right away
    setFieldSource(`⏳ Loading ${THEMES[major]?.eventName} field...`);
    const d=await adminAction('set-major',{major});
    if(d?.ok){
      msg(`Switched to ${THEMES[major].eventName} ${THEMES[major].emoji}`);
      fetchField(major, true); // fetch new major's field immediately
    }
  };

  // Theme-aware styles
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

      {/* ─── SCORECARD MODAL ──────────────────────────────────────────── */}
      {selectedPlayer&&(()=>{
        const p=selectedPlayer;
        const t=TIERS.find(t=>t.id===p.tier);
        const ow=owners(p.name);
        const rounds=[{label:'R1',val:p.r1,num:1},{label:'R2',val:p.r2,num:2},{label:'R3',val:p.r3,num:3},{label:'R4',val:p.r4,num:4}];
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
                    <div style={{fontSize:12,color:'#8a9580',marginTop:2}}>{p.country} · <span style={{fontWeight:700,color:t?.color}}>{t?.label}</span> · {p.odds}{p.confirmed&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 6px',borderRadius:8}}>✓ Confirmed</span>}{p.onTrack&&!p.confirmed&&<span style={{marginLeft:6,fontSize:10,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 6px',borderRadius:8}}>– On Track</span>}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:26,fontWeight:800,color:T.primary}}>{p.score}</div>
                    <div style={{fontSize:12,color:'#8a9580'}}>Pos <b style={{color:'#333'}}>{p.pos}</b></div>
                  </div>
                </div>
                {/* Round boxes */}
                <div style={{marginBottom:4}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#aaa',letterSpacing:1,marginBottom:8}}>ROUNDS{completedRounds.length>0?' — tap a round for hole scores':''}</div>
                  <div style={{display:'flex',gap:8}}>
                    {rounds.map(r=>{
                      const active=holeData.round===r.num;const done=r.val!=null;
                      const col=done?(r.val<0?'#1a6b1a':r.val===0?'#555':'#b02020'):'#ccc';
                      return(<button key={r.label} type="button" onClick={()=>done&&fetchHoleScores(p.name,r.num)} disabled={!done||holeData.loading}
                        style={{flex:1,textAlign:'center',background:active?T.primary:done?'#f5f5f5':'#fafafa',borderRadius:12,padding:'10px 4px',border:`2px solid ${active?T.primary:done?col+'44':'#eee'}`,cursor:done?'pointer':'default',transition:'all .15s'}}>
                        <div style={{fontSize:10,color:active?'#fff99a':'#888',fontWeight:600,marginBottom:4}}>{r.label}</div>
                        {done?<div style={{fontSize:22,fontWeight:800,color:active?'#fff':col}}>{fmtScore(r.val)}</div>:<div style={{fontSize:20,fontWeight:800,color:'#ddd'}}>-</div>}
                        {done&&<div style={{fontSize:9,color:active?'#ffffff99':'#aaa',marginTop:2}}>{active?'▲ hide':'tap'}</div>}
                      </button>);
                    })}
                  </div>
                </div>
                {/* Holes loading/error */}
                {holeData.loading&&<div style={{textAlign:'center',padding:'20px 0'}}><div style={{width:24,height:24,border:`3px solid ${T.primary}20`,borderTopColor:T.primary,borderRadius:'50%',animation:'sp .7s linear infinite',margin:'0 auto 8px'}}/><div style={{fontSize:12,color:'#aaa'}}>Loading hole scores...</div></div>}
                {!holeData.loading&&holeData.error&&holeData.round&&<div style={{textAlign:'center',padding:'16px 0',fontSize:12,color:'#bbb'}}>{holeData.error}</div>}
                {/* Hole grid */}
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
                {/* In-progress (no round data yet) */}
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

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header style={{background:T.headerBg,padding:0,color:'#faf6ed',position:'relative',overflow:'hidden'}}>
        <svg viewBox="0 0 800 200" style={{width:'100%',display:'block'}} xmlns="http://www.w3.org/2000/svg">
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
          <circle cx="80" cy="155" r="12" fill={T.accent} opacity=".8"/><circle cx="95" cy="150" r="10" fill={T.accent} opacity=".7"/>
          <circle cx="700" cy="148" r="11" fill={T.accent} opacity=".75"/><circle cx="715" cy="144" r="9" fill={T.accent} opacity=".65"/>
          <ellipse cx="370" cy="175" rx="50" ry="12" fill={T.dark} opacity=".3"/>
        </svg>
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,fontWeight:400,fontStyle:'italic',opacity:.7,letterSpacing:1.5,marginBottom:2}}>{poolMeta?.poolName || T.tagline}</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,letterSpacing:'-0.5px',textShadow:'0 2px 8px rgba(0,0,0,.3)'}}>{TOURNAMENT.name}</h1>
            <div style={{fontSize:11,opacity:.55,marginTop:2}}>{fmt(TOURNAMENT.purse)} purse · 2+4+3 picks</div>
          </div>
          <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
            <div style={{background:'#ffffff18',borderRadius:10,padding:'2px 8px',fontSize:10,fontWeight:600,backdropFilter:'blur(4px)',border:'1px solid #ffffff15',whiteSpace:'nowrap'}}>{entries.length} {entries.length===1?'entry':'entries'}</div>
            {countdown&&<div style={{fontSize:10,opacity:.7}}>⏱ {countdown}</div>}
            {lastUp&&!countdown&&<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'glow 2s infinite'}}/><span style={{fontSize:9,opacity:.5}}>Live · {lastUp}</span></div>}
          </div>
        </div>
      </header>

      <nav style={{display:'flex',background:T.navBg,borderBottom:`2px solid ${T.navBorder}`,position:'sticky',top:0,zIndex:10,boxShadow:'0 2px 6px rgba(0,0,0,.06)'}}>
        {TABS.map(t=><button key={t} onClick={()=>{setTab(t);setSearch('');}} style={{flex:1,padding:'11px 4px',fontSize:12,fontWeight:tab===t?700:500,border:'none',background:tab===t?T.navActive:'transparent',color:tab===t?T.primary:'#8a9580',borderBottom:tab===t?`3px solid ${T.primary}`:'3px solid transparent',letterSpacing:.3}}>{t==='Admin'?'⚙ ':''}{t}</button>)}
      </nav>
      {lastUp&&!picksHidden&&<div style={{padding:'4px 14px',background:T.navActive,borderBottom:`1px solid ${T.cardBorder}`,textAlign:'center'}}><span style={{fontSize:10,color:'#8a9580'}}>Scores update automatically · Last: {lastUp}</span></div>}
      {justActivated&&<div style={{background:'#d1fae5',padding:'10px 16px',fontSize:13,color:'#065f46',textAlign:'center',fontWeight:600}}>🎉 Your pool is live! Share this link with your friends to start entering picks.</div>}
      {status&&<div style={{background:'#fef3cd',padding:'8px 16px',fontSize:12,color:'#856404',textAlign:'center'}}>{status}</div>}

      <main style={{padding:'12px 12px 80px',maxWidth:660,margin:'0 auto',animation:'fu .35s ease'}}>

        {/* ─── STANDINGS ─────────────────────────────────────────────── */}
        {tab==='Standings'&&(<>
          {/* Unpaid banner — shown when pool needs payment for next major */}
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
          {/* Countdown banner — shown when entries are open and tournament hasn't started */}
          {countdown&&!locked&&poolMeta?.paid!==false&&<div style={{
            background:`linear-gradient(135deg,${T.dark} 0%,${T.mid} 100%)`,
            borderRadius:14,marginBottom:12,padding:'16px 18px',
            display:'flex',alignItems:'center',justifyContent:'space-between',
            boxShadow:`0 4px 16px ${T.primary}40`,
          }}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Entries Close In</div>
              <div style={{fontSize:26,fontWeight:800,color:'#fff',fontFamily:"'Playfair Display',serif",letterSpacing:-.5}}>{countdown.replace(' until entries lock','')}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:3}}>{T.courseName}</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36}}>{T.emoji}</div>
              <button type="button" onClick={()=>setTab('Enter Pool')} style={{
                marginTop:6,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',
                color:'#fff',borderRadius:20,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer',
              }}>Enter Now →</button>
            </div>
          </div>}
          {ranked.length===0?
          <div style={bx}><div style={{fontSize:44,marginBottom:10}}>🏌️</div><p style={{color:T.primary,fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:16,marginBottom:14}}>The field awaits your picks.</p><button type="button" style={pri} onClick={()=>setTab('Enter Pool')}>Enter the Pool</button></div>
          :<>
            {picksHidden&&<div style={{background:T.accentLight,padding:'12px 16px',borderRadius:9,marginBottom:10,fontSize:13,color:T.accent,textAlign:'center',border:`1px solid ${T.accent}30`}}>🏆 Picks hidden until first tee.{countdown?' '+countdown+'.':' Revealing soon!'}</div>}
            {ranked.map((e,i)=>{const tot=teamE(e),op=openCard===e.name,paid=!!payments[e.name];return(
              <div key={e.name} style={{background:'#fff',borderRadius:11,padding:'12px 14px',marginBottom:7,border:`1px solid ${T.cardBorder}`,animation:'fu .3s ease both',animationDelay:i*.04+'s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,cursor:picksHidden?'default':'pointer'}} onClick={()=>!picksHidden&&setOpenCard(op?null:e.name)}>
                  {!picksHidden&&<div style={{fontSize:i<3?18:14,fontWeight:800,width:32,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</div>}
                  {picksHidden&&<div style={{width:32,textAlign:'center',fontSize:16}}>✅</div>}
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700}}>{e.name}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'1px 7px',borderRadius:10,background:paid?'#e8f5e8':'#f5f5f5',color:paid?'#2d7a1e':'#aaa',border:`1px solid ${paid?'#2d7a1e30':'#ddd'}`}}>{paid?'✓ Paid':'Unpaid'}</span>
                    </div>
                    <div style={{fontSize:11,color:'#8a9580',marginTop:1}}>{picksHidden?'Entry submitted — picks hidden until tee-off':'Tap to '+(op?'collapse':'expand')}</div>
                  </div>
                  {!picksHidden&&<div style={{fontWeight:800,fontSize:17,color:T.primary}}>{fmt(tot)}</div>}
                </div>
                {!picksHidden&&op&&<div style={{marginTop:8,borderTop:'1px solid #eee8dc',paddingTop:8,animation:'sd .2s ease'}}>
                  {TIERS.map(t=>{const tp=e.picks.filter(pn=>field.find(f=>f.name===pn)?.tier===t.id);if(!tp.length)return null;return<div key={t.id} style={{marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.color,marginBottom:3,letterSpacing:.5}}>{t.label.toUpperCase()}</div>
                    {tp.map(pn=>{const p=field.find(f=>f.name===pn);return<div key={pn} style={{display:'flex',padding:'4px 0',borderBottom:'1px solid #f5f0e8',alignItems:'center',gap:6}}>
                      <span style={{fontSize:14}}><Flag c={p?.country}/></span>
                      <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13}}>{flip(pn)}</span>{p&&<span style={{fontSize:11,color:'#8a9580',marginLeft:6}}>{p.pos} · {p.score}</span>}</div>
                      <span style={{fontWeight:700,fontSize:13,color:T.primary}}>{fmt(p?.earnings)}</span>
                    </div>;})}
                  </div>;})}
                </div>}
                {!picksHidden&&!op&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                  {e.picks.map(pn=>{const p=field.find(f=>f.name===pn);const t=TIERS.find(t=>t.id===p?.tier);return<span key={pn} style={{fontSize:10,background:T.navActive,padding:'2px 7px',borderRadius:4,border:`1px solid ${T.cardBorder}`,borderLeft:`3px solid ${t?.color||'#ccc'}`}}><Flag c={p?.country}/> {pn.split(', ')[0]} <b style={{color:T.primary}}>{fmt(p?.earnings)}</b></span>;})}
                </div>}
              </div>);})}
          </>}
        </>)}

        {/* ─── ENTER POOL ────────────────────────────────────────────── */}
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
            :<div style={bx}><div style={{fontSize:44,marginBottom:10}}>🔒</div><p style={{color:'#6b7c5e'}}>Entries locked — tournament has started!</p></div>
          :<>
            {countdown&&<div style={{background:T.accentLight,padding:'8px 14px',borderRadius:9,marginBottom:10,fontSize:12,color:T.accent,textAlign:'center',border:`1px solid ${T.accent}30`}}>⏱ {countdown}</div>}
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input style={inp} placeholder="Your Name" value={entryName} onChange={e=>setEntryName(e.target.value)}/>
              <div style={{background:T.primary,color:'#faf6ed',minWidth:50,height:44,borderRadius:9,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>
                <span style={{fontSize:18,fontWeight:800}}>{totalPicked}</span><span style={{fontSize:9,opacity:.6}}>/{TOTAL_PICKS}</span>
              </div>
            </div>
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
                      {p.confirmed&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 5px',borderRadius:8}}>✓</span>}
                      {p.onTrack&&!p.confirmed&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 5px',borderRadius:8}}>– On Track</span>}
                    </div>
                    <div style={{fontSize:11,color:'#8a9580'}}>{p.country} · {p.odds}</div>
                    {!picksHidden&&ow.length>0&&<div style={{fontSize:10,color:'#8b6914',marginTop:1}}>Picked by: {ow.join(', ')}</div>}
                  </div>
                  <div style={sel?{width:20,height:20,borderRadius:'50%',background:T.primary,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}:{width:20,height:20,borderRadius:'50%',border:`2px solid ${T.inputBorder}`}}>{sel?'✓':''}</div>
                </button>);})}
            </div>
            <button type="button" disabled={submitting||totalPicked!==TOTAL_PICKS} style={{...pri,width:'100%',padding:12,fontSize:15,marginTop:10,borderRadius:9,opacity:(submitting||totalPicked!==TOTAL_PICKS)?.4:1}} onClick={submit}>
              {submitting?'Submitting...':'Submit Entry ('+totalPicked+'/'+TOTAL_PICKS+')'}
            </button>
          </>)}

        {/* ─── FIELD ─────────────────────────────────────────────────── */}
        {tab==='Field'&&<>
          <input style={{...inp,marginBottom:6}} placeholder="Search players..." value={search} onChange={e=>setSearch(e.target.value)}/>
          {/* Field source + last updated */}
          <div style={{marginBottom:8,textAlign:'center'}}>
            {fieldSource&&<div style={{fontSize:10,color:T.primary,background:`${T.primary}0a`,padding:'4px 10px',borderRadius:20,display:'inline-block',marginBottom:4}}>{fieldSource}</div>}
            {fieldLastUpdated&&<div style={{fontSize:10,color:'#8a9580',marginTop:2}}>Field last updated: {fieldLastUpdated} · auto-refreshes every 60s</div>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,fontSize:10,color:'#8a9580',justifyContent:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{background:'#e8f5e8',color:'#2d7a1e',padding:'1px 5px',borderRadius:8,fontWeight:700,fontSize:9}}>✓</span> Confirmed</span>
            <span>·</span>
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{background:'#fff0d6',color:'#7a4a00',padding:'1px 5px',borderRadius:8,fontWeight:700,fontSize:9}}>–</span> On Track</span>
            <span>·</span>
            <span>Tap player for scorecard</span>
          </div>
          <div style={{borderRadius:9,overflow:'hidden',border:`1px solid ${T.cardBorder}`}}>
            <div style={{display:'flex',padding:'8px 10px',background:T.primary,color:'#faf6ed',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>
              <span style={{width:40,textAlign:'center'}}>Pos</span><span style={{flex:1}}>Player</span><span style={{width:30,textAlign:'center'}}>Tier</span><span style={{width:38,textAlign:'center'}}>Thru</span><span style={{width:40,textAlign:'center'}}>Tot</span><span style={{width:72,textAlign:'right'}}>Earnings</span>
            </div>
            {fieldVis.map((p,i)=>{const ow=owners(p.name),sc=String(p.score).startsWith('-')?'#1a6b1a':p.score==='E'?'#555':'#b02020';const t=TIERS.find(t=>t.id===p.tier);const isCut=/CUT|WD|DQ|MC/i.test(p.pos);return(
              <div key={p.name} onClick={()=>setSelectedPlayer(p)} style={{display:'flex',padding:'7px 10px',alignItems:'center',fontSize:12,borderBottom:'1px solid #eee8dc',background:isCut?'#fafafa':ow.length&&!picksHidden?T.rowHl:i%2===0?'#fff':T.stripeBg,cursor:'pointer',opacity:isCut?.6:1}}>
                <span style={{width:40,textAlign:'center',fontWeight:700,color:isCut?'#999':T.primary,fontSize:12}}>{isCut?'✂️':p.pos}</span>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>
                  <span style={{marginRight:3}}><Flag c={p.country}/></span>
                  <span style={{fontWeight:600,fontSize:12,textDecoration:isCut?'line-through':'none',color:isCut?'#999':'inherit'}}>{flip(p.name)}</span>
                  {p.confirmed&&<span style={{marginLeft:4,fontSize:9,fontWeight:700,color:'#2d7a1e',background:'#e8f5e8',padding:'1px 5px',borderRadius:8,border:'1px solid #2d7a1e40'}}>✓</span>}
                  {p.onTrack&&!p.confirmed&&<span style={{marginLeft:4,fontSize:9,fontWeight:700,color:'#7a4a00',background:'#fff0d6',padding:'1px 5px',borderRadius:8,border:'1px solid #c8840040'}}>–</span>}
                  {!picksHidden&&ow.length>0&&<span style={{fontSize:9,color:'#8b6914',marginLeft:4}}>({ow.join(',')})</span>}
                </span>
                <span style={{width:30,textAlign:'center'}}><span style={{fontSize:9,fontWeight:700,color:t?.color,background:t?.color+'18',padding:'1px 5px',borderRadius:3}}>{String.fromCharCode(64+p.tier)}</span></span>
                <span style={{width:38,textAlign:'center',fontSize:11,color:'#888'}}>{p.thru||'-'}</span>
                <span style={{width:40,textAlign:'center',fontWeight:700,fontSize:12,color:isCut?'#999':sc}}>{isCut?'CUT':p.score}</span>
                <span style={{width:72,textAlign:'right',fontWeight:700,fontSize:12,color:isCut?'#999':'inherit'}}>{fmt(p.earnings)}</span>
              </div>);})}
          </div>
        </>}

        {/* ─── ADMIN ─────────────────────────────────────────────────── */}
        {/* ─── HISTORY ───────────────────────────────────────────────── */}
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
                const ranked=[...a.entries].map(e=>({
                  ...e,
                  total:e.picks.reduce((s,n)=>s+(earnings[n]||0),0),
                })).sort((x,y)=>y.total-x.total);
                return<div key={a.major+'_'+a.year} style={{marginBottom:16,borderRadius:12,overflow:'hidden',border:`1px solid ${THEME.cardBorder}`}}>
                  <div style={{background:THEME.headerBg,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:24}}>{THEME.emoji}</span>
                    <div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:15,color:'#fff'}}>{THEME.eventName}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{new Date(a.archivedAt).toLocaleDateString('en-US',{month:'long',year:'numeric'})} · {a.entries.length} entries</div>
                    </div>
                  </div>
                  <div style={{background:'#fff'}}>
                    {ranked.map((e,i)=><div key={e.name} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:`1px solid ${THEME.cardBorder}`,background:i===0?`${THEME.primary}08`:'#fff'}}>
                      <span style={{fontSize:i<3?18:13,fontWeight:800,width:28,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
                      <span style={{flex:1,fontWeight:600,fontSize:14}}>{e.name}</span>
                      {hasEarnings&&<span style={{fontWeight:800,color:THEME.primary,fontSize:14}}>{fmt(e.total)}</span>}
                    </div>)}
                  </div>
                </div>;
              })
          }
        </>}

        {tab==='Admin'&&(!adminOk?
          <div style={{background:'#fff',padding:20,borderRadius:11,border:`1px solid ${T.cardBorder}`}}>
            <p style={{color:'#6b7c5e',marginBottom:10,fontSize:13}}>Enter admin password:</p>
            <div style={{display:'flex',gap:8}}>
              <input style={inp} type="password" placeholder="Password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setAdminOk(true)}/>
              <button type="button" style={{...pri,padding:'10px 24px',minWidth:80}} onClick={()=>setAdminOk(true)}>Enter</button>
            </div>
          </div>
          :<>
            {/* ── ACTIVE MAJOR SWITCHER ── */}
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
              {/* Auto-schedule info */}
              <div style={{background:'#f8f9ff',borderRadius:8,padding:'10px 12px',border:'1px solid #e0e4f0'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#555',letterSpacing:.5,marginBottom:6}}>⏰ AUTO-MANAGEMENT SCHEDULE</div>
                <div style={{fontSize:11,color:'#6b7c5e',lineHeight:1.7}}>
                  <div>🔓 <b>7 days before tee-off</b> — entries auto-unlock</div>
                  <div>🔒 <b>At tee time</b> — entries auto-lock (client-side)</div>
                  <div>🔄 <b>Tuesday after final round</b> — auto-rotates to next major, clears all entries</div>
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
            <div style={sec}>
              <h3 style={stl}>💰 Payment Tracking</h3>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <p style={{fontSize:12,color:'#6b7c5e',flex:1}}>{Object.values(payments).filter(Boolean).length} of {entries.length} paid</p>
                <span style={{background:'#e8f5e8',color:'#2d7a1e',borderRadius:8,padding:'2px 10px',fontSize:11,fontWeight:700}}>{entries.length>0?Math.round(Object.values(payments).filter(Boolean).length/entries.length*100):0}% collected</span>
              </div>
              {entries.length===0?<p style={{color:'#8a9580',fontSize:12}}>No entries yet</p>:
                entries.map(e=>{const paid=!!payments[e.name];return(
                  <div key={e.name} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f0ebe0',alignItems:'center'}}>
                    <span style={{fontWeight:600,fontSize:13}}>{e.name}</span>
                    <button type="button" onClick={()=>togglePayment(e.name)} style={{background:paid?'#e8f5e8':'#f5f5f5',border:`1px solid ${paid?'#2d7a1e':'#ccc'}`,color:paid?'#2d7a1e':'#888',padding:'5px 14px',borderRadius:7,fontSize:12,fontWeight:600,minWidth:90,cursor:'pointer'}}>{paid?'✓ Paid':'Mark Paid'}</button>
                  </div>);})}
            </div>
            <div style={sec}><h3 style={stl}>👥 Entries ({entries.length})</h3>
              {entries.length===0?<p style={{color:'#8a9580',fontSize:12}}>No entries yet</p>:entries.map(e=><div key={e.name} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0ebe0',fontSize:13,alignItems:'center'}}>
                <span><b>{e.name}</b> <span style={{fontSize:10,color:'#8a9580'}}>{e.picks.length} picks</span>{!!payments[e.name]&&<span style={{fontSize:10,color:'#2d7a1e',fontWeight:700,marginLeft:4}}>✓ paid</span>}</span>
                <button type="button" style={{background:'transparent',border:'1px solid #c44',color:'#c44',padding:'3px 9px',borderRadius:5,fontSize:11,cursor:'pointer'}} onClick={async()=>{await adminAction('delete',{name:e.name});msg('Removed');}}>Remove</button>
              </div>)}
            </div>
            {/* ── Archives ── */}
            <div style={sec}>
              <h3 style={stl}>📚 Past Results</h3>
              {entries.length>0&&<div style={{marginBottom:10}}>
                <button type="button" style={{...pri,fontSize:12,marginBottom:4}} onClick={async()=>{
                  const earnings={};
                  field.forEach(p=>{if(p.earnings>0)earnings[p.name]=p.earnings;});
                  await adminAction('save-archive-earnings',{major:activeMajor,year:new Date().getFullYear(),earnings});
                  msg('Final earnings saved ✓');
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
                    return<div key={a.major+'_'+a.year} style={{marginBottom:16,background:THEME.bodyBg,borderRadius:10,padding:12,border:`1px solid ${THEME.cardBorder}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                        <span style={{fontSize:20}}>{THEME.emoji}</span>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:THEME.primary}}>{THEME.eventName}</div>
                          <div style={{fontSize:10,color:'#8a9580'}}>
                            {new Date(a.archivedAt).toLocaleDateString()} · {a.entries.length} entries
                            {!hasEarnings&&<span style={{color:'#e5a000',marginLeft:6}}>· no earnings saved</span>}
                          </div>
                        </div>
                      </div>
                      {ranked.map((e,i)=>{
                        const paid=!!a.payments?.[e.name];
                        return<div key={e.name} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:`1px solid ${THEME.cardBorder}`,fontSize:13}}>
                          <span style={{fontSize:i<3?16:13,fontWeight:800,width:28,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</span>
                          <span style={{flex:1,fontWeight:600}}>{e.name}</span>
                          {hasEarnings&&<span style={{fontWeight:700,color:THEME.primary,fontSize:13}}>{fmt(e.total)}</span>}
                          <span style={{fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:8,background:paid?'#e8f5e8':'#f5f5f5',color:paid?'#2d7a1e':'#aaa'}}>{paid?'✓':'Unpaid'}</span>
                        </div>;
                      })}
                    </div>;
                  })}
              </div>}
            </div>

            <div style={{...sec,borderColor:'#d4444460'}}><h3 style={{...stl,color:'#a03030'}}>⚠ Danger</h3><button type="button" style={dan} onClick={async()=>{if(!confirm('Reset everything?'))return;await adminAction('reset');setEntries([]);setPayments({});msg('Reset done');}}>Reset All</button></div>
          </>)}
      </main>

      <footer style={{textAlign:'center',padding:'16px 12px',fontSize:10,color:'#8a9580',borderTop:`1px solid ${T.cardBorder}`,background:T.bodyBg}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:12,color:T.primary,marginBottom:4}}>2 Favorites · 4 Contenders · 3 Longshots</div>
        <div>Highest combined earnings wins</div>
      </footer>
    </div>
  );
}
