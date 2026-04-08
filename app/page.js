'use client';
import { useState, useEffect, useRef } from 'react';

const TOURNAMENT = { name: 'The Masters 2026', purse: 21000000 };
const TIERS = [
  { id: 1, name: 'Group A — Favorites', color: '#b8960c', picks: 3 },
  { id: 2, name: 'Group B — Contenders', color: '#2d5016', picks: 3 },
  { id: 3, name: 'Group C — Longshots', color: '#555', picks: 3 },
];
const TOTAL_PICKS = 9;

const PAYOUT={1:.20,2:.109,3:.069,4:.049,5:.041,6:.03625,7:.03375,8:.03125,9:.02925,10:.02725,11:.02525,12:.02325,13:.02125,14:.01925,15:.01825,16:.01725,17:.01625,18:.01525,19:.01425,20:.01325,21:.01225,22:.01125,23:.01045,24:.00965,25:.00885,26:.00805,27:.00775,28:.00745,29:.00715,30:.00685,31:.00655,32:.00625,33:.00595,34:.0057,35:.00545,36:.0052,37:.00495,38:.00475,39:.00455,40:.00435,41:.00415,42:.00395,43:.00375,44:.00355,45:.00335,46:.00315,47:.00295,48:.00279,49:.00265,50:.00257,51:.00251,52:.00245,53:.00241,54:.00237,55:.00235,56:.00233,57:.00231,58:.00229,59:.00227,60:.00225,61:.00223,62:.00221,63:.00219,64:.00217,65:.00215};

const fmt=n=>'$'+Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
const parsePos=s=>{if(!s||s==='-'||/CUT|WD|DQ|MC/i.test(s))return null;return parseInt(String(s).replace('T',''),10);};
const flip=n=>n.includes(', ')?n.split(', ').reverse().join(' '):n;

function calcEarnings(players){
  const g={};players.forEach(p=>{const pos=parsePos(p.pos);if(pos&&pos<=65){if(!g[pos])g[pos]=[];g[pos].push(p.name);}});
  const m={};Object.entries(g).forEach(([ps,pls])=>{const pos=+ps;let t=0;for(let i=0;i<pls.length;i++)t+=PAYOUT[pos+i]||0;const e=Math.round(t/pls.length*TOURNAMENT.purse);pls.forEach(n=>{m[n]=e;});});
  return m;
}

