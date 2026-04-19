const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const CHAR_PPM = "6269b0bb-4c37-4095-84a6-e20d591c5501";
const CHAR_TEMP = "43ebd405-99d1-43eb-9bf9-5fa6b1662c4e";
const CHAR_HUMIDITY = "8c3c69b4-60ed-41a1-ae6c-8ca3ab436f51";
const BLE_OPTIONS = { 
    filters: [{ name: "ESP32_UART_BLE" }],
    optionalServices: [SERVICE_UUID] 
};

let ppm = null;
let temp = null;
let humidity = null;

const connectBtn = document.getElementById('connect_button');
const publishBtn = document.getElementById('publish_data');
const statsDiv = document.getElementById('stats_div');
const connDiv = document.getElementById('connection_div');
const bleStatusTxt = document.getElementById('ble_status_text');
const statusDot = document.getElementById('status_dot');

const bgCanvas = document.getElementById('bg_canvas');
const bctx = bgCanvas ? bgCanvas.getContext('2d') : null;
let particles = [];

function initBg() {
    if (!bgCanvas) return;
    bgCanvas.width = window.innerWidth;
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

if (connectBtn) {
    connectBtn.addEventListener('click', async () => {
        bleStatusTxt.textContent = 'SCANNING...';
        statusDot.className = 'status-dot live';
        try {
            const device = await navigator.bluetooth.requestDevice(BLE_OPTIONS);
            bleStatusTxt.textContent = `CONNECTING...`;

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);

            const charPPM = await service.getCharacteristic(CHAR_PPM);
            const charTemp = await service.getCharacteristic(CHAR_TEMP);
            const charHumidity = await service.getCharacteristic(CHAR_HUMIDITY);

            charPPM.addEventListener('characteristicvaluechanged', (e) => {
                ppm = e.target.value.getFloat32(0, true).toFixed(1);
                document.getElementById("ppm_value").textContent = Math.round(ppm);
                updateOverview(ppm);
            });
            await charPPM.startNotifications();

            charTemp.addEventListener('characteristicvaluechanged', (e) => {
                temp = e.target.value.getFloat32(0, true).toFixed(1);
                document.getElementById("temp_value").textContent = temp;
            });
            await charTemp.startNotifications();

            charHumidity.addEventListener('characteristicvaluechanged', (e) => {
                humidity = e.target.value.getFloat32(0, true).toFixed(1);
                document.getElementById("humidity_value").textContent = humidity;
            });
            await charHumidity.startNotifications();

            statsDiv.hidden = false;
            connDiv.hidden = true;

            device.addEventListener('gattserverdisconnected', () => { location.reload(); });
        } catch (err) {
            bleStatusTxt.textContent = 'CONNECTION FAILED';
            statusDot.className = 'status-dot idle';
        }
    });
}

function updateOverview(ppm) {
    const statusEl = document.getElementById("overview_status");
    const textEl = document.getElementById("overview_text");
    if (!statusEl || !textEl) return;
    
    statusEl.style.color = "transparent";
    statusEl.style.webkitBackgroundClip = "text";

    if (ppm < 600) {
        statusEl.textContent = "Very Good";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #8fe3cf, #b9d86a)";
        textEl.textContent = "Air quality appears fresh right now";
    } else if (ppm < 1000) {
        statusEl.textContent = "Good";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #b9d86a, #d8f5eb)";
        textEl.textContent = "Air quality looks good";
    } else {
        statusEl.textContent = "Stuffy";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #ffd166, #ff9f43)";
        textEl.textContent = "Air may be starting to feel stale";
    }
}

if (publishBtn) {
    publishBtn.addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            sendReading(ppm, humidity, temp, pos.coords.longitude, pos.coords.latitude);
            publishBtn.disabled = true;
            publishBtn.textContent = "PUBLISHED";
        });
    });
}

async function sendReading(ppm, hum, temp, lon, lat) {
    try {
        await fetch("/api/readings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device_id: "esp32-1", ppm, humidity: hum, temperature: temp, longitude: lon, latitude: lat, time: new Date().toISOString() })
        });
    } catch (e) { console.error(e); }
}
