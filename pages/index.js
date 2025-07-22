import { useState } from 'react';

export default function Home() {
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/pasien/aktif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pasien: nama })
    });
    const data = await res.json();
    setStatus(`Pasien aktif: ${data.pasien_aktif}`);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>Monitoring Pasien</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nama pasien: <input value={nama} onChange={e => setNama(e.target.value)} />
        </label>
        <button type="submit" style={{ marginLeft: '1rem' }}>Aktifkan</button>
      </form>
      <p>{status}</p>
    </div>
  );
}