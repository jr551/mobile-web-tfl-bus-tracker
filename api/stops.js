const fs = require('fs');
const path = require('path');

function distance(lat1, lon1, lat2, lon2) {
  const theta = lon1 - lon2;
  let dist =
    Math.sin(toRad(lat1)) * Math.sin(toRad(lat2)) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(theta));
  dist = Math.acos(Math.min(1, Math.max(-1, dist)));
  dist = toDeg(dist);
  const miles = dist * 60 * 1.1515;
  return miles;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

module.exports = function handler(req, res) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    res.status(400).json({ error: 'Missing or invalid lat/lon parameters' });
    return;
  }

  const csvPath = path.join(process.cwd(), 'bus_stops_long_lat.csv');

  let csvData;
  try {
    csvData = fs.readFileSync(csvPath, 'utf8');
  } catch (err) {
    res.status(500).json({ error: 'Could not read bus stops data' });
    return;
  }

  const stops = [];
  const lines = csvData.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle CSV fields that may be quoted
    const fields = parseCSVLine(trimmed);
    if (fields.length < 4) continue;

    const naptan = fields[0].trim();
    const name = fields[1].trim();
    const stopLat = parseFloat(fields[2]);
    const stopLon = parseFloat(fields[3]);

    if (isNaN(stopLat) || isNaN(stopLon)) continue;

    const dist = distance(stopLat, stopLon, lat, lon);
    if (dist > 1) continue;

    stops.push({
      distance: dist,
      naptan,
      name,
      lat: stopLat,
      lon: stopLon,
    });
  }

  stops.sort((a, b) => a.distance - b.distance);
  const result = stops.slice(0, 45);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(result);
};

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}
