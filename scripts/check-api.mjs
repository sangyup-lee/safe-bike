import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const secrets = ["SEOUL_API_KEY", "DATA_GO_KR_API_KEY", "KAKAO_REST_API_KEY"]
  .flatMap((name) => {
    const value = process.env[name];
    if (!value) return [];
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch { /* Use raw value. */ }
    return [...new Set([value, decoded, encodeURIComponent(decoded)])];
  });

function noSecrets(content, label) {
  for (const secret of secrets) assert.equal(content.includes(secret), false, `Server credential found in ${label}`);
}

async function request(endpoint, status, method = "GET") {
  const response = await fetch(`${base}${endpoint}`, { method });
  const body = await response.text();
  noSecrets(body, "HTTP response");
  assert.equal(response.status, status, `Unexpected status for ${endpoint}`);
  if (status === 200 || status === 400) assert.equal(response.headers.get("cache-control"), "no-store");
  return body ? JSON.parse(body) : null;
}

const search = await request("/api/places?q=" + encodeURIComponent("여의도"), 200);
assert.equal(search.meta.isDemo, false);
assert.ok(search.data.places.length > 0);
const empty = await request("/api/places?q=zzzz_safe_bike_no_results_20261119_7fa9", 200);
assert.equal(empty.data.places.length, 0);
const stationResponse = await fetch(`${base}/api/stations?lat=37.5284&lng=126.9346&radius=2000`);
const stationBody = await stationResponse.text();
noSecrets(stationBody, "station response");
const stationResult = JSON.parse(stationBody);
if (stationResponse.status === 200) {
  assert.equal(stationResult.meta.isDemo, false);
  assert.equal(stationResult.meta.source, "seoul-bikeList");
  const rows = stationResult.data.stations;
  assert.ok(rows.every((s, i) => s.distanceMeters <= 2000 && (i === 0 || rows[i - 1].distanceMeters <= s.distanceMeters)));
  console.log("Live stations: verified sorted response.");
} else {
  assert.ok([502, 503].includes(stationResponse.status));
  assert.equal(stationResult.data, undefined, "No mock station fallback is allowed");
  assert.deepEqual(Object.keys(stationResult.error).sort(), ["code", "message"]);
  assert.notEqual(process.env.EXPECT_LIVE_STATIONS, "true", "Expected a successful live station query");
  console.log("Stations: verified sanitized unavailable state; live success remains unverified.");
}
const forecast = await request("/api/weather?lat=37.5284&lng=126.9346", 200);
assert.equal(forecast.meta.isDemo, false);
assert.equal(forecast.meta.isObservation, false);
assert.ok(Number.isFinite(forecast.data.current.temperature));
assert.ok(forecast.data.current.precipitationProbability >= 0 && forecast.data.current.precipitationProbability <= 100);
assert.deepEqual(forecast.data.grid, { nx: 59, ny: 126 });
await request("/api/weather", 400);
await request("/api/weather?lat=NaN&lng=126.9346", 400);
await request("/api/weather?lat=37.5284&lng=181", 400);
const accidentResult = await request("/api/accidents", 200);
assert.equal(accidentResult.meta.isDemo, false);
assert.equal(accidentResult.meta.historical, true);
assert.equal(accidentResult.data.year, accidentResult.data.latestAvailableYear);
assert.ok(accidentResult.data.accidents.length > 0);
await request("/api/routes?start=yeouido&end=banpo&kind=safe", 400);
await request("/api/routes?stationId=ST-0&startLat=37.52&startLng=126.93&endLat=37.53&endLng=126.94&route_mode=DRIVING", 400);
await request("/api/routes?stationId=ST-0&startLat=37.52&startLng=126.93&endLat=37.52&endLng=126.93", 400);
for (const endpoint of ["/api/places", "/api/places?q=x&page=-1", "/api/places?q=x&q=y", "/api/stations?page=0", "/api/stations?lat=NaN&lng=126.93", "/api/stations?lat=37.52&lng=126.93&radius=999999", "/api/stations?lat=37.52&lng=126.93&minBikes=-1", "/api/stations?lat=37.52&lng=126.93&limit=101", "/api/weather?nx=NaN", "/api/weather?ny=999", "/api/accidents?district=999", "/api/accidents?year=9999", "/api/routes?start=yeouido&end=yeouido", "/api/stations?url=https://example.com", "/api/stations?mode=live"]) {
  const result = await request(endpoint, 400);
  assert.equal(result.error.code, "INVALID_QUERY");
}
await request("/api/stations", 405, "POST");
const html = await (await fetch(base)).text();
noSecrets(html, "page HTML");
for (const endpoint of ["/.env", "/.env.local", "/.env.example", "/src/server/env.ts"]) {
  const response = await fetch(`${base}${endpoint}`);
  assert.equal(response.status, 404, "Sensitive project files must not be served");
  noSecrets(await response.text(), "file request");
}

async function scanPublicFiles(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) await scanPublicFiles(file);
    else noSecrets(await readFile(file, "utf8"), "public build asset");
  }
}
await scanPublicFiles(path.join(process.cwd(), ".next", "static"));
await scanPublicFiles(path.join(process.cwd(), "public"));
console.log("Passed: live APIs, empty place search, input validation, HTTP methods, hidden env files, and server-key checks in responses and public build assets.");
