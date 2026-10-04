'use client';
import { useState, useEffect } from 'react';

const MAJOR_NAMES = {
  players:'The Players', masters:'Masters', pga:'PGA Championship',
  usopen:'U.S. Open', open:'The Open', pgatour:'PGA Tour Event', dpworld:'DP World Tour Event',
};

function EditableCell({ value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (val === (value || '')) { setEditing(false); return; }
    setSaving(true);
    await onSave(val);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e=>setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape'){setVal(value||'');setEditing(false);}}}
        disabled={saving}
        placeholder={placeholder}
        style={{padding:'4px 6px',border:'1px solid #2563eb',borderRadius:4,fontSize:12,width:'100%',outline:'none'}}
      />
    );
  }

  return (
    <span onClick={()=>setEditing(true)} style={{cursor:'pointer',display:'inline-block',padding:'2px 4px',borderRadius:3,minWidth:60}} title="Click to edit">
      {value || <span style={{color:'#cbd5e1',fontStyle:'italic'}}>{placeholder||'(empty)'}</span>}
    </span>
  );
}

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [data, setData]         = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pgaTourEvent, setPgaTourEvent] = useState(null);
  // FINGERPRINT_PLAYERS — master list of player accounts
  const [users, setUsers] = useState(null);
  const [userQ, setUserQ] = useState('');
  // FINGERPRINT_BROADCAST — announcements
  const [bInfo, setBInfo] = useState(null);
  const [bf, setBf] = useState({ audience:'everyone', subject:'', message:'', buttonText:'', buttonUrl:'', test:'' });
  const [bBusy, setBBusy] = useState(false);
  const [bNote, setBNote] = useState('');
  const loadBInfo = () => fetch('/api/admin-pools', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password, action:'broadcast-info' }) })
    .then(r => r.json()).then(d => { if (d?.ok) setBInfo(d); }).catch(() => {});
  useEffect(() => { if (authed) loadBInfo(); }, [authed]);
  const sendB = async (test) => {
    if (!test) {
      const n = bInfo?.counts?.[bf.audience] ?? 0;
      const who = { commissioners:'commissioners', players:'players', everyone:'people' }[bf.audience];
      if (!window.confirm(`Send "${bf.subject}" to ${n} ${who}?\n\nThis can't be undone.`)) return;
    }
    setBBusy(true); setBNote('');
    try {
      const d = await fetch('/api/admin-pools', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ password, action:'broadcast', ...bf, test: test ? bf.test : undefined }) }).then(r => r.json());
      if (d.error) setBNote('⚠️ ' + d.error);
      else if (test) setBNote(d.sent ? `✓ Test sent to ${bf.test}` : '⚠️ The test didn’t send');
      else { setBNote(`✓ Sent to ${d.sent}${d.skipped ? ` (${d.skipped} unsubscribed, skipped)` : ''}`); setBf(f => ({ ...f, subject:'', message:'', buttonText:'', buttonUrl:'' })); loadBInfo(); }
    } catch { setBNote('⚠️ Connection problem — try again'); }
    setBBusy(false);
  };
  useEffect(() => {
    if (!authed) return;
    fetch('/api/admin-pools', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password, action:'list-users' }) })
      .then(r => r.json()).then(d => setUsers(d?.ok ? d.users : [])).catch(() => setUsers([]));
  }, [authed]);
  const exportUsers = () => {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Name','Email','Cell','Sign-in','Joined','Last on','Pools run','Pools played']].concat((users || []).map(u => [
      u.name, u.email, u.phone, [u.password&&'Password', u.google&&'Google', u.apple&&'Apple'].filter(Boolean).join(' + '),
      u.created ? u.created.slice(0,10) : '', u.seen ? u.seen.slice(0,10) : '',
      u.pools.filter(x => x.owner).map(x => x.name).join('; '), u.pools.filter(x => !x.owner).map(x => x.name).join('; ')]));
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tuna-golf-pool-players-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // Auto-fetch current PGA Tour event for purse helper
  useEffect(() => {
    if (!authed) return;
    const slugify = (n) => n.toLowerCase()
      .replace(/&/g,'and').replace(/[^a-z0-9\s-]/g,'')
      .replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    (async () => {
      try {
        const ptRes = await fetch('/api/scores?endpoint=pre-tournament');
        if (!ptRes.ok) return;
        const ptData = await ptRes.json();
        const eventName = ptData.event_name || '';
        if (!eventName) return;
        // Get event_id from schedule for URL
        const year = new Date().getFullYear();
        const schedRes = await fetch(`/api/scores?endpoint=schedule&season=${year}`);
        if (!schedRes.ok) return;
        const schedData = await schedRes.json();
        const events = schedData.schedule || schedData.events || [];
        const ev = events.find(e => (e.event_name||'').toLowerCase() === eventName.toLowerCase());
        const url = ev
          ? `https://www.pgatour.com/tournaments/${year}/${slugify(eventName)}/R${year}${String(ev.event_id).padStart(3,'0')}/overview`
          : null;
        setPgaTourEvent({ name: eventName, url });
      } catch {}
    })();
  }, [authed]);

  const login = async () => {
    setLoading(true); setError('');
    const res = await fetch('/api/admin-pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const d = await res.json();
    if (d.error) { setError(d.error); setLoading(false); return; }
    setData(d);
    setAuthed(true);
    setLoading(false);
  };

  const inp = { padding:'10px 14px', borderRadius:8, border:'1px solid #d1d5db', fontSize:14, outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box' };
  const pri = { background:'#1a2a5c', color:'#fff', border:'none', borderRadius:8, padding:'11px 24px', fontSize:14, fontWeight:700, cursor:'pointer' };

  if (!authed) return (
    <div style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
      <div style={{background:'#fff',borderRadius:12,padding:32,width:360,boxShadow:'0 4px 20px rgba(0,0,0,.08)'}}>
        <h2 style={{color:'#1a2a5c',marginBottom:20,fontSize:20,fontWeight:700}}>⛳ Platform Admin</h2>
        <input style={{...inp,marginBottom:12}} type="password" placeholder="Admin password" value={password}
          onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
        {error&&<div style={{color:'#dc2626',fontSize:13,marginBottom:10}}>{error}</div>}
        <button style={{...pri,width:'100%'}} onClick={login} disabled={loading}>
          {loading?'Loading...':'Sign In'}
        </button>
      </div>
    </div>
  );

  const { pools, stats } = data;

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',fontFamily:'sans-serif',padding:'32px 24px'}}>
      <div style={{maxWidth:1000,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
          <h1 style={{color:'#1a2a5c',fontSize:24,fontWeight:800,margin:0}}>⛳ Tuna Golf Pool — Admin</h1>
          <a href="/" style={{fontSize:13,color:'#6b7280',textDecoration:'none'}}>← Back to site</a>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
          {[
            { label:'Total Pools',   value: stats.totalPools,         color:'#1a2a5c' },
            { label:'Paid Pools',    value: stats.paidPools,          color:'#2d7a1e' },
            { label:'Total Revenue', value: `$${stats.totalRevenue}`, color:'#b8960c' },
          ].map(s=>(
            <div key={s.label} style={{background:'#fff',borderRadius:10,padding:'20px 24px',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{fontSize:12,color:'#6b7280',fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:.5}}>{s.label}</div>
              <div style={{fontSize:32,fontWeight:800,color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tournament Purses */}
        <div style={{background:'#fff',borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)',padding:'16px 20px',marginBottom:28}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:700,color:'#1a2a5c',fontSize:15}}>💰 Tournament Purses</div>
            <div style={{fontSize:11,color:'#9ca3af'}}>Update annually for majors · weekly for PGA Tour events</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12}}>
            {[
              {key:'players', label:'⛳ Players',   year:'2027', defaultPurse:data.purses?.players  ?? 25000000},
              {key:'masters', label:'🌸 Masters',   year:'2026', defaultPurse:data.purses?.masters  ?? 22500000},
              {key:'pga',     label:'🏆 PGA',       year:'2026', defaultPurse:data.purses?.pga      ?? 20500000},
              {key:'usopen',  label:'🇺🇸 US Open',   year:'2026', defaultPurse:data.purses?.usopen   ?? 22500000},
              {key:'open',    label:'🏴 The Open',  year:'2026', defaultPurse:data.purses?.open     ?? 17750000},
              {key:'pgatour', label:'🏌️ PGA Tour',  year:'Current Event', defaultPurse:data.purses?.pgatour ?? 9000000},
              {key:'dpworld', label:'🌍 DP World',  year:'Current Event', defaultPurse:data.purses?.dpworld ?? 3750000},
            ].map(major=>(
              <div key={major.key} style={{padding:'10px 12px',background:'#f9fafb',borderRadius:8,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>{major.label}</div>
                <div style={{fontSize:10,color:'#9ca3af',marginBottom:6}}>{major.year === 'Current Event' ? major.year : `${major.year} Purse`}</div>
                {major.key === 'pgatour' && pgaTourEvent && (
                  <div style={{marginBottom:6,padding:'6px 8px',background:'#eff6ff',borderRadius:5,border:'1px solid #bfdbfe'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#1e40af',marginBottom:2}}>{pgaTourEvent.name}</div>
                    {pgaTourEvent.url && (
                      <a href={pgaTourEvent.url} target="_blank" rel="noopener noreferrer"
                         style={{fontSize:9,color:'#2563eb',textDecoration:'underline',display:'block',wordBreak:'break-all'}}>
                        📋 Look up purse on pgatour.com →
                      </a>
                    )}
                  </div>
                )}
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{fontSize:13,color:'#6b7280'}}>$</span>
                  <input
                    type="number"
                    defaultValue={major.defaultPurse}
                    onBlur={async e=>{
                      const newPurse=parseInt(e.target.value,10);
                      if(!newPurse||newPurse===major.defaultPurse)return;
                      const res=await fetch('/api/admin-pools',{method:'POST',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({password,action:'set-purse',major:major.key,purse:newPurse})});
                      const d=await res.json();
                      if(d.ok)setData(prev=>({...prev,purses:{...(prev.purses||{}),[major.key]:newPurse}}));
                    }}
                    onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}}
                    style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:5,fontSize:13,fontWeight:600,outline:'none'}}
                  />
                </div>
                <div style={{fontSize:10,color:'#9ca3af',marginTop:3}}>= ${((major.defaultPurse)/1000000).toFixed(1)}M</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pools table */}
        <div style={{background:'#fff',borderRadius:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',fontWeight:700,color:'#1a2a5c',fontSize:15}}>
            All Pools ({pools.length})
          </div>
          {pools.length===0
            ?<div style={{padding:32,textAlign:'center',color:'#9ca3af'}}>No pools yet</div>
            :<table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#f9fafb'}}>
                  {['Pool Name','Commissioner','Email','Major','Entries','Status','Created',''].map(h=>(
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:.5,borderBottom:'1px solid #e5e7eb'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pools.map((p,i)=>{
                  const updateField=async(field,value)=>{
                    await fetch('/api/admin-pools',{method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({password,action:'update-meta',poolId:p.poolId,field,value})});
                    setData(d=>({...d,pools:d.pools.map(x=>x.poolId===p.poolId?{...x,[field]:value}:x)}));
                  };
                  return(
                  <tr key={p.poolId} style={{borderBottom:'1px solid #f3f4f6',background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'12px 16px',fontWeight:600,fontSize:13}}>
                      <a href={`/pool/${p.poolId}`} style={{color:'#1a2a5c',textDecoration:'none'}}>{p.poolName}</a>
                      <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>{p.poolId}</div>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'#374151'}}>
                      <EditableCell value={p.commissionerName} placeholder="Add name" onSave={v=>updateField('commissionerName',v)}/>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#6b7280'}}>
                      <EditableCell value={p.commissionerEmail} placeholder="Add email" onSave={v=>updateField('commissionerEmail',v)}/>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#374151'}}>{MAJOR_NAMES[p.major]||p.major}</td>
                    <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'#1a2a5c',textAlign:'center'}}>{p.entryCount}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,
                        background:p.paid?'#d1fae5':'#fee2e2',color:p.paid?'#065f46':'#991b1b'}}>
                        {p.paid?'✓ Paid':'Unpaid'}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:11,color:'#9ca3af'}}>
                      {new Date(p.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}<br/>
                      <span style={{fontSize:10}}>{new Date(p.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <button type="button" onClick={async()=>{
                        if(!confirm(`Delete "${p.poolName}"? This cannot be undone.`)) return;
                        await fetch('/api/admin-pools',{method:'POST',headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({password,action:'delete',poolId:p.poolId})});
                        setData(d=>({...d,pools:d.pools.filter(x=>x.poolId!==p.poolId),
                          stats:{...d.stats,totalPools:d.stats.totalPools-1,
                            paidPools:d.stats.paidPools-(p.paid?1:0),
                            totalRevenue:d.stats.totalRevenue-(p.paid?10:0)}}));
                      }} style={{background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:6,
                        padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                        Delete
                      </button>
                    </td>
                  </tr>);
                })}
              </tbody>
            </table>
          }
        </div>

        {/* FINGERPRINT_BROADCAST — email commissioners, players, or everyone */}
        <div style={{background:'#fff',borderRadius:12,padding:20,marginTop:20,boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>
          <h2 style={{color:'#1a2a5c',fontSize:18,fontWeight:800,margin:'0 0 12px'}}>📣 Email</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            {[['commissioners','Commissioners'],['players','All players'],['everyone','Everyone']].map(([k,l]) =>
              <button key={k} type="button" onClick={()=>setBf(f=>({...f,audience:k}))} style={{padding:'8px 14px',borderRadius:20,fontSize:13,fontWeight:700,cursor:'pointer',
                border:`1.5px solid ${bf.audience===k?'#1a2a5c':'#d1d5db'}`,background:bf.audience===k?'#1a2a5c':'#fff',color:bf.audience===k?'#fff':'#374151'}}>
                {l}{bInfo?` · ${bInfo.counts[k]}`:''}</button>)}
          </div>
          <input value={bf.subject} onChange={e=>setBf(f=>({...f,subject:e.target.value}))} placeholder="Subject" style={{...inp,marginBottom:8}}/>
          <textarea value={bf.message} onChange={e=>setBf(f=>({...f,message:e.target.value}))} placeholder={"Message — starts with \"Hi [first name],\" automatically"} rows={6} style={{...inp,marginBottom:8,resize:'vertical',lineHeight:1.5}}/>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <input value={bf.buttonText} onChange={e=>setBf(f=>({...f,buttonText:e.target.value}))} placeholder="Button text (optional)" style={{...inp,flex:'1 1 160px',width:'auto'}}/>
            <input value={bf.buttonUrl} onChange={e=>setBf(f=>({...f,buttonUrl:e.target.value}))} placeholder="Button link — https://…" style={{...inp,flex:'2 1 240px',width:'auto'}}/>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <input value={bf.test} onChange={e=>setBf(f=>({...f,test:e.target.value}))} placeholder="Your email, for a test" style={{...inp,flex:'1 1 200px',width:'auto'}}/>
            <button type="button" disabled={bBusy||!bf.test||!bf.subject||!bf.message} onClick={()=>sendB(true)}
              style={{...pri,background:'#fff',color:'#1a2a5c',border:'1.5px solid #1a2a5c',padding:'10px 16px',opacity:(bBusy||!bf.test||!bf.subject||!bf.message)?.5:1}}>Send test</button>
            <button type="button" disabled={bBusy||!bf.subject||!bf.message} onClick={()=>sendB(false)}
              style={{...pri,padding:'10px 16px',opacity:(bBusy||!bf.subject||!bf.message)?.5:1}}>{bBusy?'Sending…':`Send to ${bInfo?.counts?.[bf.audience] ?? '…'}`}</button>
          </div>
          {bNote&&<div style={{marginTop:10,fontSize:13,color:bNote.startsWith('✓')?'#15803d':'#b91c1c'}}>{bNote}</div>}
          <div style={{fontSize:11,color:'#9ca3af',marginTop:10,lineHeight:1.5}}>Everyone gets their own copy with an unsubscribe link at the bottom.
            {bInfo?.unsubscribed?` ${bInfo.unsubscribed} ${bInfo.unsubscribed===1?'person has':'people have'} unsubscribed and will be skipped.`:''} Unsubscribing only stops these announcements — never pool emails.</div>
          {bInfo?.log?.length>0&&<div style={{marginTop:14}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>Recent</div>
            {bInfo.log.map((l,i)=><div key={i} style={{fontSize:13,color:'#374151',padding:'5px 0',borderTop:'1px solid #f3f4f6'}}>
              <span style={{color:'#6b7280'}}>{new Date(l.at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span> · <b>{l.subject}</b> · {{commissioners:'Commissioners',players:'All players',everyone:'Everyone'}[l.audience]} · {l.sent} sent</div>)}
          </div>}
        </div>

        {/* FINGERPRINT_PLAYERS — every player account */}
        <div style={{background:'#fff',borderRadius:12,padding:20,marginTop:20,boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>
          {(() => {
            const q = userQ.trim().toLowerCase();
            const list = (users || []).filter(u => !q || [u.name,u.email,u.phone,...u.pools.map(x=>x.name)].join(' ').toLowerCase().includes(q));
            const day = (iso) => iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
            const ago = (iso) => { if (!iso) return '—'; const d = (Date.now() - Date.parse(iso)) / 864e5; return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${Math.floor(d)} days ago` : day(iso); };
            const fmtPhone = (p) => /^\+1\d{10}$/.test(p) ? `(${p.slice(2,5)}) ${p.slice(5,8)}-${p.slice(8)}` : p;
            return <>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12}}>
                <h2 style={{color:'#1a2a5c',fontSize:18,fontWeight:800,margin:0,flex:1}}>👥 Players {users ? `(${users.length})` : ''}</h2>
                <input value={userQ} onChange={e=>setUserQ(e.target.value)} placeholder="Search name, email, cell or pool" style={{...inp,width:260}}/>
                <button type="button" onClick={exportUsers} disabled={!users?.length} style={{...pri,padding:'10px 16px',opacity:users?.length?1:.5}}>⬇ Export CSV</button>
              </div>
              {!users ? <div style={{color:'#6b7280',fontSize:14,padding:'12px 0'}}>Loading players…</div>
              : list.length === 0 ? <div style={{color:'#6b7280',fontSize:14,padding:'12px 0'}}>{users.length ? 'No players match that search.' : 'No player accounts yet.'}</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead><tr style={{textAlign:'left',color:'#6b7280',fontSize:11,textTransform:'uppercase',letterSpacing:.5}}>
                      {['Player','Cell','Sign-in','Joined','Last on','Pools'].map(h=><th key={h} style={{padding:'8px 10px',borderBottom:'2px solid #e5e7eb',whiteSpace:'nowrap'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>{list.map(u => <tr key={u.uid} style={{borderBottom:'1px solid #f3f4f6',verticalAlign:'top'}}>
                      <td style={{padding:'10px'}}><div style={{fontWeight:700,color:'#1a2a5c'}}>{u.name}</div><a href={`mailto:${u.email}`} style={{color:'#6b7280',textDecoration:'none'}}>{u.email}</a></td>
                      <td style={{padding:'10px',whiteSpace:'nowrap'}}>{u.phone ? <a href={`tel:${u.phone}`} style={{color:'#374151',textDecoration:'none'}}>{fmtPhone(u.phone)}</a> : <span style={{color:'#d97706'}}>missing</span>}</td>
                      <td style={{padding:'10px',whiteSpace:'nowrap',color:'#374151'}}>{[u.password&&'Password',u.google&&'Google',u.apple&&'Apple'].filter(Boolean).join(' · ')||'—'}</td>
                      <td style={{padding:'10px',whiteSpace:'nowrap',color:'#374151'}}>{day(u.created)}</td>
                      <td style={{padding:'10px',whiteSpace:'nowrap',color:'#374151'}}>{ago(u.seen)}</td>
                      <td style={{padding:'10px'}}>{u.pools.length ? u.pools.map(x => <a key={x.poolId} href={`/pool/${x.poolId}`} target="_blank" rel="noreferrer"
                          style={{display:'inline-block',margin:'0 4px 4px 0',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700,textDecoration:'none',
                            background:x.owner?'#fff3d6':'#eef2ff',color:x.owner?'#7a5500':'#1a2a5c'}}>{x.owner?'★ ':''}{x.name}</a>) : <span style={{color:'#9ca3af'}}>—</span>}</td>
                    </tr>)}</tbody>
                  </table>
                  <div style={{fontSize:11,color:'#9ca3af',marginTop:8}}>★ = runs that pool. "Last on" updates at most every few hours.</div>
                </div>}
            </>;
          })()}
        </div>
      </div>
    </div>
  );
}
