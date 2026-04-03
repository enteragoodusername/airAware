const express = require("express");
const dotenv = require("dotenv");
const sql = require("mssql");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static("public"));

const dbConfig = {
    server: process.env.SQL_SERVER,
    port: parseInt(process.env.SQL_PORT || "1433", 10),
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

let poolPromise = sql.connect(dbConfig);

function buildZoneFromRow(row) {
    const zoneLat = row.zone_lat;
    const zoneLng = row.zone_lng;
    const ppm = row.ppm;
    const lastUpdate = row.last_update;

    let status;
    if (ppm > 55) {
        status = "HAZARDOUS";
    } else if (ppm > 25) {
        status = "MODERATE";
    } else {
        status = "SAFE";
    }

    return {
        zone_id: `${zoneLat}_${zoneLng}`,
        center_lat: zoneLat,
        center_lng: zoneLng,
        ppm: ppm,
        status: status,
        last_update: lastUpdate
    };
}

app.get("/api", function (req, res) {
    res.json({ message: "AirAware backend is running" });
});

app.post("/api/readings", async function (req, res) {
    try {
        const reading = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input("device_id", sql.NVarChar, reading.device_id)
            .input("ppm", sql.Float, reading.ppm)
            .input("humidity", sql.Float, reading.humidity)
            .input("temperature", sql.Float, reading.temperature)
            .input("longitude", sql.Float, reading.longitude)
            .input("latitude", sql.Float, reading.latitude)
            .input("time", sql.DateTime2, reading.time)
            .query(`
                INSERT INTO dbo.Readings (
                    device_id, ppm, humidity, temperature,
                    longitude, latitude, time
                )
                VALUES (
                    @device_id, @ppm, @humidity, @temperature,
                    @longitude, @latitude, @time
                )
            `);

        res.json({ message: "Reading stored in database" });
    } catch (e) {
        console.error("ERROR IN /api/readings:", e);
        res.status(500).json({ error: "Failed to store reading" });
    }
});

app.get("/api/map-data", async function (req, res) {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT
                ROUND(latitude, 3) AS zone_lat,
                ROUND(longitude, 3) AS zone_lng,
                AVG(ppm) AS ppm,
                MAX(time) AS last_update
            FROM dbo.Readings
            GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
            ORDER BY last_update DESC
        `);

        res.json(result.recordset.map(buildZoneFromRow));
    } catch (e) {
        console.error("ERROR IN /api/map-data:", e);
        res.status(500).json({ error: "Failed to fetch map data" });
    }
});

app.get("/api/zone-status", async function (req, res) {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return res.status(400).json({ error: "lat and lng must be valid numbers" });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input("lat", sql.Float, lat)
            .input("lng", sql.Float, lng)
            .query(`
                SELECT
                    ROUND(latitude, 3) AS zone_lat,
                    ROUND(longitude, 3) AS zone_lng,
                    AVG(ppm) AS ppm,
                    MAX(time) AS last_update
                FROM dbo.Readings
                WHERE ROUND(latitude, 3) = ROUND(@lat, 3)
                  AND ROUND(longitude, 3) = ROUND(@lng, 3)
                GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
            `);

        if (!result.recordset.length) {
            return res.json({ message: "Zone not found" });
        }

        res.json(buildZoneFromRow(result.recordset[0]));
    } catch (e) {
        console.error("ERROR IN /api/zone-status:", e);
        res.status(500).json({ error: "Failed to fetch zone status" });
    }
});
app.get("/api/readings", async function (req, res) {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT
                device_id,
                ppm,
                humidity,
                temperature,
                longitude,
                latitude,
                time
            FROM dbo.Readings
            ORDER BY time DESC
        `);

        res.json(result.recordset);
    } catch (e) {
        console.error("ERROR IN /api/readings:", e);
        res.status(500).json({ error: "Failed to fetch readings" });
        if (e.code === "ETIMEOUT") {

            poolPromise = sql.connect(dbConfig);
        }
    }
});

app.listen(port, "0.0.0.0", function () {
    console.log(`Listening on http://0.0.0.0:${port}`);
});
