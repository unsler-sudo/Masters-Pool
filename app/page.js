'use client';
import { useState } from 'react';

const MAJORS = [
  { key:'masters', label:'The Masters',          emoji:'🌸', date:'Apr 2027' },
  { key:'pga',     label:'PGA Championship',     emoji:'🏆', date:'May 2026' },
  { key:'usopen',  label:'U.S. Open',            emoji:'🇺🇸', date:'Jun 2026' },
  { key:'open',    label:'The Open Championship',emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', date:'Jul 2026' },
  { key:'players', label:'The Players',          emoji:'⛳', date:'Mar 2027' },
];

export default function LandingPage() {
  const [step, setStep]     = useState('home'); // home | create | paying | done
  const [form, setForm]     = useState({ poolName:'', commissionerName:'', adminPassword:'', major:'pga', bypassCode:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const upd = (k,v) => setForm(f => ({...f, [k]:v}));

  const handleCreate = async () => {
    setError('');
    if (!form.poolName.trim())         return setError('Pool name is required');
    if (!form.commissionerName.trim()) return setError('Your name is required');
    if (!form.adminPassword.trim())    return setError('Admin password is required');
    setLoading(true);
    try {
      const res = await fetch('/api/create-pool', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || 'Failed to create pool'); setLoading(false); return; }

      if (data.free) {
        // Bypass code used — pool is immediately active
        setResult(data);
        setStep('done');
      } else if (data.checkoutUrl) {
        // Redirect to Stripe
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
            <input style={inp} placeholder="e.g. Office Golf Pool 2026" value={form.poolName} onChange={e=>upd('poolName',e.target.value)}/>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Your Name (Commissioner)</label>
            <input style={inp} placeholder="e.g. John Smith" value={form.commissionerName} onChange={e=>upd('commissionerName',e.target.value)}/>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Admin Password</label>
            <input style={inp} type="password" placeholder="Choose a password for managing entries" value={form.adminPassword} onChange={e=>upd('adminPassword',e.target.value)}/>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Save this — you'll need it to lock entries and manage the pool</div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,fontWeight:600,color:'#374151',display:'block',marginBottom:5}}>Starting Major</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {MAJORS.map(m=>(
                <button key={m.key} type="button" onClick={()=>upd('major',m.key)} style={{
                  padding:'10px 12px',borderRadius:8,textAlign:'left',cursor:'pointer',
                  border:`2px solid ${form.major===m.key?'#1a2a5c':'#e5e7eb'}`,
                  background:form.major===m.key?'#eef0f8':'#fff',
                }}>
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

  // Home / landing
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0a1a3a 0%,#1a2a5c 50%,#243475 100%)',fontFamily:"'DM Sans',sans-serif",color:'#fff'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Hero */}
      <div style={{textAlign:'center',padding:'80px 20px 60px'}}>
        <div style={{fontSize:56,marginBottom:16}}>⛳</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:42,fontWeight:900,marginBottom:12,letterSpacing:-1}}>
          Tuna Golf Pool
        </h1>
        <p style={{fontSize:18,opacity:.75,maxWidth:480,margin:'0 auto 36px',lineHeight:1.6}}>
          Create a private golf pool for your friends, office, or group. Pick 9 golfers across 3 tiers and track live earnings during every major.
        </p>
        <button type="button" onClick={()=>setStep('create')} style={{
          background:'#c9a84c',color:'#1a2a5c',border:'none',borderRadius:10,
          padding:'16px 40px',fontSize:17,fontWeight:800,cursor:'pointer',
          boxShadow:'0 4px 20px rgba(201,168,76,.4)',
        }}>
          Create Your Pool — $10 ⛳
        </button>
        <div style={{fontSize:12,opacity:.5,marginTop:10}}>$10 per major · Renew each tournament · Cancel anytime</div>
      </div>

      {/* Features */}
      <div style={{maxWidth:700,margin:'0 auto',padding:'0 20px 60px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
        {[
          { emoji:'🏆', title:'Live Standings', desc:'Real-time earnings from DataGolf updated every 60 seconds' },
          { emoji:'🎯', title:'3-Tier Picks', desc:'2 Favorites + 4 Contenders + 3 Longshots = 9 total picks' },
          { emoji:'📊', title:'All 4 Majors', desc:'Masters, PGA, US Open, The Open — auto-rotates between each' },
          { emoji:'🔒', title:'Private Pool', desc:'Your own link, your own password, invite only who you want' },
          { emoji:'⚡', title:'Fully Automated', desc:'Auto-locks at tee time, auto-rotates Tuesday after each major' },
          { emoji:'📚', title:'Past Results', desc:'Final standings archived after every tournament' },
        ].map(f=>(
          <div key={f.title} style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'20px 18px',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,.1)'}}>
            <div style={{fontSize:28,marginBottom:8}}>{f.emoji}</div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{f.title}</div>
            <div style={{fontSize:12,opacity:.65,lineHeight:1.5}}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{background:'rgba(0,0,0,.2)',padding:'40px 20px'}}>
        <div style={{maxWidth:600,margin:'0 auto',textAlign:'center'}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:800,marginBottom:28}}>How it works</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,textAlign:'center'}}>
            {[
              { n:'1', title:'Create your pool', desc:'Name it, set a password, pick your starting major' },
              { n:'2', title:'Share the link', desc:'Send your pool URL to friends — they pick 9 golfers' },
              { n:'3', title:'Watch & win', desc:'Live earnings update every 60s during the tournament' },
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

      {/* CTA */}
      <div style={{textAlign:'center',padding:'60px 20px'}}>
        <button type="button" onClick={()=>setStep('create')} style={{
          background:'#c9a84c',color:'#1a2a5c',border:'none',borderRadius:10,
          padding:'16px 40px',fontSize:17,fontWeight:800,cursor:'pointer',
        }}>
          Get Started — $10 ⛳
        </button>
        <div style={{fontSize:12,opacity:.5,marginTop:10}}>Powered by DataGolf · Live scores · Real prize payouts</div>
      </div>
    </div>
  );
}