const SEED_FIELD = [
  {name:'Scheffler, Scottie',country:'USA',odds:'+500',tier:1},{name:'Rahm, Jon',country:'ESP',odds:'+900',tier:1},
  {name:'DeChambeau, Bryson',country:'USA',odds:'+1100',tier:1},{name:'McIlroy, Rory',country:'NIR',odds:'+1200',tier:1},
  {name:'Schauffele, Xander',country:'USA',odds:'+1500',tier:1},{name:'Aberg, Ludvig',country:'SWE',odds:'+1700',tier:1},
  {name:'Fitzpatrick, Matt',country:'ENG',odds:'+1800',tier:1},{name:'Morikawa, Collin',country:'USA',odds:'+2000',tier:1},
  {name:'Fleetwood, Tommy',country:'ENG',odds:'+2200',tier:1},{name:'Young, Cameron',country:'USA',odds:'+2300',tier:1},
  {name:'Hovland, Viktor',country:'NOR',odds:'+2500',tier:1},{name:'Hatton, Tyrrell',country:'ENG',odds:'+2500',tier:1},
  {name:'MacIntyre, Robert',country:'SCO',odds:'+2500',tier:1},{name:'Cantlay, Patrick',country:'USA',odds:'+2800',tier:1},
  {name:'Gotterup, Chris',country:'USA',odds:'+2800',tier:1},
  {name:'Burns, Sam',country:'USA',odds:'+3000',tier:2},{name:'Koepka, Brooks',country:'USA',odds:'+3700',tier:2},
  {name:'Smith, Cameron',country:'AUS',odds:'+4000',tier:2},{name:'Thomas, Justin',country:'USA',odds:'+4000',tier:2},
  {name:'Spieth, Jordan',country:'USA',odds:'+4000',tier:2},{name:'Rose, Justin',country:'ENG',odds:'+4500',tier:2},
  {name:'Conners, Corey',country:'CAN',odds:'+4500',tier:2},{name:'Matsuyama, Hideki',country:'JPN',odds:'+4500',tier:2},
  {name:'Clark, Wyndham',country:'USA',odds:'+5000',tier:2},{name:'Lowry, Shane',country:'IRL',odds:'+5000',tier:2},
  {name:'Knapp, Jake',country:'USA',odds:'+5000',tier:2},{name:'Bhatia, Akshay',country:'USA',odds:'+5500',tier:2},
  {name:'Im, Sungjae',country:'KOR',odds:'+5500',tier:2},{name:'English, Harris',country:'USA',odds:'+5500',tier:2},
  {name:'Kim, Si Woo',country:'KOR',odds:'+6000',tier:2},{name:'Kitayama, Kurt',country:'USA',odds:'+6000',tier:2},
  {name:'Straka, Sepp',country:'AUT',odds:'+6000',tier:2},{name:'Henley, Russell',country:'USA',odds:'+6500',tier:2},
  {name:'Scott, Adam',country:'AUS',odds:'+6500',tier:2},{name:'Homa, Max',country:'USA',odds:'+7000',tier:2},
  {name:'Day, Jason',country:'AUS',odds:'+7000',tier:2},{name:'Novak, Andrew',country:'USA',odds:'+7000',tier:2},
  {name:'Fox, Ryan',country:'NZL',odds:'+7500',tier:2},{name:'Spaun, J.J.',country:'USA',odds:'+7500',tier:2},
  {name:'Harman, Brian',country:'USA',odds:'+8000',tier:2},
  {name:'Griffin, Ben',country:'USA',odds:'+8500',tier:3},{name:'McNealy, Maverick',country:'USA',odds:'+9000',tier:3},
  {name:'Bradley, Keegan',country:'USA',odds:'+9000',tier:3},{name:'Woodland, Gary',country:'USA',odds:'+10000',tier:3},
  {name:'Reed, Patrick',country:'USA',odds:'+10000',tier:3},{name:'Echavarria, Nico',country:'COL',odds:'+10000',tier:3},
  {name:'Rai, Aaron',country:'ENG',odds:'+10000',tier:3},{name:'Hall, Harry',country:'ENG',odds:'+10000',tier:3},
  {name:'Riley, Davis',country:'USA',odds:'+12000',tier:3},{name:'Stevens, Sam',country:'USA',odds:'+12000',tier:3},
  {name:'Bridgeman, Jacob',country:'USA',odds:'+12000',tier:3},{name:'Taylor, Nick',country:'CAN',odds:'+12000',tier:3},
  {name:'Greyserman, Max',country:'USA',odds:'+12000',tier:3},{name:'Gerard, Ryan',country:'USA',odds:'+12000',tier:3},
  {name:'Hojgaard, Nicolai',country:'DEN',odds:'+12000',tier:3},{name:'Hojgaard, Rasmus',country:'DEN',odds:'+12000',tier:3},
  {name:'Noren, Alex',country:'SWE',odds:'+15000',tier:3},{name:'McCarty, Matt',country:'USA',odds:'+15000',tier:3},
  {name:'McKibbin, Tom',country:'NIR',odds:'+15000',tier:3},{name:'Berger, Daniel',country:'USA',odds:'+15000',tier:3},
  {name:'Kim, Michael',country:'USA',odds:'+15000',tier:3},{name:'Campbell, Brian',country:'USA',odds:'+15000',tier:3},
  {name:'Potgieter, Aldrich',country:'RSA',odds:'+15000',tier:3},{name:'Penge, Marco',country:'ENG',odds:'+15000',tier:3},
  {name:'Reitan, Kristoffer',country:'NOR',odds:'+15000',tier:3},{name:'Valimaki, Sami',country:'FIN',odds:'+20000',tier:3},
  {name:'Brennan, Michael',country:'USA',odds:'+20000',tier:3},{name:'Lee, Min Woo',country:'AUS',odds:'+20000',tier:3},
  {name:'Li, Haotong',country:'CHN',odds:'+20000',tier:3},{name:'Ortiz, Carlos',country:'MEX',odds:'+25000',tier:3},
  {name:'Neergaard-Petersen, Rasmus',country:'DEN',odds:'+25000',tier:3},{name:'Jarvis, Casey',country:'RSA',odds:'+25000',tier:3},
  {name:'Kataoka, Naoyuki',country:'JPN',odds:'+25000',tier:3},{name:'Johnson, Dustin',country:'USA',odds:'+30000',tier:3},
  {name:'Garcia, Sergio',country:'ESP',odds:'+30000',tier:3},{name:'Schwartzel, Charl',country:'RSA',odds:'+40000',tier:3},
  {name:'Willett, Danny',country:'ENG',odds:'+50000',tier:3},{name:'Watson, Bubba',country:'USA',odds:'+50000',tier:3},
  {name:'Couples, Fred',country:'USA',odds:'+100000',tier:3},{name:'Cabrera, Angel',country:'ARG',odds:'+100000',tier:3},
  {name:'Johnson, Zach',country:'USA',odds:'+100000',tier:3},{name:'Olazabal, Jose Maria',country:'ESP',odds:'+100000',tier:3},
  {name:'Singh, Vijay',country:'FIJ',odds:'+100000',tier:3},{name:'Weir, Mike',country:'CAN',odds:'+100000',tier:3},
  {name:'Fang, Ethan',country:'USA',odds:'AM',tier:3},{name:'Herrington, Jackson',country:'USA',odds:'AM',tier:3},
  {name:'Holtz, Brandon',country:'USA',odds:'AM',tier:3},{name:'Howell, Mason',country:'USA',odds:'AM',tier:3},
  {name:'Keefer, Johnny',country:'USA',odds:'AM',tier:3},{name:'Laopakdee, Fifa',country:'THA',odds:'AM',tier:3},
  {name:'Pulcini, Mateo',country:'ARG',odds:'AM',tier:3},
].map(p=>({...p,pos:'-',score:'E',today:'',thru:'',earnings:0}));

