'use client';
import { useState, useEffect } from 'react';

export default function FieldAdmin() {
  const [password, setPassword] = useState('');
  const [results, setResults] = useState({});
  const [working, setWorking] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPassword(localStorage.getItem('platformPw') || '');
    }
  }, []);

  const savePw = (val) => {
    setPassword(val);
    if (typeof window !== 'undefined') localStorage.setItem('platformPw', val);
  };

  const action = async (key, name, params) => {
    if (!password) { alert('Enter password first'); return; }
    setWorking(key);
    setResults(prev => ({ ...prev, [key]: null }));
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId: 'admin', action: name, password, ...params }),
      });
      const data = await res.json();
      setResults(prev => ({ ...prev, [key]: data }));
    } catch (e) {
      setResults(prev => ({ ...prev, [key]: { error: e.message } }));
    }
    setWorking(null);
  };

  // Rename state
  const [renameMajor, setRenameMajor] = useState('pga');
  const [renameOld, setRenameOld] = useState('');
  const [renameNew, setRenameNew] = useState('');

  // Remove state
  const [removeMajor, setRemoveMajor] = useState('pga');
  const [removeName, setRemoveName] = useState('');

  // Add state
  const [addMajor, setAddMajor] = useState('pga');
  const [addName, setAddName] = useState('');
  const [addCountry, setAddCountry] = useState('USA');
  const [addRank, setAddRank] = useState('');

  const card = { background: 'white', padding: 20, borderRadius: 10, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const label = { display: 'block', margin: '10px 0 4px', fontWeight: 600, fontSize: 13, color: '#444' };
  const input = { width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
  const button = { background: '#1a2a5c', color: 'white', border: 'none', padding: '12px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginTop: 12, fontSize: 14 };

  const Result = ({ data }) => {
    if (!data) return null;
    const ok = !data.error;
    return (
      <div style={{ marginTop: 12, padding: 10, borderRadius: 6, fontSize: 13, fontFamily: 'monospace',
        background: ok ? '#e8f5e8' : '#fee', color: ok ? '#2d7a1e' : '#a00',
        border: `1px solid ${ok ? '#2d7a1e' : '#a00'}` }}>
        {ok ? '✅ ' : '❌ '}{JSON.stringify(data, null, 2)}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: '-apple-system, sans-serif', maxWidth: 600, margin: '40px auto', padding: 20, background: '#f5f1e8', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a2a5c', fontFamily: 'Georgia, serif' }}>⛳ Field Admin</h1>

      <div style={{ ...card, background: '#fff8e1', border: '1px solid #c9a84c' }}>
        <label style={label}>Platform Admin Password</label>
        <input type="password" value={password} onChange={e => savePw(e.target.value)}
          placeholder="Enter PLATFORM_ADMIN_PASSWORD" style={input} />
        <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Saved in browser only</small>
      </div>

      <div style={card}>
        <h3>✏️ Rename Player (fix scraper typos)</h3>
        <label style={label}>Major</label>
        <select value={renameMajor} onChange={e => setRenameMajor(e.target.value)} style={input}>
          <option value="pga">PGA</option>
          <option value="masters">Masters</option>
          <option value="usopen">US Open</option>
          <option value="open">The Open</option>
          <option value="players">The Players</option>
        </select>
        <label style={label}>Current Name (wrong)</label>
        <input value={renameOld} onChange={e => setRenameOld(e.target.value)} placeholder="Katrude, Michael" style={input} />
        <label style={label}>New Name (correct)</label>
        <input value={renameNew} onChange={e => setRenameNew(e.target.value)} placeholder="Kartrude, Michael" style={input} />
        <button style={button} disabled={working === 'rename'}
          onClick={() => action('rename', 'field-rename-player', { major: renameMajor, oldName: renameOld, newName: renameNew })}>
          {working === 'rename' ? 'Working...' : 'Rename'}
        </button>
        <Result data={results.rename} />
      </div>

      <div style={card}>
        <h3>➖ Remove Player (withdrawals)</h3>
        <label style={label}>Major</label>
        <select value={removeMajor} onChange={e => setRemoveMajor(e.target.value)} style={input}>
          <option value="pga">PGA</option>
          <option value="masters">Masters</option>
          <option value="usopen">US Open</option>
          <option value="open">The Open</option>
          <option value="players">The Players</option>
        </select>
        <label style={label}>Player Name (format: "Last, First")</label>
        <input value={removeName} onChange={e => setRemoveName(e.target.value)} placeholder="Knapp, Jake" style={input} />
        <button style={button} disabled={working === 'remove'}
          onClick={() => action('remove', 'field-remove-player', { major: removeMajor, playerName: removeName })}>
          {working === 'remove' ? 'Working...' : 'Remove'}
        </button>
        <Result data={results.remove} />
      </div>

      <div style={card}>
        <h3>➕ Add Player (alternates)</h3>
        <label style={label}>Major</label>
        <select value={addMajor} onChange={e => setAddMajor(e.target.value)} style={input}>
          <option value="pga">PGA</option>
          <option value="masters">Masters</option>
          <option value="usopen">US Open</option>
          <option value="open">The Open</option>
          <option value="players">The Players</option>
        </select>
        <label style={label}>Player Name (format: "Last, First")</label>
        <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Hoge, Tom" style={input} />
        <label style={label}>Country (3-letter code)</label>
        <input value={addCountry} onChange={e => setAddCountry(e.target.value)} placeholder="USA" style={input} />
        <label style={label}>DG Rank (optional)</label>
        <input value={addRank} onChange={e => setAddRank(e.target.value)} placeholder="276" type="number" style={input} />
        <button style={button} disabled={working === 'add'}
          onClick={() => action('add', 'field-add-player', { major: addMajor, playerName: addName, country: addCountry, dgRank: parseInt(addRank) || null })}>
          {working === 'add' ? 'Working...' : 'Add'}
        </button>
        <Result data={results.add} />
      </div>
    </div>
  );
}
