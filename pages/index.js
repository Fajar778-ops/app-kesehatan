import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // --- STATE UNTUK INPUT NAMA (KODE LAMA KAMU) ---
  const [nama, setNama] = useState('');
  const [status, setStatus] = useState('');

  // --- STATE UNTUK DATA SENSOR (BARU) ---
  const [dataSensor, setDataSensor] = useState({
    bpm: "--",
    spo2: "--",
    suhu: "--",
    pasien: "Menunggu alat..."
  });

  // --- FUNGSI KIRIM NAMA KE API (KODE LAMA KAMU) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sedang mengirim...');
    try {
      const res = await fetch('/api/pasien/aktif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_pasien: nama })
      });
      const data = await res.json();
      setStatus(`Sukses! Pasien aktif diset: ${data.pasien_aktif}`);
    } catch (err) {
      setStatus('Gagal mengirim data.');
    }
  };

  // --- FUNGSI KONEKSI MQTT (BARU) ---
  useEffect(() => {
    // Konfigurasi Flespi
    const mqtt_server = "wss://mqtt.flespi.io";
    const mqtt_topic = "esp32/vitals";
    // Token Flespi Anda (FlespiToken ...)
    const mqtt_token = "FlespiToken KXAmtZULWIlBDmG4hF37hArI0BOTHUcaHWfh9BPQrLorrOegwHegR8YD5WYmeVYU"; 
    const clientId = "WebClient-" + Math.random().toString(16).substr(2, 8);

    console.log("Menghubungkan ke MQTT...");
    const client = mqtt.connect(mqtt_server, {
        username: mqtt_token,
        password: "",
        clientId: clientId,
        protocolVersion: 5,
        clean: true
    });

    client.on('connect', () => {
        console.log("Terhubung ke Flespi!");
        client.subscribe(mqtt_topic);
    });

    client.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            // Update tampilan dengan data baru dari ESP32
            setDataSensor({
                bpm: payload.bpm,
                spo2: payload.spo2,
                suhu: payload.suhu,
                pasien: payload.pasien
            });
        } catch (error) {
            console.error("Error parse JSON:", error);
        }
    });

    return () => {
        if (client) client.end(); // Putus koneksi saat keluar halaman
    };
  }, []);

  // --- TAMPILAN WEBSITE ---
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* BAGIAN 1: FORM INPUT NAMA (UNTUK DOKTER/PERAWAT) */}
      <div style={{ marginBottom: '2rem', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
        <h2>📝 Set Pasien Baru</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Nama pasien: <input 
              value={nama} 
              onChange={e => setNama(e.target.value)} 
              style={{ padding: '5px', margin: '0 10px' }}
              placeholder="Contoh: Budi"
            />
          </label>
          <button type="submit" style={{ padding: '5px 10px', cursor: 'pointer' }}>Aktifkan</button>
        </form>
        <p style={{ color: 'blue', marginTop: '10px' }}>{status}</p>
      </div>

      {/* BAGIAN 2: MONITOR REAL-TIME (DARI ALAT ESP32) */}
      <div style={{ padding: '20px', border: '2px solid #333', borderRadius: '15px', backgroundColor: '#eef' }}>
        <h1 style={{ textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
          Monitor Pasien
        </h1>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p>Pasien Aktif di Alat:</p>
          <h2 style={{ color: '#0070f3', fontSize: '2rem', margin: '0' }}>{dataSensor.pasien}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
          
          {/* KOTAK BPM */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'red' }}>{dataSensor.bpm}</div>
            <div style={{ color: '#666' }}>❤️ BPM</div>
          </div>

          {/* KOTAK SPO2 */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'blue' }}>{dataSensor.spo2}%</div>
            <div style={{ color: '#666' }}>💨 SpO2</div>
          </div>

          {/* KOTAK SUHU */}
          <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'orange' }}>{dataSensor.suhu}°C</div>
            <div style={{ color: '#666' }}>🌡️ Suhu</div>
          </div>

        </div>
      </div>

    </div>
  );
}
