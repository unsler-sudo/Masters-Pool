‘use client’;
import { useState } from ‘react’;

export default function Rollback() {
const [password, setPassword] = useState(’’);
const [poolId, setPoolId] = useState(‘l0vd39t0’);
const [archiveKey, setArchiveKey] = useState(‘archive:pga_2026’);
const [result, setResult] = useState(null);
const [loading, setLoading] = useState(false);

const run = async () => {
if (!password) { alert(‘Password required’); return; }
setLoading(true);
setResult(null);
try {
const res = await fetch(’/api/entries’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({ poolId, action: ‘rollback-rotation’, password, archiveKey }),
});
const data = await res.json();
setResult(data);
} catch (e) {
setResult({ error: e.message });
}
setLoading(false);
};

const card = { background: ‘white’, padding: 20, borderRadius: 10, marginBottom: 20 };
const label = { display: ‘block’, margin: ‘10px 0 4px’, fontWeight: 600, fontSize: 14 };
const input = { width: ‘100%’, padding: 12, border: ‘1px solid #ccc’, borderRadius: 6, fontSize: 16, boxSizing: ‘border-box’ };
const button = { background: ‘#1a2a5c’, color: ‘white’, border: ‘none’, padding: ‘14px 20px’, borderRadius: 6, fontWeight: 700, cursor: ‘pointer’, fontSize: 16, width: ‘100%’, marginTop: 16 };

return (
<div style={{ fontFamily: ‘-apple-system, sans-serif’, maxWidth: 500, margin: ‘20px auto’, padding: 20, background: ‘#f5f1e8’, minHeight: ‘100vh’ }}>
<h1 style={{ color: ‘#1a2a5c’, fontFamily: ‘Georgia, serif’, fontSize: 24 }}>🔄 Rollback Rotation</h1>
<p style={{ fontSize: 14, color: ‘#666’, marginBottom: 20 }}>Restores a pool’s active major from an archive. Use this if auto-rotation fired prematurely.</p>

```
  <div style={card}>
    <label style={label}>Platform Admin Password</label>
    <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={input} placeholder="PLATFORM_ADMIN_PASSWORD" />

    <label style={label}>Pool ID</label>
    <input type="text" value={poolId} onChange={e => setPoolId(e.target.value)} style={input} />

    <label style={label}>Archive Key</label>
    <input type="text" value={archiveKey} onChange={e => setArchiveKey(e.target.value)} style={input} />
    <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Format: archive:major_year (e.g. archive:pga_2026)</small>

    <button onClick={run} style={{ ...button, opacity: loading ? 0.5 : 1 }} disabled={loading}>
      {loading ? '⏳ Rolling back...' : '🔄 Restore Pool to PGA 2026'}
    </button>
  </div>

  {result && (
    <div style={{ ...card, background: result.error ? '#fee' : '#e8f5e8', border: `1px solid ${result.error ? '#a00' : '#2d7a1e'}` }}>
      <h3 style={{ color: result.error ? '#a00' : '#2d7a1e', margin: 0 }}>
        {result.error ? '❌ Error' : '✅ Restored'}
      </h3>
      <pre style={{ fontSize: 12, marginTop: 8, overflow: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  )}
</div>
```

);
}
