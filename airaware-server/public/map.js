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
            document.getElementById('temp_value').innerHTML= total_temp/count;
            document.getElementById('humidity_value').innerHTML= total_humidity/count;
            document.getElementById('ppm_value').innerHTML= total_ppm/count;
    }
    else{
            document.getElementById('summary').hidden = true;
            document.getElementById('no-data').hidden = false;
    }
}
setTimeout(update_summary, 1000);
