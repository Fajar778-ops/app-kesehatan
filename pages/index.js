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
// --- IMPORT PLUGIN ZOOM ---
import zoomPlugin from 'chartjs-plugin-zoom';

// --- REGISTRASI PLUGIN ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin // <-- Daftarkan plugin zoom
);

// --- KONFIGURASI MQTT ---
const MQTT_SERVER = "wss://mqtt.flespi.io";
const MQTT_TOKEN = "FlespiToken SVuaJdZboOeoyXKKIhFjKYRKfUOzRaHXavHMSTfn7oSl6og9BUPvdGdfk5lVr1Vl"; 
const TOPIC_VITALS = "esp32/vitals";
const TOPIC_EKG    = "esp32/ekg";

export default function Home() {
    const [nama, setNama] = useState('');
    const [status, setStatus] = useState('');
    const [isMqttConnected, setIsMqttConnected] = useState(false);

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
                borderColor: '#00FF00',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 0,
                fill: true,
            },
        ],
    });

    // --- OPSI GRAFIK BARU (DENGAN ZOOM & AUTO-SCALE) ---
    const chartOptions = {
        responsive: true,
        animation: false,
        scales: {
            x: { display: false }, 
            y: { 
                display: true,
                // --- MODE AUTO-SCALE (Agar selalu di tengah) ---
                // Kita hapus min/max paksa. Biarkan chart menentukan sendiri.
                // min: 1500, 
                // max: 3000, 
                grid: { color: '#333' },
                ticks: { color: '#888' }
            }
        },
        plugins: {
            legend: { display: false },
            // --- KONFIGURASI ZOOM ---
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'xy', // Bisa geser kiri-kanan atas-bawah
                },
                zoom: {
                    wheel: {
                        enabled: true, // Zoom pakai scroll mouse
                    },
                    pinch: {
                        enabled: true // Zoom pakai cubit di HP
                    },
                    mode: 'xy', // Bisa zoom sumbu X dan Y
                }
            }
        },
        maintainAspectRatio: false,
    };

    // BUFFER DIPERBESAR (Agar bisa di-zoom out melihat sejarah)
    const ekgBuffer = useRef([]); 
    const MAX_DATA_POINTS = 200; // Simpan 200 titik terakhir

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
            client.subscribe([TOPIC_VITALS, TOPIC_EKG]);
        });

        client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());

                if (topic === TOPIC_VITALS) {
                    setDataSensor({
                        bpm: payload.bpm, spo2: payload.spo2, suhu: payload.suhu, pasien: payload.pasien
                    });
                } 
                else if (topic === TOPIC_EKG) {
                    const newValue = payload.val;
                    
                    // Masukkan ke buffer yang lebih besar
                    ekgBuffer.current.push(newValue);
                    if (ekgBuffer.current.length > MAX_DATA_POINTS) {
                        ekgBuffer.current.shift();
                    }

                    setChartData(prev => ({
                        labels: new Array(ekgBuffer.current.length).fill(''),
                        datasets: [{ ...prev.datasets[0], data: [...ekgBuffer.current] }]
                    }));
                }
            } catch (error) {}
        });

        return () => { if (client) client.end(); };
    }, []);

    // --- FUNGSI INPUT NAMA & TOMBOL RESET ZOOM ---
    const handleSubmit = async (e) => { e.preventDefault(); /* ... kode lama ... */ };
    
    // Fungsi untuk mereset zoom (optional, butuh setup ref chart)
    // const resetZoom = () => { chartRef.current.resetZoom(); };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '800px', margin: '0 auto', backgroundColor: '#111', color: 'white', minHeight: '100vh' }}>
            <h2 style={{ textAlign: 'center', color: '#00FF00' }}>MONITORING EKG IoT</h2>
            <p style={{textAlign: 'center', fontSize: '0.8em', color: '#aaa'}}>(Gunakan scroll mouse atau cubit untuk Zoom, klik & tahan untuk Geser)</p>
            
            {/* STATUS & INPUT (Sama seperti sebelumnya) */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3>Pasien: <span style={{ color: 'cyan' }}>{dataSensor.pasien}</span></h3>
                    <h3>HR: <span style={{ color: 'red', fontSize: '1.5em' }}>{dataSensor.bpm}</span></h3>
                </div>

                {/* GRAFIK EKG (Tinggi diperbesar sedikit) */}
                <div style={{ height: '300px', width: '100%', marginBottom: '20px', cursor: 'move' }}>
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
