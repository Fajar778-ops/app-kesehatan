import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrasi komponen Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- KONFIGURASI ---
const MQTT_SERVER = "wss://mqtt.flespi.io";
// Token Baru Anda:
const MQTT_TOKEN = "FlespiToken SVuaJdZboOeoyXKKIhFjKYRKfUOzRaHXavHMSTfn7oSl6og9BUPvdGdfk5lVr1Vl"; 
const TOPIC_VITALS = "esp32/vitals"; // Data Lambat (BPM, Suhu)
const TOPIC_EKG    = "esp32/ekg";    // Data Cepat (Grafik)

export default function Home() {
    const [nama, setNama] = useState('');
    const [status, setStatus] = useState('');
    const [isMqttConnected, setIsMqttConnected] = useState(false);

    // State Data Vitals
    const [dataSensor, setDataSensor] = useState({
        bpm: "--", spo2: "--", suhu: "--", pasien: "Menunggu..."
    });

    // State Grafik EKG
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                label: 'Sinyal Jantung',
                data: [],
                borderColor: '#00FF00', // Warna Hijau EKG
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 2,
                tension: 0.3, // Sedikit melengkung biar halus
                pointRadius: 0, // Hilangkan titik-titik (biar jadi garis saja)
                fill: true,
            },
        ],
    });

    // Opsi Tampilan Grafik (Agar mirip monitor RS)
    const chartOptions = {
        responsive: true,
        animation: false, // Matikan animasi biar responsif cepat
        scales: {
            x: { display: false }, // Sembunyikan sumbu X (Waktu)
            y: { 
                display: true,
                min: 1500, // Sesuaikan batas bawah grafik AD8232 Anda
                max: 3000, // Sesuaikan batas atas grafik AD8232 Anda
                grid: { color: '#333' } 
            }
        },
        plugins: {
            legend: { display: false },
        },
        maintainAspectRatio: false,
    };

    // Ref untuk menyimpan data grafik sementara (Buffer)
    const ekgBuffer = useRef([]); 

    // --- FUNGSI MQTT ---
    useEffect(() => {
        const clientId = "Web-" + Math.random().toString(16).substr(2, 8);
        const options = {
            keepalive: 60, clientId: clientId, protocolId: 'MQTT', protocolVersion: 4,
            clean: true, reconnectPeriod: 1000, connectTimeout: 30 * 1000,
            username: MQTT_TOKEN, password: "",
        };

        const client = mqtt.connect(MQTT_SERVER, options);

        client.on('connect', () => {
            console.log("MQTT Terhubung!");
            setIsMqttConnected(true);
            client.subscribe([TOPIC_VITALS, TOPIC_EKG]); // Subscribe dua topik
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());

                if (topic === TOPIC_VITALS) {
                    // Update Angka (1 detik sekali)
                    setDataSensor({
                        bpm: payload.bpm,
                        spo2: payload.spo2,
                        suhu: payload.suhu,
                        pasien: payload.pasien
                    });
                } 
                else if (topic === TOPIC_EKG) {
                    // Update Grafik (Cepat)
                    // payload format: { val: 2000 }
                    const newValue = payload.val;
                    
                    // Masukkan ke buffer
                    ekgBuffer.current.push(newValue);
                    if (ekgBuffer.current.length > 50) { // Batasi 50 titik di layar
                        ekgBuffer.current.shift(); // Buang data lama
                    }

                    // Update State Grafik
                    setChartData(prev => ({
                        labels: new Array(ekgBuffer.current.length).fill(''), // Label dummy
                        datasets: [{ ...prev.datasets[0], data: [...ekgBuffer.current] }]
                    }));
                }

            } catch (error) {
                // console.error("JSON Error"); 
            }
        });

        return () => { if (client) client.end(); };
    }, []);

    // --- FUNGSI INPUT NAMA ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('Mengirim...');
        try {
            const res = await fetch('/api/pasien/aktif', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_pasien: nama })
            });
            const data = await res.json();
            setStatus(`Ok: ${data.pasien_aktif}`);
        } catch (err) { setStatus('Gagal API'); }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto', backgroundColor: '#111', color: 'white', minHeight: '100vh' }}>
            <h2 style={{ textAlign: 'center', color: '#00FF00' }}>MONITORING EKG IoT</h2>
            
            {/* STATUS & INPUT */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #333', borderRadius: '10px' }}>
                <p>Status MQTT: <span style={{ color: isMqttConnected ? '#00FF00' : 'red' }}>{isMqttConnected ? 'ONLINE' : 'OFFLINE'}</span></p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama Pasien" style={{ padding: '5px' }} />
                    <button type="submit">Set Pasien</button>
                </form>
                <small>{status}</small>
            </div>

            {/* MONITOR AREA */}
            <div style={{ border: '2px solid #555', borderRadius: '10px', padding: '10px', backgroundColor: 'black' }}>
                
                {/* HEADER PASIEN */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3>Pasien: <span style={{ color: 'cyan' }}>{dataSensor.pasien}</span></h3>
                    <h3>HR: <span style={{ color: 'red', fontSize: '1.5em' }}>{dataSensor.bpm}</span></h3>
                </div>

                {/* GRAFIK EKG */}
                <div style={{ height: '250px', width: '100%', marginBottom: '20px' }}>
                    <Line data={chartData} options={chartOptions} />
                </div>

                {/* DATA ANGKA LAIN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
                    <div style={{ border: '1px solid blue', padding: '10px', borderRadius: '5px' }}>
                        <div style={{ color: 'blue', fontSize: '2em' }}>{dataSensor.spo2}%</div>
                        <small>SpO2</small>
                    </div>
                    <div style={{ border: '1px solid orange', padding: '10px', borderRadius: '5px' }}>
                        <div style={{ color: 'orange', fontSize: '2em' }}>{dataSensor.suhu}°C</div>
                        <small>Suhu</small>
                    </div>
                </div>

            </div>
        </div>
    );
}
