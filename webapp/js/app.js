import { SERVICE_UUID, CHAR_PPM, CHAR_TEMP, CHAR_HUMIDITY, BLE_OPTIONS } from './config.js';
// ---- State Management ----
let ppm = null, temp = null, humidity = null;
const ppmHistory = [];
const MAX_HISTORY = 40;

// ---- DOM References ----
const connectBtn   = document.getElementById('connect_button');
const publishBtn   = document.getElementById('publish_data');
const statsDiv     = document.getElementById('stats_div');
const connDiv      = document.getElementById('connection_div');
const bleStatusTxt = document.getElementById('ble_status_text');
const statusDot    = document.getElementById('status_dot');

// ---- BLE Initialization ----
if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        bleStatusTxt.textContent = 'SCANNING...';
        statusDot.className = 'status-dot live';
        try {
            const device = await navigator.bluetooth.requestDevice(BLE_OPTIONS);
            bleStatusTxt.textContent = `CONNECTING TO ${device.name}...`;

            const server      = await device.gatt.connect();
            const service     = await server.getPrimaryService(SERVICE_UUID);

            const charPPM      = await service.getCharacteristic(CHAR_PPM);
            const charTemp     = await service.getCharacteristic(CHAR_TEMP);
            const charHumidity = await service.getCharacteristic(CHAR_HUMIDITY);

            charPPM.addEventListener('characteristicvaluechanged', handlePPM);
            await charPPM.startNotifications();

            charTemp.addEventListener('characteristicvaluechanged', handleTemp);
            await charTemp.startNotifications();

            charHumidity.addEventListener('characteristicvaluechanged', handleHumidity);
            await charHumidity.startNotifications();

            statsDiv.hidden = false;
            connDiv.hidden  = true;

            device.addEventListener('gattserverdisconnected', () => {
                location.reload(); 
            });

        } catch (err) {
            bleStatusTxt.textContent = 'CONNECTION FAILED';
            statusDot.className = 'status-dot idle';
            console.error(err);
        }
    });
}

// ---- Data Handlers ----
function handlePPM(event) {
    ppm = event.target.value.getFloat32(0, true).toFixed(1);
    const el = document.getElementById('ppm_value');
    if (el) el.textContent = Math.round(ppm);
    updateOverview(ppm);
    if (typeof updateGauge === 'function') updateGauge(parseFloat(ppm));
    addHistory(parseFloat(ppm));
}

function handleTemp(event) {
    temp = event.target.value.getFloat32(0, true).toFixed(1);
    const el = document.getElementById('temp_value');
    if (el) el.textContent = temp;
    const bar = document.getElementById('temp_bar');
    if (bar) bar.style.width = Math.min(100, Math.max(0, (parseFloat(temp) / 50) * 100)) + '%';
}

function handleHumidity(event) {
    humidity = event.target.value.getFloat32(0, true).toFixed(1);
    const el = document.getElementById('humidity_value');
    if (el) el.textContent = humidity;
    const bar = document.getElementById('humid_bar');
    if (bar) bar.style.width = Math.min(100, Math.max(0, parseFloat(humidity))) + '%';
}

// ---- Background Animation Shared Logic ----
const bgCanvas = document.getElementById('bg_canvas');
const bctx = bgCanvas ? bgCanvas.getContext('2d') : null;
let particles = [];

function initBg() {
    if (!bgCanvas) return;
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.3 + 0.1),
        color: Math.random() > 0.5 ? '#00c9b8' : '#c8f135',
        alpha: Math.random() * 0.4 + 0.1
    }));
}

function animateBg() {
    if (!bctx) return;
    bctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) p.y = bgCanvas.height + 10;
        bctx.beginPath();
        bctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bctx.fillStyle = p.color;
        bctx.globalAlpha = p.alpha;
        bctx.fill();
    });
    requestAnimationFrame(animateBg);
}

window.addEventListener('resize', initBg);
initBg();
animateBg();

// Navigation & Initialization
if (publishBtn) {
    publishBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            sendReading(ppm, humidity, temp, pos.coords.longitude, pos.coords.latitude);
            publishBtn.disabled = true;
            publishBtn.textContent = "PUBLISHED";
        });
    });
}

async function sendReading(ppm, humidity, temperature, longitude, latitude) {
    try {
        await fetch("/api/readings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id: "esp32-1", ppm, humidity, temperature, longitude, latitude, time: new Date().toISOString() })
        });
    } catch (e) { console.error("Publish failed", e); }
}