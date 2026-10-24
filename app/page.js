'use client';
import { useState, useEffect } from 'react';

// FINGERPRINT_EMOJI_FONT — Windows has no flag emoji (🇺🇸 shows as "US") and older emoji sets, so on Windows/Linux
// load Google's Noto Color Emoji and put it BEHIND the page's fonts: text looks the same, only emoji change.
// Apple (iPhone/iPad/Mac) and Android keep their own emoji. Google Fonts only sends the emoji actually used.
function gpEmojiSetup() {
  if (typeof window === 'undefined' || document.getElementById('gp-emoji-font')) return;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X|Android/.test(ua)) return;
  const link = document.createElement('link');
  link.id = 'gp-emoji-font'; link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
  document.head.appendChild(link);
  const css = document.createElement('style');
  css.id = 'gp-emoji-css';
  const SANS = "'DM Sans','Noto Color Emoji',sans-serif", SERIF = "'Playfair Display','Noto Color Emoji',serif";
  css.textContent = [
    `body{font-family:${SANS}}`,
    `[style*="font-family"]:not([style*="Playfair"]):not([style*="monospace"]):not([style*="Roboto"]):not([style*="apple-system"]){font-family:${SANS}!important}`,
    `[style*="Playfair"]{font-family:${SERIF}!important}`,
    `button:not([style*="font-family"]),input:not([style*="font-family"]),select,textarea{font-family:${SANS}}`,
  ].join('\n');
  document.head.appendChild(css);
}


