// Initialize Map
const map = L.map('map', {
    zoomControl: false,
    attributionControl: false
}).setView([0, 0], 2);

// Dark Mode Map Tiles (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
}).addTo(map);

// Custom Pulsing Icon
const pulsingIcon = L.divIcon({
    className: 'custom-pulse-icon',
    html: '<div class="pulse-marker"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Mock Data for "Bad Air Quality" alerts TEMPORARYYYYYYYYY!!!!
const mockAlerts = [
    { lat: 40.7128, lon: -74.0060, ppm: 1850, city: "New York" },
    { lat: 34.0522, lon: -118.2437, ppm: 2100, city: "Los Angeles" },
    { lat: 51.5074, lon: -0.1278, ppm: 1600, city: "London" },
    { lat: 35.6762, lon: 139.6503, ppm: 2400, city: "Tokyo" }
];

function loadAlerts() {
    mockAlerts.forEach(alert => {
        L.marker([alert.lat, alert.lon], { icon: pulsingIcon })
            .addTo(map)
            .bindPopup(`<div style="color: #070d1f; font-family: 'Orbitron'; font-size: 0.7rem;">
                <strong>CRITICAL ALERT: ${alert.city}</strong><br>
                Concentration: ${alert.ppm} PPM
            </div>`);
    });

    // Update Stats UI TEMPORARYYYYYYYYY!!!!
    document.getElementById('avg_ppm').textContent = "1987";
    document.getElementById('avg_temp').textContent = "24.2";
    document.getElementById('avg_humid').textContent = "58.4";
}

// Focus on user location if available
navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 10);
});

loadAlerts();