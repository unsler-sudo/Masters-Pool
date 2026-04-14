'use client';
import { useState } from 'react';

const MAJOR_NAMES = {
  players:'The Players', masters:'Masters', pga:'PGA Championship',
  usopen:'U.S. Open', open:'The Open',
};

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [data, setData]         = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
                {pools.map((p,i)=>(
                  <tr key={p.poolId} style={{borderBottom:'1px solid #f3f4f6',background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'12px 16px',fontWeight:600,fontSize:13}}>
                      <a href={`/pool/${p.poolId}`} style={{color:'#1a2a5c',textDecoration:'none'}}>{p.poolName}</a>
                      <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>{p.poolId}</div>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:13,color:'#374151'}}>{p.commissionerName}</td>
                    <td style={{padding:'12px 16px',fontSize:12,color:'#6b7280'}}>{p.commissionerEmail}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  );
}
