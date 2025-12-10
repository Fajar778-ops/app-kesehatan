import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
// Jika Anda ingin menampilkan grafik, Anda mungkin perlu mengimpor Chart.js atau sejenisnya di sini

// Definisikan token di luar komponen untuk keamanan yang lebih baik (atau pakai .env)
const MQTT_TOKEN = "FlespiToken SVuaJdZboOeoyXKKIhFjKYRKfUOzRaHXavHMSTfn7oSl6og9BUPvdGdfk5lVr1Vl"; 
const MQTT_SERVER = "wss://mqtt.flespi.io";
const MQTT_TOPIC = "esp32/vitals";

export default function Home() {
    const [nama, setNama] = useState('');
    const [status, setStatus] = useState('');
    const [isMqttConnected, setIsMqttConnected] = useState(false);

    const [dataSensor, setDataSensor] = useState({
        bpm: "--",
        spo2: "--",
        suhu: "--",
        pasien: "Menunggu koneksi..."
    });

    // === FUNGSI UTAMA: MENGIRIM DATA SENSOR KE DATABASE ===
    const sendVitalsToDB = async (payload) => {
        try {
            // Kita panggil API yang akan kita buat di Langkah 3
            await fetch('/api/save-vitals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log("Data berhasil dikirim ke MongoDB.");
        } catch (err) {
            console.error("Gagal menyimpan data ke DB:", err);
        }
    }

    // --- FUNGSI KIRIM NAMA KE API (KODE LAMA, AMAN) ---
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
            setStatus(`Sukses! Pasien aktif diset: ${data.pasien_aktif}. Alat akan mengambil data ini.`);
        } catch (err) {
            setStatus('Gagal mengirim data. Cek API Vercel.');
        }
    };

    // --- FUNGSI KONEKSI MQTT ---
    useEffect(() => {
        const clientId = "WebClient-" + Math.random().toString(16).substr(2, 8);

        console.log("Menghubungkan ke MQTT...");
        const client = mqtt.connect(MQTT_SERVER, {
            username: MQTT_TOKEN,
            password: "",
            clientId: clientId,
            protocolVersion: 5,
            clean: true
        });

        client.on('connect', () => {
            console.log("Terhubung ke Flespi!");
            setIsMqttConnected(true);
            client.subscribe(MQTT_TOPIC);
        });

        client.on('error', (err) => {
            console.error("MQTT ERROR:", err);
            setIsMqttConnected(false);
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                
                // 1. Update tampilan (Real-time)
                setDataSensor({
                    bpm: payload.bpm,
                    spo2: payload.spo2,
                    suhu: payload.suhu,
                    pasien: payload.pasien
                });

                // 2. Kirim ke Database (Historis)
                // Kita kirim seluruh payload ke API baru
                sendVitalsToDB(payload);

            } catch (error) {
                console.error("Error parse JSON dari ESP32:", error);
            }
        });

        // Cleanup function
        return () => {
            if (client) client.end();
            setIsMqttConnected(false);
        };
    }, []);

    // --- TAMPILAN WEBSITE ---
    return (
        <div style={{ padding: '2rem', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', color: '#1a73e8' }}>Sistem Monitoring Vitals IoT</h1>
            
            <p style={{ textAlign: 'center', color: isMqttConnected ? 'green' : 'red' }}>
                Status MQTT: {isMqttConnected ? 'Tersambung ✅' : 'Gagal Menyambung ❌'}
            </p>

            {/* BAGIAN 1: FORM INPUT NAMA */}
            <div style={{ marginBottom: '2rem', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#f9f9f9' }}>
                <h2>📝 Set Pasien Baru</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label style={{ flexShrink: 0 }}>Nama pasien:</label>
                    <input 
                        value={nama} 
                        onChange={e => setNama(e.target.value)} 
                        placeholder="Contoh: Budi"
                        style={{ padding: '8px', flexGrow: 1, border: '1px solid #ccc', borderRadius: '5px' }}
                    />
                    <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
                        Aktifkan
                    </button>
                </form>
                <p style={{ color: 'blue', marginTop: '10px', fontSize: '0.9rem' }}>{status}</p>
            </div>

            {/* BAGIAN 2: MONITOR REAL-TIME */}
            <div style={{ padding: '20px', border: '2px solid #333', borderRadius: '15px', backgroundColor: '#eef' }}>
                <h2 style={{ textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                    MONITOR REAL-TIME
                </h2>
                
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <p>Pasien Aktif:</p>
                    <h1 style={{ color: '#0070f3', fontSize: '2.5rem', margin: '0' }}>{dataSensor.pasien}</h1>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
                    
                    {/* KOTAK BPM */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderLeft: '5px solid red' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'red' }}>{dataSensor.bpm}</div>
                        <div style={{ color: '#666', fontSize: '1.1rem' }}>❤️ BPM</div>
                    </div>

                    {/* KOTAK SPO2 */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderLeft: '5px solid blue' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'blue' }}>{dataSensor.spo2}%</div>
                        <div style={{ color: '#666', fontSize: '1.1rem' }}>💨 SpO2</div>
                    </div>

                    {/* KOTAK SUHU */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderLeft: '5px solid orange' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'orange' }}>{dataSensor.suhu}°C</div>
                        <div style={{ color: '#666', fontSize: '1.1rem' }}>🌡️ Suhu</div>
                    </div>

                </div>
                
                {/* Placeholder untuk Grafik EKG/PPG (Nanti kita tambahkan di sini) */}
                <div style={{ marginTop: '30px', border: '1px dashed #ccc', padding: '20px', minHeight: '150px', textAlign: 'center' }}>
                    Grafik EKG (Coming Soon)
                </div>
                
            </div>
            
            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
                Setiap data yang masuk ke website ini otomatis disimpan ke MongoDB untuk rekam medis.
            </p>
        </div>
    );
}
