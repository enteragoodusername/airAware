let lat = 29.65;
let lon = -82.35;

var map = L.map('map').setView([lat, lon], 13);
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const redIcon= new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
navigator.geolocation.getCurrentPosition(
    (position) => {
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        
        map.setView([lat, lon],15);
        var marker = L.marker([lat, lon], {icon: blueIcon}).addTo(map);

        console.log("Latitude:", lat);
        console.log("Longitude:", lon);
    },
    (error) => {
        console.error("Location error:", error);
    }
);
fetch("/api/readings")
    .then(function (res) {
        return res.json();
    })
    .then(function (data) {
        let icon;
        data.forEach((reading) => {
                let ppm = reading.ppm; 
                if (ppm < 1000) {
                    icon = greenIcon;
                } else if (ppm < 1500) {
                    icon = yellowIcon;
                } else if (ppm < 4000) {
                    icon = orangeIcon;
                } else {
                    icon = redIcon;
                }
                let marker = L.marker([reading.latitude, reading.longitude], {icon: icon}).addTo(map);
                marker.reading = reading;
            
                marker.bindPopup(`
                    <strong>PPM:</strong> ${reading.ppm}<br>
                    <strong>Humidity:</strong> ${reading.humidity}<br>
                    <strong>Temperature:</strong> ${reading.temperature}<br>
                    <strong>Time:</strong> ${reading.time}
                `);
        });
            
        console.log(data);
    })
    .catch(function (err) {
        console.error(err);
    });
map.on("zoomend", (e) => { 
    update_summary();
});

map.on("moveend", (e) => { 
    update_summary();
});

function update_summary(){
    let count = 0;
    let total_temp = 0;
    let total_ppm = 0;
    let total_humidity = 0;
    let bounds = map.getBounds();
    
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && bounds.contains(layer.getLatLng())) {
            if ('reading' in layer){
                total_ppm += layer.reading.ppm;
                total_humidity += layer.reading.humidity;
                total_temp += layer.reading.temperature;
                count++;
            }
        }

    });
    if (count !== 0){
            document.getElementById('summary').hidden = false;
            document.getElementById('no-data').hidden = true;
            let avgTemp = parseFloat(total_temp/count).toFixed(1);
            let avgHum = parseFloat(total_humidity/count).toFixed(1);
            let avgPpm = parseFloat(total_ppm/count).toFixed(1);

            document.getElementById('temp_value').innerHTML = avgTemp;
            document.getElementById('humidity_value').innerHTML = avgHum;
            document.getElementById('ppm_value').innerHTML = avgPpm;

            updateDashboardGauges(Number(avgTemp), Number(avgPpm), Number(avgHum));
    }
    else{
            document.getElementById('summary').hidden = true;
            document.getElementById('no-data').hidden = false;
    }
}
setTimeout(update_summary, 1000);


function createGauge(containerId, min, max, color = '#00c9b8') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
      <div class="css-gauge" data-min="${min}" data-max="${max}">
          <div class="css-gauge__track">
              <div class="css-gauge__fill" style="width: 0%; background: ${color};"></div>
              <div class="css-gauge__thumb"></div>
          </div>
          <div class="css-gauge__labels">
              <span>${min}</span>
              <span>${max}</span>
          </div>
      </div>`;
}

function updateGauge(containerId, value, color) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const gauge = container.querySelector('.css-gauge');
  const fill  = container.querySelector('.css-gauge__fill');
  const thumb = container.querySelector('.css-gauge__thumb');
  if (!gauge || !fill) return;

  const min = parseFloat(gauge.dataset.min);
  const max = parseFloat(gauge.dataset.max);
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  fill.style.width = pct + '%';
  if (color) fill.style.background = color;
  if (thumb) thumb.style.left = `calc(${pct}% - 6px)`;
}

// Initialise gauges 
createGauge('temp_chart',     0,    50,   'linear-gradient(90deg, #00c9b8, #c8f135)');
createGauge('ppm_chart',      0,  3000,   '#00c9b8');
createGauge('humidity_chart', 0,   100,   'linear-gradient(90deg, #00c9b8, #6ec6ff)');


function updateDashboardGauges(temp, ppm, hum) {
  let ppmColor = '#00c9b8';
  if (ppm > 1000 && ppm < 1500) ppmColor = '#FFD700';
  if (ppm >= 1500)               ppmColor = '#FF4500';

  updateGauge('temp_chart',     temp, 'linear-gradient(90deg, #00c9b8, #c8f135)');
  updateGauge('ppm_chart',      ppm,  ppmColor);
  updateGauge('humidity_chart', hum,  'linear-gradient(90deg, #00c9b8, #6ec6ff)');
}

function update_summary() {
  let count = 0, total_temp = 0, total_ppm = 0, total_humidity = 0;
  const bounds = map.getBounds();

  map.eachLayer(function(layer) {
      if (layer instanceof L.Marker && bounds.contains(layer.getLatLng()) && 'reading' in layer) {
          total_ppm      += layer.reading.ppm;
          total_humidity += layer.reading.humidity;
          total_temp     += layer.reading.temperature;
          count++;
      }
  });

  if (count !== 0) {
      document.getElementById('summary').hidden  = false;
      document.getElementById('no-data').hidden  = true;

      const avgTemp = parseFloat(total_temp     / count).toFixed(1);
      const avgHum  = parseFloat(total_humidity / count).toFixed(1);
      const avgPpm  = parseFloat(total_ppm      / count).toFixed(1);

      document.getElementById('temp_value').innerHTML     = avgTemp;
      document.getElementById('humidity_value').innerHTML = avgHum;
      document.getElementById('ppm_value').innerHTML      = avgPpm;

      updateDashboardGauges(Number(avgTemp), Number(avgPpm), Number(avgHum));
  } else {
      document.getElementById('summary').hidden = true;
      document.getElementById('no-data').hidden = false;
  }
}

setTimeout(update_summary, 1000);
