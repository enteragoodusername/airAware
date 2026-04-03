const connect_button = document.querySelector('#connect_button');
const publish_data = document.querySelector('#publish_data');
let ppm; 
let humidity;
let temp;
let options = { 
    filters : [
        {name: "ESP32_UART_BLE"},
        {services: ["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]}
    ]
}
connect_button.addEventListener('click', () => {
    navigator.bluetooth.requestDevice(options).then(async (device) => {
            document.getElementById('stats_div').hidden = false;
            document.getElementById('connection_div').hidden = true;
            
            console.log(`${device.name}`);
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
            console.log(service);

            const characteristic_ppm = await service.getCharacteristic('6269b0bb-4c37-4095-84a6-e20d591c5501');
            const characteristic_temp = await service.getCharacteristic('43ebd405-99d1-43eb-9bf9-5fa6b1662c4e');
            const characteristic_humidity = await service.getCharacteristic('8c3c69b4-60ed-41a1-ae6c-8ca3ab436f51');
            characteristic_ppm.addEventListener('characteristicvaluechanged', handlePPMNotif);
            await characteristic_ppm.startNotifications();

            characteristic_temp.addEventListener('characteristicvaluechanged',handleTempNotif);
            await characteristic_temp.startNotifications();

            characteristic_humidity.addEventListener('characteristicvaluechanged', handleHumidityNotif);
            await characteristic_humidity.startNotifications();
        }
    )
});

function handleTempNotif(event) {
    let value = event.target.value;
    // Parse the DataView (e.g., getUint8, getFloat32)
    temp = value.getFloat32(0,true).toFixed(1);
    console.log('> Temp Notification: ' +temp);
    document.getElementById("temp_value").textContent =temp;
}
function handlePPMNotif(event) {
    let value = event.target.value;
    // Parse the DataView (e.g., getUint8, getFloat32)
    ppm = value.getFloat32(0,true).toFixed(1);
    console.log('> PPM Notification: ' + ppm);
    document.getElementById("ppm_value").textContent = ppm;
    updateOverview(ppm)
}
function handleHumidityNotif(event) {
    let value = event.target.value;
    humidity = value.getFloat32(0,true).toFixed(1);
    // Parse the DataView (e.g., getUint8, getFloat32)
    console.log('> Humidity Notification: ' + humidity);
    document.getElementById("humidity_value").textContent = humidity;
}
function updateOverview(ppm) {
    const statusEl = document.getElementById("overview_status");
    const textEl = document.getElementById("overview_text");

    if (!statusEl || !textEl ) {
        return;
    }

    statusEl.style.display = "inline-block";
    statusEl.style.width = "fit-content";
    statusEl.style.backgroundClip = "text";
    statusEl.style.webkitBackgroundClip = "text";
    statusEl.style.color = "transparent";
    statusEl.style.webkitTextFillColor = "transparent";

    if (ppm < 600) {
        statusEl.textContent = "Very Good";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #8fe3cf, #b9d86a)";
        textEl.textContent = "Air quality appears fresh right now";
    } else if (ppm < 800) {
        statusEl.textContent = "Good";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #b9d86a, #d8f5eb)";
        textEl.textContent = "Air quality looks good";
    } else if (ppm < 1000) {
        statusEl.textContent = "Acceptable";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #f4fff9, #b9d86a)";
        textEl.textContent = "Air quality is acceptable";
    } else if (ppm < 1500) {
        statusEl.textContent = "Stuffy";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #ffd166, #ff9f43)";
        textEl.textContent = "Air may be starting to feel stale";
    } else if (ppm < 3000) {
        statusEl.textContent = "Poor";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #ff9f43, #ff6b6b)";
        textEl.textContent = "Air quality appears poor";
    } else {
        statusEl.textContent = "Very Poor";
        statusEl.style.backgroundImage = "linear-gradient(135deg, #ff6b6b, #c44569)";
        textEl.textContent = "Air quality appears very poor";
    }
}

publish_data.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition(
    (position) => {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        sendReading(ppm, humidity, temp, lon, lat);
        publish_data.disabled = true;
        publish_data.innerHTML = "Published"

        console.log("Latitude:", lat);
        console.log("Longitude:", lon);
    },
    (error) => {
        console.error("Location error:", error);
        return;
    }
    );

});

async function sendReading(ppm, humidity, temperature, longitude, latitude) {
    const res = await fetch("/api/readings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            device_id: "esp32-1",
            ppm: ppm,
            humidity: humidity,
            temperature: temperature,
            longitude: longitude,
            latitude: latitude,
            time: new Date().toISOString()
        })
    });

    return await res.json();
}