// Compute MAJORS dynamically based on current date
// Always shows the NEXT occurrence of each major, sorted soonest first
function getMajors() {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Base schedule (month and day each major happens)
  // Players: 2nd Thursday of March (~Mar 11)
  // Masters: 2nd Thursday of April (~Apr 8)
  // PGA: 3rd Thursday of May (~May 14-21)
  // US Open: 3rd Thursday of June (~Jun 18)
  // The Open: 3rd Thursday of July (~Jul 16)
  const SCHEDULE = [
    { key:'players', label:'The Players',          emoji:'⛳', month:3,  approxDay:11 },
    { key:'masters', label:'The Masters',          emoji:'🌸', month:4,  approxDay:8  },
    { key:'pga',     label:'PGA Championship',     emoji:'🏆', month:5,  approxDay:14 },
    { key:'usopen',  label:'U.S. Open',            emoji:'🇺🇸', month:6,  approxDay:18 },
    { key:'open',    label:'The Open Championship',emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', month:7,  approxDay:16 },
  ];

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // For each major, determine if this year's event is upcoming or past
  // If past, use next year
  const majors = SCHEDULE.map(m => {
    let year = currentYear;
    const thisYearDate = new Date(currentYear, m.month - 1, m.approxDay);
    // Tournament ends Sunday (3 days after Thursday tee time)
    const tournamentEnd = new Date(thisYearDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (now > tournamentEnd) {
      year = currentYear + 1;
    }
    const date = `${MONTH_NAMES[m.month - 1]} ${year}`;
    const sortKey = new Date(year, m.month - 1, m.approxDay).getTime();
    return { ...m, date, year, sortKey };
  }).sort((a, b) => a.sortKey - b.sortKey);

  // Tour modes — always available, follow the current week's event on that tour
  const pgatour = {
    key:'pgatour', label:'PGA Tour Mode', emoji:'🏌️',
    date:'Any weekly event', year:currentYear, sortKey:0,
  };
  const dpworld = {
    key:'dpworld', label:'DP World Tour Mode', emoji:'🌍',
    date:'Any weekly event', year:currentYear, sortKey:0,
  };

  return [...majors, pgatour, dpworld];
}

const MAJORS = getMajors();
const DEFAULT_MAJOR = MAJORS[0].key; // soonest upcoming major


// FINGERPRINT_HOME_CAMPAIGN — the home page hypes whatever's next: each major from the end of the previous
// event through its final round; after The Open, weekly PGA Tour pools; a week before a Cup, the Cup; then
// back to the Masters. Dates confirmed from the 2027 schedule (add the 2028 U.S. Open / Open / Presidents Cup
// here once they're announced).
const GP_EVENTS = [
  ['masters', '2027-04-08', '2027-04-11', 'Augusta National'],
  ['pga',     '2027-05-20', '2027-05-23', 'PGA Frisco'],
  ['usopen',  '2027-06-17', '2027-06-20', 'Pebble Beach'],
  ['open',    '2027-07-15', '2027-07-18', 'The Old Course, St Andrews'],
  ['ryder',   '2027-09-17', '2027-09-19', 'Adare Manor'],
  ['masters', '2028-04-06', '2028-04-09', 'Augusta National'],
  ['pga',     '2028-05-18', '2028-05-21', 'The Olympic Club'],
  ['usopen',  '2028-06-15', '2028-06-18', 'Winged Foot', { headline:'The U.S. Open at Winged Foot.',
    pitch:'Golf’s toughest test on one of its most feared courses. Get your crew’s picks in before Thursday and watch the money move.' }],
  ['open',    '2028-08-03', '2028-08-06', 'Royal Lytham & St Annes', { headline:'The Open at Royal Lytham.',
    pitch:'Golf’s oldest major moves to August for one year only — the Claret Jug, links golf and the perfect excuse for a pool.' }],
  // 2028 Presidents Cup: Kingston Heath, Melbourne — dates not announced yet (Australian editions often run Nov/Dec).
];
const GP_CAMPAIGN = {
  masters: { name:'The Masters', emoji:'🌸', bg:'linear-gradient(160deg,#08331e 0%,#0f5a34 55%,#1f7d47 100%)', accent:'#f4d35e',
    headline:'Your Masters pool starts here.',
    pitch:'Augusta in April — Amen Corner, Sunday roars and a green jacket. Your friends battle for the pot on a live money leaderboard that moves with every shot.' },
  pga: { name:'PGA Championship', emoji:'🏆', bg:'linear-gradient(160deg,#0a1f45 0%,#13336e 60%,#1f4c9c 100%)', accent:'#f0c75e',
    headline:'Your PGA Championship pool.',
    pitch:'The year’s second major, a stacked field and the Wanamaker Trophy. Set up your pool in two minutes and let it run itself.' },
  usopen: { name:'U.S. Open', emoji:'🇺🇸', bg:'linear-gradient(160deg,#0b1f3a 0%,#13315c 60%,#7a1424 130%)', accent:'#ff6b6b',
    headline:'The U.S. Open at Pebble Beach.',
    pitch:'Golf’s toughest test on America’s most beautiful course. Get your crew’s picks in before Thursday and watch the money move.' },
  open: { name:'The Open', emoji:'🏴', bg:'linear-gradient(160deg,#16301f 0%,#2c4a34 60%,#5c4a1e 130%)', accent:'#e9c46a',
    headline:'The Open at St Andrews.',
    pitch:'The home of golf, the Old Course and the Claret Jug. Golf’s oldest major is the perfect excuse for a pool.' },
  ryder: { name:'The Ryder Cup', emoji:'🏆', bg:'linear-gradient(160deg,#0a2a6b 0%,#1a3a8a 50%,#8a1022 120%)', accent:'#f5d77a',
    headline:'The 100th Ryder Cup.',
    pitch:'USA vs Europe at Adare Manor. Pick the winner of every match — pairings post automatically, picks lock at each tee time, and a live cup score tracks it all.' },
  tour: { name:'PGA Tour', emoji:'⛳', bg:'linear-gradient(160deg,#0d1f3c 0%,#18345f 60%,#20467d 100%)', accent:'#c9a84c',
    headline:'Golf every week. A pool every week.',
    pitch:'Run a weekly PGA Tour or DP World Tour pool that rolls to the next event on its own — through the FedEx Cup Playoffs and beyond.' },
};
function gpCampaign(now) {
  const day = (iso) => new Date(iso + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = GP_EVENTS.find(e => day(e[2]) >= today);
  if (!next) return { key:'tour', ...GP_CAMPAIGN.tour };
  const [key, st, en, venue, ov] = next, start = day(st), end = day(en);   // ov = that year's own headline/pitch
  if ((key === 'ryder' || key === 'presidents') && (start - today) / 864e5 > 7) return { key:'tour', ...GP_CAMPAIGN.tour };
  const days = Math.round((start - today) / 864e5);
  const mon = (d) => d.toLocaleString('en-US', { month: 'long' });
  const dates = start.getMonth() === end.getMonth() ? `${mon(start)} ${start.getDate()}–${end.getDate()}` : `${mon(start)} ${start.getDate()} – ${mon(end)} ${end.getDate()}`;
  const countdown = days > 1 ? `${days} days until the first tee` : days === 1 ? 'Tees off tomorrow' : days === 0 ? 'Tees off today' : 'Happening now';
  return { key, ...GP_CAMPAIGN[key], ...(ov || {}), venue, dates, countdown, days };
}

export default function LandingPage() {
  const [step, setStep]     = useState('home');
  useEffect(() => { gpEmojiSetup(); }, []);   // FINGERPRINT_EMOJI_FONT
  useEffect(()=>{ try{ if(!document.getElementById('gp-nozoom')){ const st=document.createElement('style'); st.id='gp-nozoom'; st.textContent='@media (max-width: 700px) and (pointer: coarse){ input, textarea, select { font-size:16px !important; } }'; document.head.appendChild(st); } }catch{} },[]);   // FINGERPRINT_NO_ZOOM — every screen, every text box
  const [form, setForm]     = useState({ poolName:'', commissionerName:'', commissionerEmail:'', adminPassword:'', major:DEFAULT_MAJOR, bypassCode:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const upd = (k,v) => setForm(f => ({...f, [k]:v}));
  // FINGERPRINT_ACCOUNTS_OWNER — making a pool needs an account (shared with the pool pages: same saved sign-in)
  const [token, setToken] = useState(null);
  const [acct, setAcct] = useState(null);
  const [myPools, setMyPools] = useState([]);
  const [freeAvail, setFreeAvail] = useState(true);   // FINGERPRINT_FIRST_POOL_FREE
  const [stats, setStats] = useState(null);            // FINGERPRINT_HOME_STATS — real counts, shown once ≥ 50 players
  useEffect(() => { fetch('/api/auth?stats=1').then(r => r.json()).then(d => { if (d?.ok) setStats(d); }).catch(() => {}); }, []);
  const [providers, setProviders] = useState({ google:false, apple:false });
  const [authMode, setAuthMode] = useState('signup');          // signup | signin | forgot | reset
  const [af, setAf] = useState({ name:'', email:'', phone:'', password:'', code:'' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const authPost = async (body) => (await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })).json();
  const loadPools = (t) => authPost({ action:'my-pools', auth:t }).then(d => { if (d?.ok) { setMyPools(d.pools || []); setFreeAvail(d.freePoolAvailable !== false); } }).catch(()=>{});
  const applySession = (t, u) => { try { localStorage.setItem('tgp_auth', t); } catch {} setToken(t); setAcct(u); loadPools(t); };
  const signOut = () => { try { localStorage.removeItem('tgp_auth'); } catch {} authPost({ action:'signout' }).catch(()=>{}); setToken(null); setAcct(null); setMyPools([]); };
  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(p => setProviders(p || {})).catch(()=>{});
    let t = null; try { t = localStorage.getItem('tgp_auth'); } catch {}
    // always ask: the secure cookie restores a sign-in Safari forgot, and each visit renews it for a year
    authPost({ action:'me', ...(t ? { auth:t } : {}) }).then(d => {
      if (d?.ok && d.token) { try { localStorage.setItem('tgp_auth', d.token); } catch {} setToken(d.token); setAcct(d.user); loadPools(d.token); }
      else if (d?.signedOut && t) { try { localStorage.removeItem('tgp_auth'); } catch {} }
    }).catch(()=>{});
  }, []);
  useEffect(() => { if (acct && step === 'signin') setStep('mypools'); }, [acct, step]);
  useEffect(() => { if (acct && step === 'mypools' && token) loadPools(token); }, [step]);
  const authCall = async (body) => { setAuthBusy(true); setAuthErr('');
    try { const d = await authPost(body); if (d.error) setAuthErr(d.error); return d; } catch { setAuthErr('Connection problem — try again'); return {}; } finally { setAuthBusy(false); } };
  const doAuth = async () => {
    if (authMode === 'signup') { const d = await authCall({ action:'signup', name:af.name, email:af.email, phone:af.phone, password:af.password }); if (d.ok) applySession(d.token, d.user); else if (d.exists) setAuthMode('signin'); }
    else if (authMode === 'signin') { const d = await authCall({ action:'login', email:af.email, password:af.password }); if (d.ok) applySession(d.token, d.user); }
    else if (authMode === 'forgot') { const d = await authCall({ action:'reset-request', email:af.email }); if (d.ok) setAuthMode('reset'); }
    else if (authMode === 'reset') { const d = await authCall({ action:'reset-confirm', email:af.email, code:af.code, password:af.password }); if (d.ok) applySession(d.token, d.user); }
  };
  const startOAuth = async (provider) => {
    const w = window.open('', '_blank');
    const d = await authCall({ action:'oauth-start', provider });
    if (!d.ok) { try { w && w.close(); } catch {} return; }
    if (w) w.location.href = d.url; else { window.location.href = d.url; return; }
    const until = Date.now() + 10*60000; setAuthBusy(true);
    const tick = async () => {
      if (Date.now() > until) { setAuthBusy(false); return setAuthErr('Sign-in timed out — try again'); }
      try { const r = await authPost({ action:'oauth-poll', loginId:d.loginId });
        if (r.ok) { setAuthBusy(false); return applySession(r.token, r.user); }
        if (r.expired) { setAuthBusy(false); return setAuthErr('Sign-in expired — try again'); } } catch {}
      setTimeout(tick, 2000);
    };
    setTimeout(tick, 2000);
  };
  const handleCreate = async () => {
    setError('');
    if (!form.poolName.trim())         return setError('Pool name is required');
    if (!token) return setError('Sign in first');
    setLoading(true);
    try {
      const res = await fetch('/api/create-pool', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, auth: token }),
      });
      const data = await res.json();
      if (data.needAccount) { signOut(); setLoading(false); return; }
      if (!res.ok || data.error) { setError(data.error || 'Failed to create pool'); setLoading(false); return; }
      if (data.free) {
        setResult(data);
        setStep('done');
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };
  const inp = { width:'100%', padding:'11px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
  const pri = { background:'#1a2a5c', color:'#fff', border:'none', borderRadius:8, padding:'12px 24px', fontSize:15, fontWeight:700, cursor:'pointer', width:'100%' };
  if (step === 'done' && result) {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{background:'#fff',borderRadius:16,padding:36,maxWidth:480,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <div style={{fontSize:64,marginBottom:16}}>🎉</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:'#1a2a5c',marginBottom:8}}>Your pool is live!</h2>
          <p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Share this link with your friends to start entering picks:</p>
          <div style={{background:'#f3f4f6',borderRadius:8,padding:'12px 16px',marginBottom:20,wordBreak:'break-all',fontSize:13,fontWeight:600,color:'#1a2a5c'}}>
            {result.poolUrl}
          </div>
          <button type="button" style={{...pri,marginBottom:12}} onClick={()=>navigator.clipboard.writeText(result.poolUrl).then(()=>alert('Copied!'))}>
            📋 Copy Link
          </button>
          {result.joinCode&&<div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#0c4a6e',textAlign:'center'}}>
            <b>Join Code:</b> <span style={{fontFamily:'monospace',fontSize:16,letterSpacing:2}}>{result.joinCode}</span>
            <div style={{fontSize:11,color:'#0369a1',marginTop:3}}>Share this code with people you want to join your pool</div>
          </div>}
          <a href={result.poolUrl} style={{display:'block',textAlign:'center',color:'#1a2a5c',fontSize:14,fontWeight:600,textDecoration:'none',marginTop:8}}>
            Go to your pool →
          </a>
          <div style={{marginTop:20,padding:12,background:'#f0f9ff',borderRadius:8,fontSize:12,color:'#0c4a6e',textAlign:'left',lineHeight:1.5}}>
            You run this pool from your account — open it any time from <b>My pools</b>, and tap your profile for <b>Commissioner settings</b>.
            {form.adminPassword?.trim()&&<><br/><b>Backup admin password</b> (for a co-commissioner): <code style={{background:'#fff',padding:'1px 6px',borderRadius:4}}>{form.adminPassword}</code></>}
          </div>
        </div>
      </div>
    );
  }
  if ((step === 'create' || step === 'signin' || step === 'mypools') && !acct) {
    const f = (k, ph, type='text', ac) => <input key={k} style={{...inp, marginBottom:10}} type={type} autoComplete={ac} placeholder={ph} value={af[k]} onChange={e=>setAf(x=>({...x,[k]:e.target.value}))}/>;
    const lk = (label, mode) => <button type="button" onClick={()=>{setAuthErr('');setAuthMode(mode);}} style={{background:'none',border:'none',color:'#1a2a5c',fontSize:13,textDecoration:'underline',cursor:'pointer',padding:4}}>{label}</button>;
    const social = (p)=>{ const up=authMode==='signup', g=p==='google';
          const label=`${up?'Sign up':'Sign in'} with ${g?'Google':'Apple'}`;
          // FINGERPRINT_BRAND — official button specs. Google: white, 1px #747775 border, #1F1F1F Roboto Medium 14px,
          // full-colour G. Apple: black, white logo + white system-font title at ~43% of the 44px height. The logos are
          // Google's and Apple's OWN files, from their official kits, saved in public/brand/ (.svg or .png).
          const logo=g
            // Google's own light 40x40 button tile (PNG — its SVG gradient doesn't render in Safari images): show its centre 20x20 = the G
            ? <span style={{width:20,height:20,overflow:'hidden',display:'block',flexShrink:0}}><img src="/brand/google-g.png" alt="" width={40} height={40}
                style={{display:'block',margin:-10,maxWidth:'none'}} onError={e=>{e.currentTarget.parentNode.style.display='none';}}/></span>
            // Apple's own logo-only tile ("White" = white logo on black), 44x44: show the 18x20 around the logo,
            // which renders it 15x19 — matching the 19px title, per Apple's guidelines
            : <span style={{width:18,height:20,overflow:'hidden',display:'block',flexShrink:0}}><img src="/brand/apple-logo-white.png" alt="" width={44} height={44}
                style={{display:'block',margin:'-10px 0 0 -13px',maxWidth:'none'}} onError={e=>{e.currentTarget.parentNode.style.display='none';}}/></span>;
          return <button key={p} type="button" disabled={authBusy} onClick={()=>startOAuth(p)} aria-label={label}
            style={g
              ? {display:'flex',alignItems:'center',justifyContent:'center',gap:10,width:'100%',height:44,padding:'0 12px',marginBottom:10,borderRadius:4,border:'1px solid #747775',background:'#FFFFFF',color:'#1F1F1F',fontFamily:"Roboto,Arial,sans-serif",fontWeight:500,fontSize:14,letterSpacing:'0.25px',cursor:'pointer',opacity:authBusy?.6:1,boxSizing:'border-box'}
              : {display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',height:44,padding:'0 12px',marginBottom:10,borderRadius:8,border:'none',background:'#000000',color:'#FFFFFF',fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif",fontWeight:500,fontSize:19,cursor:'pointer',opacity:authBusy?.6:1,boxSizing:'border-box'}}>
            {logo}{label}</button>; };
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=Roboto:wght@500&display=swap" rel="stylesheet"/>
        <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:440,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <button type="button" onClick={()=>setStep('home')} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,marginBottom:16,padding:0}}>← Back</button>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:'#1a2a5c',marginBottom:4}}>
            {authMode==='signin'?'Sign in':authMode==='signup'?'Create your account':'Reset your password'}</h2>
          <p style={{color:'#6b7280',fontSize:13,marginBottom:20}}>{step==='create'?'You\'ll run your pool from your account — no admin password to remember.':'One account for every pool you run or play in.'}</p>
          {authErr&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626',marginBottom:14}}>{authErr}</div>}
          {(authMode==='signup'||authMode==='signin')&&(providers.apple||providers.google)&&<>
            {providers.apple&&social('apple')}
            {providers.google&&social('google')}
            <div style={{textAlign:'center',fontSize:12,color:'#9ca3af',margin:'4px 0 12px'}}>or with email</div></>}
          {authMode==='signup'&&<>{f('name','Your name','text','name')}{f('email','Email','email','email')}{f('phone','Cell number','tel','tel')}{f('password','Password (8+ characters)','password','new-password')}</>}
          {authMode==='signin'&&<>{f('email','Email','email','email')}{f('password','Password','password','current-password')}</>}
          {authMode==='forgot'&&<><p style={{fontSize:13,color:'#6b7280',marginTop:0}}>We'll email you a 6-digit code.</p>{f('email','Email','email','email')}</>}
          {authMode==='reset'&&<><p style={{fontSize:13,color:'#6b7280',marginTop:0}}>Enter the code we emailed to {af.email}, and a new password.</p>{f('code','6-digit code','text','one-time-code')}{f('password','New password (8+ characters)','password','new-password')}</>}
          <button type="button" style={{...pri,opacity:authBusy?.6:1}} disabled={authBusy} onClick={doAuth}>
            {authMode==='signup'?'Create account':authMode==='signin'?'Sign in':authMode==='forgot'?'Send code':'Reset password'}</button>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
            {authMode==='signup'?lk('I already have an account','signin'):authMode==='signin'?<>{lk('Forgot password?','forgot')}{lk('Create an account','signup')}</>:lk('Back to sign in','signin')}
          </div>
        </div>
      </div>
    );
  }
  if (step === 'mypools') {
    const lbl = (m) => m === 'pgatour' ? 'PGA Tour' : m === 'dpworld' ? 'DP World Tour' : m === 'players' ? 'The Players' : m === 'masters' ? 'The Masters' : m === 'pga' ? 'PGA Championship' : m === 'usopen' ? 'U.S. Open' : m === 'open' ? 'The Open' : '';
    const runs = myPools.filter(p => p.owner), plays = myPools.filter(p => !p.owner);
    const row = (pl) => (
      <div key={pl.poolId} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0',borderTop:'1px solid #e5e7eb'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,color:'#1a2a5c',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pl.name}</div>
          <div style={{fontSize:12,color:'#6b7280'}}>{pl.event || lbl(pl.mode)}</div>
        </div>
        {pl.owner&&<a href={`/pool/${pl.poolId}?tab=admin`} style={{fontSize:13,fontWeight:700,color:'#1a2a5c',border:'1.5px solid #1a2a5c',borderRadius:8,padding:'7px 12px',textDecoration:'none',whiteSpace:'nowrap'}}>⚙️ Manage</a>}
        <a href={`/pool/${pl.poolId}`} style={{fontSize:13,fontWeight:700,color:'#fff',background:'#1a2a5c',borderRadius:8,padding:'8px 12px',textDecoration:'none',whiteSpace:'nowrap'}}>Open</a>
      </div>);
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 20px',fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{background:'#fff',borderRadius:16,padding:28,maxWidth:520,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:6}}>
            <button type="button" onClick={()=>setStep('home')} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,padding:0,flex:1,textAlign:'left'}}>← Home</button>
            <button type="button" onClick={()=>{signOut();setStep('home');}} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,textDecoration:'underline'}}>Sign out</button>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:800,color:'#1a2a5c',margin:'4px 0 2px'}}>My pools</h2>
          <p style={{color:'#6b7280',fontSize:13,margin:'0 0 16px',display:'flex',alignItems:'center',gap:8}}>{acct.photo&&<img src={acct.photo} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}} style={{width:24,height:24,borderRadius:'50%',objectFit:'cover'}}/>}<span>Signed in as <b>{acct.name}</b> · {acct.email}</span></p>
          {runs.length>0&&<><div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#9ca3af',textTransform:'uppercase',margin:'8px 0 2px'}}>Pools you run</div>{runs.map(row)}</>}
          {plays.length>0&&<><div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#9ca3af',textTransform:'uppercase',margin:'18px 0 2px'}}>Pools you play in</div>{plays.map(row)}</>}
          {myPools.length===0&&<div style={{textAlign:'center',padding:'20px 0',color:'#6b7280',fontSize:14}}>No pools yet. Create one, or open a pool link a friend sent you — it'll show up here.</div>}
          <button type="button" onClick={()=>setStep('create')} style={{...pri,marginTop:20}}>+ Create a new pool</button>
          <p style={{fontSize:11,color:'#9ca3af',textAlign:'center',marginTop:12,lineHeight:1.5}}>Pools you made before accounts appear here after you open them once while signed in (with the same email).</p>
        </div>
      </div>
    );
  }
  if (step === 'create') {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <button type="button" onClick={()=>setStep('home')} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,marginBottom:16,padding:0}}>← Back</button>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:'#1a2a5c',marginBottom:4}}>Create Your Pool</h2>
          <p style={{color:'#6b7280',fontSize:13,marginBottom:24}}>Set up your private golf pool in 30 seconds.</p>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Pool Name</label>
            <input style={inp} placeholder="e.g. Office Golf Pool" value={form.poolName} onChange={e=>upd('poolName',e.target.value)}/>
          </div>
          <div style={{marginBottom:14,background:'#f3f4f6',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#374151'}}>
            Commissioner: <b>{acct?.name}</b> · {acct?.email}
            <div style={{fontSize:11,color:'#6b7280',marginTop:3}}>You'll manage this pool from your account. <button type="button" onClick={signOut} style={{background:'none',border:'none',color:'#1a2a5c',textDecoration:'underline',cursor:'pointer',fontSize:11,padding:0}}>Not you?</button></div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Backup admin password <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></label>
            <input style={inp} type="password" placeholder="Leave blank unless a co-commissioner needs access" value={form.adminPassword} onChange={e=>upd('adminPassword',e.target.value)}/>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Lets someone run the pool without your account. You never need it yourself.</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Starting Tournament</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {MAJORS.map(m=>(
                <button key={m.key} type="button" onClick={()=>upd('major',m.key)} style={{
                  padding:'10px 12px',borderRadius:8,textAlign:'left',cursor:'pointer',position:'relative',
                  border:`2px solid ${form.major===m.key?'#1a2a5c':'#e5e7eb'}`,
                  background:form.major===m.key?'#eef0f8':'#fff',
                }}>
                  {m.key==='dpworld'&&<div style={{position:'absolute',top:6,right:6,fontSize:8,fontWeight:800,background:'#508cff',color:'#fff',padding:'2px 6px',borderRadius:4,letterSpacing:.5}}>NEW</div>}
                  <div style={{fontSize:18,marginBottom:2}}>{m.emoji}</div>
                  <div style={{fontSize:12,fontWeight:600,color:'#1a2a5c'}}>{m.label}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>{m.date}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Promo / Bypass Code <span style={{fontWeight:400,color:'#9ca3af'}}>(optional)</span></label>
            <input style={inp} placeholder="Enter code if you have one" value={form.bypassCode} onChange={e=>upd('bypassCode',e.target.value)}/>
          </div>
          {error&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626',marginBottom:16}}>{error}</div>}
          <div style={{background:'#f9fafb',borderRadius:8,padding:'12px 14px',marginBottom:20,fontSize:12,color:'#6b7280',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{freeAvail?'Your first pool':'Pool access — one tournament'}</span>
            {freeAvail
              ? <span><span style={{textDecoration:'line-through',color:'#9ca3af',marginRight:8}}>$10</span><span style={{fontWeight:800,color:'#15803d',fontSize:16}}>FREE</span></span>
              : <span style={{fontWeight:700,color:'#1a2a5c',fontSize:16}}>$10</span>}
          </div>
          <button type="button" style={{...pri,opacity:loading?.6:1}} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : freeAvail ? 'Create My Free Pool →' : 'Create Pool & Pay $10 →'}
          </button>
          <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',marginTop:10}}>{freeAvail?'No card needed — your first pool is on us':'Secure payment via Stripe'}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',fontFamily:"'DM Sans',sans-serif",color:'#fff'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {!acct&&<div style={{maxWidth:520,margin:'0 auto',padding:'16px 20px 0',display:'flex',justifyContent:'flex-end'}}>
        <button type="button" onClick={()=>{setAuthErr('');setAuthMode('signin');setStep('signin');}} style={{background:'transparent',color:'#fff',border:'1.5px solid rgba(255,255,255,.6)',borderRadius:8,padding:'7px 14px',fontWeight:700,fontSize:13,cursor:'pointer'}}>Sign in · My pools</button>
      </div>}
      {acct&&<div style={{maxWidth:520,margin:'0 auto',padding:'16px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'rgba(255,255,255,.75)',marginBottom:10}}>
          {acct.photo&&<img src={acct.photo} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';}} style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/>}
          <span style={{flex:1}}>Signed in as <b style={{color:'#fff'}}>{acct.name}</b></span>
          <button type="button" onClick={()=>setStep('mypools')} style={{background:'#fff',color:'#1a2a5c',border:'none',borderRadius:8,padding:'7px 12px',fontWeight:700,fontSize:13,cursor:'pointer'}}>My pools →</button>
          <button type="button" onClick={signOut} style={{background:'none',border:'none',color:'rgba(255,255,255,.75)',textDecoration:'underline',cursor:'pointer',fontSize:13}}>Sign out</button>
        </div>
        {myPools.length>0&&<div style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:12,padding:'6px 14px'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'rgba(255,255,255,.6)',textTransform:'uppercase',padding:'8px 0 4px'}}>My pools</div>
          {myPools.map(pl=><a key={pl.poolId} href={`/pool/${pl.poolId}`} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,.1)',color:'#fff',textDecoration:'none'}}>
            <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pl.name}</span>
              {pl.event&&<span style={{display:'block',fontSize:12,color:'rgba(255,255,255,.6)'}}>{pl.event}</span>}</span>
            {pl.owner&&<span style={{fontSize:10,fontWeight:800,color:'#1a2a5c',background:'#f5d77a',borderRadius:10,padding:'2px 8px'}}>COMMISSIONER</span>}
            <span style={{color:'rgba(255,255,255,.5)'}}>›</span></a>)}
        </div>}
      </div>}
      {/* FINGERPRINT_HOME_CAMPAIGN — the hero hypes the next big event, with a countdown and the free first pool */}
      {(()=>{ const C=gpCampaign(new Date()); const isCup=C.key==='ryder'||C.key==='presidents';
        return <div style={{padding:'26px 16px 44px'}}>
          <div style={{maxWidth:660,margin:'0 auto',borderRadius:22,overflow:'hidden',background:C.bg,boxShadow:'0 24px 70px rgba(0,0,0,.4)',border:`1px solid ${C.accent}55`}}>
            <div style={{padding:'30px 22px 30px',textAlign:'center'}}>
              <div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:'rgba(255,255,255,.6)',marginBottom:16}}>⛳ TUNA GOLF POOL</div>
              {C.dates&&<div style={{display:'inline-block',padding:'6px 14px',borderRadius:20,background:'rgba(0,0,0,.25)',border:`1px solid ${C.accent}88`,color:C.accent,fontSize:11,fontWeight:800,letterSpacing:1.4,textTransform:'uppercase',marginBottom:16}}>
                {C.emoji} {C.name} · {C.dates} · {C.venue}</div>}
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,7vw,48px)',fontWeight:900,lineHeight:1.08,letterSpacing:-1,color:'#fff',margin:'0 0 14px'}}>{C.headline}</h1>
              <p style={{fontSize:17,lineHeight:1.6,color:'rgba(255,255,255,.85)',maxWidth:520,margin:'0 auto 22px'}}>{C.pitch}</p>
              {C.countdown&&<div style={{marginBottom:22}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:C.days>1?44:26,fontWeight:900,color:C.accent,lineHeight:1}}>{C.days>1?C.days:C.countdown}</div>
                {C.days>1&&<div style={{fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(255,255,255,.7)',marginTop:6}}>days until the first tee</div>}
              </div>}
              <button type="button" onClick={()=>setStep('create')} style={{background:C.accent,color:'#14213d',border:'none',borderRadius:12,padding:'17px 38px',fontSize:18,fontWeight:900,cursor:'pointer',boxShadow:`0 8px 28px ${C.accent}66`}}>
                {freeAvail?'Start your free pool ⛳':'Create your pool ⛳'}</button>
              {stats&&stats.players>=50&&<div style={{fontSize:14,fontWeight:700,color:'#fff',marginTop:14,opacity:.92}}>⛳ {stats.players.toLocaleString()} players{stats.pools>=5?` · ${stats.pools.toLocaleString()} pools`:''}</div>}
              <div style={{fontSize:13,color:'rgba(255,255,255,.75)',marginTop:12}}>{freeAvail?<><b style={{color:'#fff'}}>Your first pool is free</b> · Players always join free</>:'$10 per tournament · Players always join free'}</div>
            </div>
            <div style={{background:'rgba(0,0,0,.28)',padding:'14px 20px',textAlign:'center',fontSize:13,lineHeight:1.5,color:'rgba(255,255,255,.88)'}}>
              {isCup
                ? <><b style={{color:C.accent}}>Match pick'em</b> — pick the winner of every match, session by session. Pairings post automatically and everyone gets an email when picks open.</>
                : <><b style={{color:C.accent}}>🎯 New · Live odds</b> — every entry's chance to win the pool, updated as the scores come in.</>}
            </div>
          </div>
          <div style={{textAlign:'center',fontSize:13,color:'rgba(255,255,255,.6)',marginTop:16,lineHeight:1.6}}>
            The majors · PGA Tour · DP World Tour · Presidents Cup &amp; Ryder Cup
          </div>
        </div>; })()}
      <div style={{maxWidth:760,margin:'0 auto',padding:'0 20px 16px',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,marginBottom:6}}>Everything your pool needs</h2>
        <div style={{fontSize:13,opacity:.6,marginBottom:22}}>Players open your link, sign up free in seconds, and they're in — no codes to remember.</div>
      </div>
      <div style={{maxWidth:760,margin:'0 auto',padding:'0 20px 60px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {[
          { emoji:'💰', title:'Live Money Leaderboard', desc:'Real prize-money earnings, updated every 60 seconds and calculated from each event\'s official payout structure' },
          { emoji:'📈', title:'Live Odds', desc:'See every entry’s chance to win the pool, re-simulated thousands of times as the scores come in' },
          { emoji:'🎯', title:'Tiered Picks', desc:'Favorites, contenders and longshots — everyone gets a few stars and has to find some sleepers' },
          { emoji:'🌍', title:'Majors, PGA Tour & DP World', desc:'All four majors and the Players, plus any weekly PGA Tour or DP World Tour event — branded automatically, purses filled in for you' },
          { emoji:'🇺🇸', title:'Presidents Cup & Ryder Cup', desc:'A match pick\'em with auto-posted pairings, matches that lock at their own tee time, pick splits and a live cup score' },
          { emoji:'🏆', title:'Season Standings', desc:'Season-long races for the majors, PGA Tour and DP World — plus every player\'s own career record' },
          { emoji:'👤', title:'One Account', desc:'Players sign in once with Google, Apple or email — their entries, history and winnings follow them' },
          { emoji:'🔔', title:'Notifications & Recaps', desc:'Lock reminders, the cut, round recaps and final results — by phone notification and email' },
          { emoji:'📲', title:'Works Like an App', desc:'Add it to your Home Screen for one-tap access, notifications and dark mode' },
          { emoji:'💸', title:'Pay with Venmo', desc:'Players pay the entry fee in a tap — Venmo opens with the amount and note filled in' },
          { emoji:'📋', title:'Scorecards & Pairings', desc:'Tap any golfer for his photo and hole-by-hole card. Tee times show in your own timezone' },
          { emoji:'💬', title:'Pool Chat', desc:'Built-in trash talk with reactions, @mentions, unread counts and read receipts' },
          { emoji:'📸', title:'Share the Standings', desc:'One tap turns the leaderboard into an image for your group chat' },
          { emoji:'⚡', title:'Runs Itself', desc:'Locks at the first tee, rotates to the next event, archives the results and emails everyone a recap' },
          { emoji:'🔒', title:'Commissioner Tools', desc:'Run it from your account — join codes, payment tracking, late entries, invites and a co-commissioner password' },
          { emoji:'📚', title:'History', desc:'Every event\'s final standings and payouts, archived season by season' },
        ].map(f=>(
          <div key={f.title} style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'18px 16px',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,.1)'}}>
            <div style={{fontSize:26,marginBottom:8}}>{f.emoji}</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{f.title}</div>
            <div style={{fontSize:12,opacity:.65,lineHeight:1.5}}>{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{background:'rgba(0,0,0,.2)',padding:'40px 20px'}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,marginBottom:28}}>How it works</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,textAlign:'center'}}>
            {[
              { n:'1', title:'Create your pool', desc:'Sign in, name it, and choose majors, PGA Tour or DP World Tour' },
              { n:'2', title:'Share the link', desc:'Friends open it, sign up free in seconds and make their picks' },
              { n:'3', title:'Watch & win', desc:'The leaderboard updates live, then the pool rolls on to the next event' },
            ].map(s=>(
              <div key={s.n}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'#c9a84c',color:'#1a2a5c',fontWeight:800,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:12,opacity:.6,lineHeight:1.5}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{textAlign:'center',padding:'60px 20px'}}>
        <button type="button" onClick={()=>setStep('create')} style={{
          background:'#c9a84c',color:'#1a2a5c',border:'none',borderRadius:10,
          padding:'16px 40px',fontSize:17,fontWeight:800,cursor:'pointer',
        }}>
          {freeAvail ? 'Start your free pool ⛳' : 'Get Started — $10 ⛳'}
        </button>
        <div style={{fontSize:12,opacity:.5,marginTop:10}}>Live scores · Updates every 60 seconds</div>
        <div style={{fontSize:11,opacity:.4,marginTop:8}}><a href="/terms" style={{color:'#fff',textDecoration:'none'}}>Terms of Service</a></div>
      </div>
    </div>
  );
}
