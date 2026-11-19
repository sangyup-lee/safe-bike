import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { compareRoutes } from "../src/lib/route-comparison.ts";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const secrets = ["SEOUL_API_KEY", "DATA_GO_KR_API_KEY", "KAKAO_REST_API_KEY"].flatMap((name) => {
  const value = process.env[name]; if (!value) return [];
  try { return [value, decodeURIComponent(value)]; } catch { return [value]; }
});

async function read(endpoint) {
  const response = await fetch(`${base}${endpoint}`), text = await response.text();
  for (const value of secrets) assert.equal(text.includes(value), false, "Server credential exposed in API response");
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`Expected API JSON; received HTTP ${response.status}. Check the development server.`); }
  return { status: response.status, body };
}
// Public park coordinates used only for integration verification. ST-0 is a probe ID,
// not an actual selected station. These results are never injected into the product UI.
const params = new URLSearchParams({ stationId: "ST-0", startLat: "37.5284", startLng: "126.9346", endLat: "37.5107", endLng: "126.9959" });
const [stations, accidents, weather, bike, short] = await Promise.all([
  read("/api/stations?lat=37.5284&lng=126.9346&radius=2000"), read("/api/accidents"), read("/api/weather?lat=37.5284&lng=126.9346"), read(`/api/routes?${params}&route_mode=BIKE_ONLY`), read(`/api/routes?${params}&route_mode=SHORTEST`),
]);
for (const result of [accidents, weather, bike, short]) {
  assert.equal(result.status, 200);
  assert.equal(result.body.meta.isDemo, false);
  assert.ok(Number.isFinite(Date.parse(result.body.meta.fetchedAt)));
  assert.ok(result.body.meta.sourceUrl.startsWith("https://"));
}
if (stations.status === 200) {
  assert.equal(stations.body.meta.observedAt, null);
  assert.equal(stations.body.meta.measurementTimeProvided, false);
} else {
  assert.ok([502, 503].includes(stations.status));
  assert.equal(stations.body.data, undefined, "Unavailable inventory must not be fabricated");
}
assert.equal(accidents.body.meta.historical, true);
assert.equal(weather.body.meta.isObservation, false);
const rows = compareRoutes({ BIKE_ONLY: bike.body.data.route, SHORTEST: short.body.data.route }, accidents.body.data.accidents, 300);
assert.ok(rows.every((row) => Number.isInteger(row.nearbyHotspotCount) && row.nearbyHotspotCount >= 0));
assert.equal(compareRoutes({ BIKE_ONLY: bike.body.data.route, SHORTEST: short.body.data.route }, null, 300)[0].nearbyHotspotCount, null);
console.log(JSON.stringify({ stationStatus: stations.status, accidentYear: accidents.body.data.year, thresholdMeters: 300, comparison: rows.map(({ mode, distanceMeters, durationSeconds, nearbyHotspotCount }) => ({ mode, distanceMeters, durationSeconds, nearbyHotspotCount })), weatherIssue: weather.body.data.issuedAt, weatherForecast: weather.body.data.current.forecastAt, sourcesAndRetrievalTimes: "verified" }));