const TABS=['Standings','Enter Pool','Field','Admin'];

// Auto-lock entries and reveal picks at first tee time
// Thursday April 9, 2026 at 7:00 AM ET (11:00 UTC)
const TEE_TIME = new Date('2026-04-09T11:00:00Z').getTime();

export default function App(){
  const [tab,setTab]=useState('Standings');
  const [entries,setEntries]=useState([]);
  const [field,setField]=useState(SEED_FIELD);
  const [ready,setReady]=useState(false);
  const [status,setStatus]=useState('');
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
  const timer=useRef(null);

  // Auto-lock and auto-reveal based on tee time
  const pastTeeTime = now >= TEE_TIME;
  const locked = serverLocked || pastTeeTime;
  const picksHidden = serverPicksHidden && !pastTeeTime;

  // Countdown display
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
      const r=await fetch('/api/entries');
      const d=await r.json();
      if(d.entries)setEntries(d.entries);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
    }catch(e){ console.error('loadEntries:',e); }
  };

  const fetchScores=async(quiet)=>{
    // Don't auto-refresh if picks are still hidden (tournament hasn't started)
    if(quiet && picksHidden) return;
    setRefreshing(true);
    try{
      const r=await fetch('/api/scores?endpoint=in-play');
      if(!r.ok) throw new Error('API '+r.status);
      const data=await r.json();

      // Check if this is actually the Masters
      const eventName = (data.event_name || data.tournament || '').toLowerCase();
      if(eventName && !eventName.includes('master')) {
        throw new Error('Waiting for Masters to go live — currently showing: ' + (data.event_name || 'other event'));
      }

      const raw=data.data||data.players||data||[];
      if(!Array.isArray(raw)||raw.length===0) throw new Error('No live scores yet');

      const updated=field.map(f=>{
        const match=raw.find(p=>{
          const pName=(p.player_name||p.dg_player_name||'').toLowerCase();
          const fName=f.name.toLowerCase();
          const ln=(p.last_name||'').toLowerCase();
          const fn=(p.first_name||'').toLowerCase();
          return pName===fName || fName===`${ln}, ${fn}`;
        });
        if(match){
          const total=match.total??match.score??null;
          return{...f,
            pos:match.current_pos!=null?String(match.current_pos):(match.position||f.pos),
            score:total!=null?(total===0?'E':(total>0?`+${total}`:String(total))):f.score,
            today:match.today!=null?(match.today===0?'E':(match.today>0?`+${match.today}`:String(match.today))):'',
            thru:match.thru!=null?String(match.thru):'',
          };
        }
        return f;
      });
      const em=calcEarnings(updated);
      updated.forEach(p=>{p.earnings=em[p.name]||0;});
      setField(updated);
      setLastUp(new Date().toLocaleTimeString());
      setStatus('');
      if(!quiet) msg('Scores updated');
    }catch(e){
      if(!quiet) setStatus(e.message);
    }
    setRefreshing(false);
  };

  useEffect(()=>{
    loadEntries().then(()=>setReady(true));
    fetchScores(true);
    timer.current=setInterval(()=>{fetchScores(true);loadEntries();setNow(Date.now());},60000);
    // Update countdown every 30s
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
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'submit',name:entryName.trim(),picks:allPicks})});
      const d=await r.json();
      if(d.error){msg(d.error);setSubmitting(false);return;}
      if(d.entries)setEntries(d.entries);
      setEntryName('');setPicks({1:[],2:[],3:[]});setSearch('');
      msg('Entry submitted!');setTab('Standings');
    }catch(e){msg('Error submitting — check connection');}
    setSubmitting(false);
  };

  const deleteOwnEntry=async(name)=>{
    if(!confirm(`Remove your entry "${name}"? You can re-enter if entries aren't locked.`))return;
    try{
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete-own',name})});
      const d=await r.json();
      if(d.error){msg(d.error);return;}
      if(d.entries)setEntries(d.entries);
      msg('Entry removed');
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
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,password:adminPw,...extra})});
      const d=await r.json();
      if(d.error){msg(d.error);return null;}
      if(d.entries!==undefined)setEntries(d.entries||[]);
      if(d.locked!==undefined)setServerLocked(d.locked);
      if(d.picksHidden!==undefined)setServerPicksHidden(d.picksHidden);
      return d;
    }catch(e){msg('Error');return null;}
  };

  if(!ready)return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#ece7dc',fontFamily:'sans-serif'}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:28,height:28,border:'3px solid #2d501620',borderTopColor:'#2d5016',borderRadius:'50%',animation:'sp .7s linear infinite',marginBottom:12}}/>
      <p style={{color:'#2d5016',fontSize:15}}>Loading pool...</p>
    </div>
  );

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'linear-gradient(180deg,#d8d3c4 0%,#f3efe6 300px)',minHeight:'100vh',color:'#1a2e0a'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
        @keyframes flagWave{0%,100%{transform:skewX(0deg)}25%{transform:skewX(-3deg)}75%{transform:skewX(2deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        button{cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s}button:active{opacity:.7}
        input:focus{outline:2px solid #2d5016;outline-offset:1px}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#2d501630;border-radius:3px}
      `}</style>

      {toast&&<div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',background:'#1a2e0a',color:'#faf6ed',padding:'8px 20px',borderRadius:9,fontSize:13,fontWeight:600,zIndex:100,animation:'sd .25s ease',boxShadow:'0 4px 14px rgba(0,0,0,.2)',maxWidth:'90%',textAlign:'center'}}>{toast}</div>}

      {/* AUGUSTA-INSPIRED HEADER */}
      <header style={{background:'linear-gradient(170deg,#0a1f04 0%,#163a0a 30%,#1e5010 60%,#2a6818 100%)',padding:0,color:'#faf6ed',position:'relative',overflow:'hidden'}}>
        {/* SVG Scene - Rolling hills, flag, azaleas */}
        <svg viewBox="0 0 800 200" style={{width:'100%',display:'block'}} xmlns="http://www.w3.org/2000/svg">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a3f0a"/>
              <stop offset="100%" stopColor="#2d5016"/>
            </linearGradient>
            <linearGradient id="fairway" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d7a1e"/>
              <stop offset="100%" stopColor="#1e5a12"/>
            </linearGradient>
          </defs>
          <rect width="800" height="200" fill="url(#sky)"/>
          
          {/* Distant tree line */}
          <ellipse cx="120" cy="95" rx="45" ry="35" fill="#1a4a0e" opacity=".6"/>
          <ellipse cx="200" cy="90" rx="55" ry="40" fill="#1d4f10" opacity=".5"/>
          <ellipse cx="300" cy="92" rx="40" ry="32" fill="#1a4a0e" opacity=".55"/>
          <ellipse cx="500" cy="88" rx="60" ry="42" fill="#1d4f10" opacity=".5"/>
          <ellipse cx="620" cy="93" rx="50" ry="36" fill="#1a4a0e" opacity=".6"/>
          <ellipse cx="720" cy="90" rx="45" ry="38" fill="#1d4f10" opacity=".5"/>
          
          {/* Rolling fairway hills */}
          <path d="M0,140 Q100,110 200,130 Q350,155 450,125 Q550,100 650,128 Q750,150 800,130 L800,200 L0,200 Z" fill="url(#fairway)"/>
          <path d="M0,160 Q150,140 300,155 Q450,170 600,150 Q700,140 800,155 L800,200 L0,200 Z" fill="#256a16" opacity=".7"/>
          
          {/* Flag stick */}
          <line x1="580" y1="72" x2="580" y2="120" stroke="#ddd" strokeWidth="1.5"/>
          <path d="M580,72 L608,80 L580,88 Z" fill="#d42a2a" style={{animation:'flagWave 3s ease-in-out infinite'}}/>
          
          {/* Azalea bushes - pink flowers */}
          <circle cx="80" cy="155" r="12" fill="#d94878" opacity=".8"/>
          <circle cx="95" cy="150" r="10" fill="#e05a8a" opacity=".7"/>
          <circle cx="68" cy="152" r="9" fill="#c93868" opacity=".75"/>
          <circle cx="88" cy="160" r="8" fill="#d94878" opacity=".6"/>
          
          <circle cx="700" cy="148" r="11" fill="#d94878" opacity=".75"/>
          <circle cx="715" cy="144" r="9" fill="#e05a8a" opacity=".65"/>
          <circle cx="688" cy="146" r="8" fill="#c93868" opacity=".7"/>
          
          {/* Dogwood white flowers */}
          <circle cx="160" cy="100" r="4" fill="#fff" opacity=".3"/>
          <circle cx="170" cy="95" r="3" fill="#fff" opacity=".25"/>
          <circle cx="640" cy="98" r="4" fill="#fff" opacity=".3"/>
          <circle cx="650" cy="93" r="3" fill="#fff" opacity=".2"/>
          
          {/* Amen Corner bridge hint */}
          <path d="M340,165 Q370,155 400,165" stroke="#c4a86c" strokeWidth="2" fill="none" opacity=".4"/>
          
          {/* Water reflection */}
          <ellipse cx="370" cy="175" rx="50" ry="12" fill="#1a4a3a" opacity=".3"/>
        </svg>
        
        {/* Title overlay */}
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:11,fontWeight:400,fontStyle:'italic',opacity:.7,letterSpacing:1.5,marginBottom:2}}>A Tradition Unlike Any Other</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,letterSpacing:'-0.5px',textShadow:'0 2px 8px rgba(0,0,0,.3)'}}>{TOURNAMENT.name}</h1>
            <div style={{fontSize:11,opacity:.55,marginTop:2}}>{fmt(TOURNAMENT.purse)} purse · 3 picks × 3 tiers</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{background:'#ffffff18',borderRadius:16,padding:'4px 14px',fontSize:12,fontWeight:600,backdropFilter:'blur(4px)',border:'1px solid #ffffff15'}}>{entries.length} {entries.length===1?'entry':'entries'}</div>
            {countdown&&<div style={{fontSize:10,opacity:.7,marginTop:5}}>⏱ {countdown}</div>}
            {lastUp&&!countdown&&<div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',marginTop:5}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'glow 2s infinite'}}/>
              <span style={{fontSize:9,opacity:.5}}>Live · {lastUp}</span>
            </div>}
          </div>
        </div>
      </header>

      <nav style={{display:'flex',background:'#fff',borderBottom:'2px solid #1e5010',position:'sticky',top:0,zIndex:10,boxShadow:'0 2px 6px rgba(0,0,0,.06)'}}>
        {TABS.map(t=><button key={t} onClick={()=>{setTab(t);setSearch('')}} style={{flex:1,padding:'11px 4px',fontSize:12,fontWeight:tab===t?700:500,border:'none',background:tab===t?'#f5f0e8':'transparent',color:tab===t?'#1e5010':'#8a9580',borderBottom:tab===t?'3px solid #1e5010':'3px solid transparent',letterSpacing:.3}}>{t==='Admin'?'⚙ ':''}{t}</button>)}
      </nav>

      {lastUp&&!picksHidden&&<div style={{padding:'4px 14px',background:'#f5f0e8',borderBottom:'1px solid #e0dbd0',textAlign:'center'}}>
        <span style={{fontSize:10,color:'#8a9580'}}>Scores update automatically · Last: {lastUp}</span>
      </div>}

      {status&&<div style={{background:'#fef3cd',padding:'8px 16px',fontSize:12,color:'#856404',textAlign:'center'}}>{status}</div>}

      <main style={{padding:'12px 12px 80px',maxWidth:660,margin:'0 auto',animation:'fu .35s ease'}}>

        {/* STANDINGS */}
        {tab==='Standings'&&(ranked.length===0?
          <div style={bx}><div style={{fontSize:44,marginBottom:10}}>🏌️</div><p style={{color:'#2d5016',fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:16,marginBottom:14}}>The field awaits your picks.</p><button type="button" style={pri} onClick={()=>setTab('Enter Pool')}>Enter the Pool</button></div>
          :<>
            {picksHidden&&<div style={{background:'linear-gradient(135deg,#f9f0f3,#f5e8ee)',padding:'12px 16px',borderRadius:9,marginBottom:10,fontSize:13,color:'#8b3060',textAlign:'center',border:'1px solid #e8c8d8'}}>
              🌸 Picks are hidden until first tee Thursday 7:00 AM ET.{countdown?' '+countdown+'.':' Revealing soon!'}
            </div>}
            {ranked.map((e,i)=>{const tot=teamE(e),op=openCard===e.name;return(
              <div key={e.name} style={{background:'#fff',borderRadius:11,padding:'12px 14px',marginBottom:7,border:'1px solid #cdc8b8',animation:'fu .3s ease both',animationDelay:i*.04+'s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,cursor:picksHidden?'default':'pointer'}} onClick={()=>!picksHidden&&setOpenCard(op?null:e.name)}>
                  {!picksHidden&&<div style={{fontSize:i<3?18:14,fontWeight:800,width:32,textAlign:'center'}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</div>}
                  {picksHidden&&<div style={{width:32,textAlign:'center',fontSize:16}}>✅</div>}
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700}}>{e.name}</div>
                    <div style={{fontSize:11,color:'#8a9580'}}>{picksHidden?'Entry submitted — picks hidden until tee-off':'Tap to '+(op?'collapse':'expand')}</div>
                  </div>
                  {!picksHidden&&<div style={{fontWeight:800,fontSize:17,color:'#2d5016'}}>{fmt(tot)}</div>}
                </div>

                {/* Show picks only if not hidden */}
                {!picksHidden&&op&&<div style={{marginTop:8,borderTop:'1px solid #eee8dc',paddingTop:8,animation:'sd .2s ease'}}>
                  {TIERS.map(t=>{const tp=e.picks.filter(pn=>field.find(f=>f.name===pn)?.tier===t.id);if(!tp.length)return null;return<div key={t.id} style={{marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:700,color:t.color,marginBottom:3,letterSpacing:.5}}>{t.name.toUpperCase()}</div>
                    {tp.map(pn=>{const p=field.find(f=>f.name===pn);return<div key={pn} style={{display:'flex',padding:'4px 0',borderBottom:'1px solid #f5f0e8'}}>
                      <div style={{flex:1}}><span style={{fontWeight:600,fontSize:13}}>{flip(pn)}</span>{p&&<span style={{fontSize:11,color:'#8a9580',marginLeft:6}}>{p.pos} · {p.score}</span>}</div>
                      <span style={{fontWeight:700,fontSize:13,color:'#2d5016'}}>{fmt(p?.earnings)}</span>
                    </div>;})}
                  </div>;})}
                </div>}

                {!picksHidden&&!op&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                  {e.picks.map(pn=>{const p=field.find(f=>f.name===pn);const t=TIERS.find(t=>t.id===p?.tier);return<span key={pn} style={{fontSize:10,background:'#f3efe6',padding:'2px 7px',borderRadius:4,border:'1px solid #ddd8ca',borderLeft:`3px solid ${t?.color||'#ccc'}`}}>{pn.split(', ')[0]} <b style={{color:'#2d5016'}}>{fmt(p?.earnings)}</b></span>;})}
                </div>}

              </div>
            );})}
          </>
        )}

        {/* ENTER POOL */}
        {tab==='Enter Pool'&&(locked?
          <div style={bx}><div style={{fontSize:44,marginBottom:10}}>🔒</div><p style={{color:'#6b7c5e'}}>Entries locked — tournament has started!</p><p style={{color:'#8a9580',fontSize:12,marginTop:6}}>Picks were locked at 7:00 AM ET Thursday.</p></div>
          :<>
            {countdown&&<div style={{background:'#fef3cd',padding:'8px 14px',borderRadius:9,marginBottom:10,fontSize:12,color:'#856404',textAlign:'center',border:'1px solid #f0e4a8'}}>
              ⏱ {countdown} — submit before Thursday 7:00 AM ET!
            </div>}
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input style={inp} placeholder="Your Name" value={entryName} onChange={e=>setEntryName(e.target.value)}/>
              <div style={{background:'#2d5016',color:'#faf6ed',minWidth:50,height:44,borderRadius:9,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 6px'}}>
                <span style={{fontSize:18,fontWeight:800}}>{totalPicked}</span><span style={{fontSize:9,opacity:.6}}>/{TOTAL_PICKS}</span>
              </div>
            </div>
            {totalPicked>0&&<div style={{background:'#2d501610',borderRadius:9,padding:10,marginBottom:10,border:'1px solid #2d50161a'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#2d5016',marginBottom:5,letterSpacing:1}}>YOUR PICKS</div>
              {TIERS.map(t=>{if(!picks[t.id].length)return null;return<div key={t.id} style={{marginBottom:4}}>
                <div style={{fontSize:10,color:t.color,fontWeight:600,marginBottom:2}}>{t.name} ({picks[t.id].length}/{t.picks})</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{picks[t.id].map(p=><button key={p} type="button" onClick={()=>removePick(p)} style={{background:t.color,color:'#faf6ed',border:'none',borderRadius:5,padding:'3px 9px',fontSize:11,fontWeight:500}}>{flip(p)} ✕</button>)}</div>
              </div>;})}
            </div>}
            <div style={{display:'flex',gap:0,marginBottom:8,borderRadius:8,overflow:'hidden',border:'1px solid #c8c3b5'}}>
              {TIERS.map(t=>{const a=activeTier===t.id,full=picks[t.id].length>=t.picks;return<button key={t.id} type="button" onClick={()=>{setActiveTier(t.id);setSearch('')}}
                style={{flex:1,padding:'9px 4px',fontSize:11,fontWeight:a?700:500,border:'none',background:a?t.color:'#fff',color:a?'#fff':t.color,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span>{t.name.split('—')[0].trim()}</span><span style={{fontSize:10,opacity:.8}}>{picks[t.id].length}/{t.picks} {full?'✓':''}</span>
              </button>;})}
            </div>
            <input style={{...inp,marginBottom:8}} placeholder={`Search ${(TIERS.find(t=>t.id===activeTier)?.name||'').split('—')[1]?.trim()||''}...`} value={search} onChange={e=>setSearch(e.target.value)}/>
            <div style={{maxHeight:320,overflowY:'auto',borderRadius:9,border:'1px solid #c8c3b5',background:'#fff'}}>
              {filteredTier.map(p=>{const sel=picks[activeTier].includes(p.name),full=!sel&&picks[activeTier].length>=TIERS.find(t=>t.id===activeTier)?.picks,ow=owners(p.name);return(
                <button key={p.name} type="button" onClick={()=>!full&&togglePick(p.name,activeTier)}
                  style={{display:'flex',alignItems:'center',padding:'8px 12px',border:'none',borderBottom:'1px solid #f0ebe0',width:'100%',background:sel?'#2d50160e':'#fff',textAlign:'left',opacity:full?.3:1,cursor:full?'not-allowed':'pointer'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{flip(p.name)}</div>
                    <div style={{fontSize:11,color:'#8a9580'}}>{p.country} · {p.odds}</div>
                    {!picksHidden&&ow.length>0&&<div style={{fontSize:10,color:'#8b6914',marginTop:1}}>Picked by: {ow.join(', ')}</div>}
                  </div>
                  <div style={sel?{width:20,height:20,borderRadius:'50%',background:'#2d5016',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}:{width:20,height:20,borderRadius:'50%',border:'2px solid #c8c3b5'}}>{sel?'✓':''}</div>
                </button>);})}
            </div>
            <button type="button" disabled={submitting||totalPicked!==TOTAL_PICKS} style={{...pri,width:'100%',padding:12,fontSize:15,marginTop:10,borderRadius:9,opacity:(submitting||totalPicked!==TOTAL_PICKS)?.4:1}} onClick={submit}>
              {submitting?'Submitting...':'Submit Entry ('+totalPicked+'/'+TOTAL_PICKS+')'}
            </button>
          </>
        )}

        {/* FIELD */}
        {tab==='Field'&&<>
          <input style={{...inp,marginBottom:8}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{borderRadius:9,overflow:'hidden',border:'1px solid #c8c3b5'}}>
            <div style={{display:'flex',padding:'8px 10px',background:'#2d5016',color:'#faf6ed',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>
              <span style={{width:40,textAlign:'center'}}>Pos</span><span style={{flex:1}}>Player</span><span style={{width:30,textAlign:'center'}}>Tier</span><span style={{width:38,textAlign:'center'}}>Thru</span><span style={{width:40,textAlign:'center'}}>Tot</span><span style={{width:72,textAlign:'right'}}>Earnings</span>
            </div>
            {fieldVis.map((p,i)=>{const ow=owners(p.name),sc=String(p.score).startsWith('-')?'#1a6b1a':p.score==='E'?'#555':'#b02020';const t=TIERS.find(t=>t.id===p.tier);return(
              <div key={p.name} style={{display:'flex',padding:'7px 10px',alignItems:'center',fontSize:12,borderBottom:'1px solid #eee8dc',background:ow.length&&!picksHidden?'#f0ebd6':i%2===0?'#fff':'#faf8f3'}}>
                <span style={{width:40,textAlign:'center',fontWeight:700,color:'#2d5016',fontSize:12}}>{p.pos}</span>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}><span style={{fontWeight:600,fontSize:12}}>{flip(p.name)}</span><span style={{color:'#aaa',fontSize:10,marginLeft:4}}>{p.country}</span>{!picksHidden&&ow.length>0&&<span style={{fontSize:9,color:'#8b6914',marginLeft:4}}>({ow.join(',')})</span>}</span>
                <span style={{width:30,textAlign:'center'}}><span style={{fontSize:9,fontWeight:700,color:t?.color,background:t?.color+'18',padding:'1px 5px',borderRadius:3}}>{String.fromCharCode(64+p.tier)}</span></span>
                <span style={{width:38,textAlign:'center',fontSize:11,color:'#888'}}>{p.thru||'-'}</span>
                <span style={{width:40,textAlign:'center',fontWeight:700,fontSize:12,color:sc}}>{p.score}</span>
                <span style={{width:72,textAlign:'right',fontWeight:700,fontSize:12}}>{fmt(p.earnings)}</span>
              </div>);})}
          </div>
        </>}

        {/* ADMIN */}
        {tab==='Admin'&&(!adminOk?
          <div style={{background:'#fff',padding:20,borderRadius:11,border:'1px solid #c8c3b5'}}>
            <p style={{color:'#6b7c5e',marginBottom:10,fontSize:13}}>Enter admin password:</p>
            <div style={{display:'flex',gap:8}}>
              <input style={inp} type="password" placeholder="Password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&setAdminOk(true)}/>
              <button type="button" style={{...pri,padding:'10px 24px',minWidth:80}} onClick={()=>setAdminOk(true)}>Enter</button>
            </div>
          </div>
          :<>
            <div style={sec}><h3 style={stl}>📡 Live Scores</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Auto-refreshes from DataGolf every 60s.</p>
              <button type="button" style={{...pri,opacity:refreshing?.5:1}} onClick={()=>fetchScores(false)} disabled={refreshing}>{refreshing?'Updating...':'⟳ Refresh Now'}</button>
              {lastUp&&<span style={{fontSize:11,color:'#8a9580',marginLeft:8}}>Last: {lastUp}</span>}
            </div>

            <div style={sec}><h3 style={stl}>🔒 Entry Lock</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Lock entries before R1 tees off. Also prevents users from deleting their entries.</p>
              <button type="button" style={locked?dan:pri} onClick={async()=>{const d=await adminAction(locked?'unlock':'lock');if(d?.ok)msg(locked?'Unlocked':'Locked!');}}>{locked?'🔓 Unlock':'🔒 Lock'} Entries</button>
            </div>

            <div style={sec}><h3 style={stl}>👀 Show/Hide Picks</h3><p style={{fontSize:12,color:'#6b7c5e',marginBottom:8}}>Picks are currently <b>{picksHidden?'hidden':'visible'}</b>. Reveal picks once the first group tees off Thursday so everyone can see each other's teams.</p>
              <button type="button" style={picksHidden?pri:dan} onClick={async()=>{const d=await adminAction(picksHidden?'show-picks':'hide-picks');if(d?.ok)msg(picksHidden?'Picks revealed!':'Picks hidden');}}>{picksHidden?'👀 Reveal Picks':'🙈 Hide Picks'}</button>
            </div>

            <div style={sec}><h3 style={stl}>👥 Entries ({entries.length})</h3>
              {entries.length===0?<p style={{color:'#8a9580',fontSize:12}}>None</p>:entries.map(e=><div key={e.name} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0ebe0',fontSize:13,alignItems:'center'}}>
                <span><b>{e.name}</b> <span style={{fontSize:10,color:'#8a9580'}}>{e.picks.length} picks</span></span>
                <button type="button" style={{background:'transparent',border:'1px solid #c44',color:'#c44',padding:'3px 9px',borderRadius:5,fontSize:11}} onClick={async()=>{await adminAction('delete',{name:e.name});msg('Removed');}}>Remove</button>
              </div>)}
            </div>

            <div style={{...sec,borderColor:'#d4444460'}}><h3 style={{...stl,color:'#a03030'}}>⚠ Danger</h3><button type="button" style={dan} onClick={async()=>{if(!confirm('Reset everything?'))return;await adminAction('reset');setEntries([]);msg('Reset');}}>Reset All</button></div>
          </>
        )}
      </main>
      <footer style={{textAlign:'center',padding:'16px 12px',fontSize:10,color:'#8a9580',borderTop:'1px solid #cdc8b8',background:'#f3efe6'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontStyle:'italic',fontSize:12,color:'#2d5016',marginBottom:4}}>Pick 3 from each tier · 9 golfers total</div>
        <div>Highest combined earnings wins</div>
      </footer>
    </div>
  );
}

const pri={background:'#2d5016',color:'#faf6ed',border:'none',padding:'8px 18px',borderRadius:7,fontWeight:600,fontSize:13};
const dan={background:'#8b2020',color:'#fff',border:'none',padding:'8px 18px',borderRadius:7,fontWeight:600,fontSize:13};
const inp={flex:1,padding:'9px 12px',borderRadius:7,border:'1px solid #c8c3b5',fontSize:14,fontFamily:"'DM Sans',sans-serif",background:'#fff'};
const bx={textAlign:'center',padding:'36px 16px',background:'#fff',borderRadius:12,border:'1px solid #cdc8b8'};
const sec={background:'#fff',padding:14,borderRadius:9,marginBottom:9,border:'1px solid #c8c3b5'};
const stl={fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,marginBottom:6};
