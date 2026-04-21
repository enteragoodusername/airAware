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


const { AgCharts } = agCharts;

function createGaugeOptions(containerId, min, max, unit) {
  return {
      type: "linear-gauge",
      container: document.getElementById(containerId),
      value: 0,
      background: {
          fill: "transparent", 
      },
      theme: {
          overrides: {
              "linear-gauge": {
                  background: {
                      fill: "transparent",
                  },
                  series: {
                      fill: "#4facfe", 
                      fillOpacity: 0.8,
                      strokeWidth: 0,
                      backgroundFill: "rgba(255, 255, 255, 0.1)",
                  }
              },
          },
      },
      scale: {
          min,
          max,
          label: {
              fontFamily: "inherit",
              color: "#009e90", 
          }
      },
      direction: "horizontal",
      cornerRadius: 99,
      cornerMode: "container",
      padding: { left: 5, right: 5, bottom: 20, top: 5 },
  };
}

const tempChart = AgCharts.createGauge(createGaugeOptions("temp_chart", 0, 150, "°C"));
const ppmChart = AgCharts.createGauge(createGaugeOptions("ppm_chart", 0, 3000, "ppm"));
const humidityChart = AgCharts.createGauge(createGaugeOptions("humidity_chart", 0, 100, "%"));


function updateDashboardGauges(temp, ppm, hum) {
    document.getElementById("temp_value").innerText = temp;
    document.getElementById("ppm_value").innerText = ppm;
    document.getElementById("humidity_value").innerText = hum;

    tempChart.update({ value: temp });
    ppmChart.update({ value: ppm });
    humidityChart.update({ value: hum });
}