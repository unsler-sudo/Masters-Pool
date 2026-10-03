'use client';
import { useState, useEffect } from 'react';

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

export default function LandingPage() {
  const [step, setStep]     = useState('home');
  const [form, setForm]     = useState({ poolName:'', commissionerName:'', commissionerEmail:'', adminPassword:'', major:DEFAULT_MAJOR, bypassCode:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const upd = (k,v) => setForm(f => ({...f, [k]:v}));
  // FINGERPRINT_ACCOUNTS_OWNER — making a pool needs an account (shared with the pool pages: same saved sign-in)
  const [token, setToken] = useState(null);
  const [acct, setAcct] = useState(null);
  const [myPools, setMyPools] = useState([]);
  const [providers, setProviders] = useState({ google:false, apple:false });
  const [authMode, setAuthMode] = useState('signup');          // signup | signin | forgot | reset
  const [af, setAf] = useState({ name:'', email:'', phone:'', password:'', code:'' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const authPost = async (body) => (await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })).json();
  const loadPools = (t) => authPost({ action:'my-pools', auth:t }).then(d => { if (d?.ok) setMyPools(d.pools || []); }).catch(()=>{});
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
          <div style={{marginTop:20,padding:12,background:'#fef3cd',borderRadius:8,fontSize:12,color:'#856404',textAlign:'left'}}>
            <b>Save your admin password:</b> <code style={{background:'#fff',padding:'1px 6px',borderRadius:4}}>{form.adminPassword}</code><br/>
            You'll need this to manage entries and settings.
          </div>
        </div>
      </div>
    );
  }
  if ((step === 'create' || step === 'signin' || step === 'mypools') && !acct) {
    const f = (k, ph, type='text', ac) => <input key={k} style={{...inp, marginBottom:10}} type={type} autoComplete={ac} placeholder={ph} value={af[k]} onChange={e=>setAf(x=>({...x,[k]:e.target.value}))}/>;
    const lk = (label, mode) => <button type="button" onClick={()=>{setAuthErr('');setAuthMode(mode);}} style={{background:'none',border:'none',color:'#1a2a5c',fontSize:13,textDecoration:'underline',cursor:'pointer',padding:4}}>{label}</button>;
    const social = (p, label, bg, fg) => <button key={p} type="button" disabled={authBusy} onClick={()=>startOAuth(p)} style={{width:'100%',padding:12,borderRadius:8,border:'1px solid #d1d5db',background:bg,color:fg,fontSize:15,fontWeight:700,marginBottom:10,cursor:'pointer',opacity:authBusy?.6:1}}>{label}</button>;
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'DM Sans',sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:440,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
          <button type="button" onClick={()=>setStep('home')} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:13,marginBottom:16,padding:0}}>← Back</button>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,color:'#1a2a5c',marginBottom:4}}>
            {authMode==='signin'?'Sign in':authMode==='signup'?'Create your account':'Reset your password'}</h2>
          <p style={{color:'#6b7280',fontSize:13,marginBottom:20}}>{step==='create'?'You\'ll run your pool from your account — no admin password to remember.':'One account for every pool you run or play in.'}</p>
          {authErr&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626',marginBottom:14}}>{authErr}</div>}
          {(authMode==='signup'||authMode==='signin')&&(providers.apple||providers.google)&&<>
            {providers.apple&&social('apple',' Continue with Apple','#000','#fff')}
            {providers.google&&social('google','Continue with Google','#fff','#1f2937')}
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
          <p style={{color:'#6b7280',fontSize:13,margin:'0 0 16px'}}>Signed in as <b>{acct.name}</b> · {acct.email}</p>
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
            <span>Pool access — one major</span>
            <span style={{fontWeight:700,color:'#1a2a5c',fontSize:16}}>$10</span>
          </div>
          <button type="button" style={{...pri,opacity:loading?.6:1}} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Pool & Pay $10 →'}
          </button>
          <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',marginTop:10}}>Secure payment via Stripe</div>
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
      <div style={{textAlign:'center',padding:'80px 20px 60px'}}>
        <div style={{fontSize:56,marginBottom:16}}>⛳</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:42,fontWeight:900,marginBottom:12,letterSpacing:-1}}>
          Tuna Golf Pool
        </h1>
        <p style={{fontSize:18,opacity:.8,maxWidth:520,margin:'0 auto 20px',lineHeight:1.6}}>
          A private golf pool for your friends, office, or group — with a <b style={{color:'#fff'}}>live money leaderboard</b>.
          Play the <b style={{color:'#fff'}}>majors</b>, any <b style={{color:'#fff'}}>PGA Tour</b> or <b style={{color:'#fff'}}>DP World Tour</b> event,
          and now the <b style={{color:'#fff'}}>Presidents Cup &amp; Ryder Cup</b>.
        </p>
        <div style={{maxWidth:440,margin:'0 auto 16px',padding:'12px 18px',background:'linear-gradient(135deg,rgba(80,140,255,.22),rgba(80,140,255,.10))',borderRadius:12,border:'1px solid rgba(120,160,255,.4)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#7aa8ff',letterSpacing:1.5,marginBottom:4,textTransform:'uppercase'}}>🏆 New · Presidents Cup &amp; Ryder Cup</div>
          <div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:4}}>Match Pick'em</div>
          <div style={{fontSize:12,opacity:.8,lineHeight:1.5}}>
            Pick the winner of every match, session by session. Pairings post automatically as they're announced,
            everyone gets an email when picks open, and a live cup score tracks it all.
          </div>
        </div>
        <button type="button" onClick={()=>setStep('create')} style={{
          background:'#c9a84c',color:'#1a2a5c',border:'none',borderRadius:10,
          padding:'16px 40px',fontSize:17,fontWeight:800,cursor:'pointer',
          boxShadow:'0 4px 20px rgba(201,168,76,.4)',
        }}>
          Create Your Pool ⛳
        </button>
        <div style={{fontSize:12,opacity:.5,marginTop:10}}>$10 per major · Renew each tournament · Cancel anytime</div>
      </div>
      <div style={{maxWidth:760,margin:'0 auto',padding:'0 20px 16px',textAlign:'center'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,marginBottom:6}}>Everything your pool needs</h2>
        <div style={{fontSize:13,opacity:.6,marginBottom:22}}>No app to download, no accounts — players just open your link.</div>
      </div>
      <div style={{maxWidth:760,margin:'0 auto',padding:'0 20px 60px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        {[
          { emoji:'💰', title:'Live Money Leaderboard', desc:'Real prize-money earnings, updated every 60 seconds and calculated from each event\'s official payout structure' },
          { emoji:'🎯', title:'Tiered Picks', desc:'Favorites, contenders and longshots — everyone gets a few stars and has to find some sleepers' },
          { emoji:'🌍', title:'Majors, PGA Tour & DP World', desc:'All five majors plus any weekly PGA Tour or DP World Tour event, each branded automatically' },
          { emoji:'🇺🇸', title:'Presidents Cup & Ryder Cup', desc:'A match pick\'em with auto-posted pairings, daily picks, pick splits and a live cup score' },
          { emoji:'📋', title:'Scorecards & Pairings', desc:'Tap any golfer for his photo and hole-by-hole card. Tee times show in your own timezone' },
          { emoji:'💬', title:'Pool Chat', desc:'Built-in trash talk with reactions, unread counts and read receipts' },
          { emoji:'📸', title:'Share the Standings', desc:'One tap turns the leaderboard into an image for your group chat' },
          { emoji:'⚡', title:'Runs Itself', desc:'Locks at the first tee, rotates to the next event, and archives the results' },
          { emoji:'🔒', title:'Commissioner Tools', desc:'Private link and password, join codes, payment tracking and invites for past players' },
          { emoji:'📧', title:'Email Updates', desc:'Entry codes, reminders, and alerts when picks open' },
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
              { n:'1', title:'Create your pool', desc:'Name it, set a password, and choose majors, PGA Tour or DP World Tour' },
              { n:'2', title:'Share the link', desc:'Friends open it, enter their name and make their picks — no account needed' },
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
          Get Started — $10 ⛳
        </button>
        <div style={{fontSize:12,opacity:.5,marginTop:10}}>Powered by DataGolf · Live scores · Updates every 60s</div>
        <div style={{fontSize:11,opacity:.4,marginTop:8}}><a href="/terms" style={{color:'#fff',textDecoration:'none'}}>Terms of Service</a></div>
      </div>
    </div>
  );
}
