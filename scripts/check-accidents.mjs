import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { annotateHotspots, LATEST_ACCIDENT_YEAR } from "../src/lib/accidents.ts";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const response = await fetch(`${base}/api/accidents`);
const raw = await response.text();
let key = process.env.DATA_GO_KR_API_KEY;
if (key) {
  assert.equal(raw.includes(key), false, "Credential found in response");
  try { key = decodeURIComponent(key); } catch { /* Keep raw. */ }
  assert.equal(raw.includes(key), false, "Decoded credential found in response");
}
assert.equal(response.status, 200, "Live accident API failed");
const body = JSON.parse(raw);
assert.equal(body.meta.isDemo, false);
assert.equal(body.meta.historical, true);
assert.equal(body.data.year, LATEST_ACCIDENT_YEAR);
assert.equal(body.data.latestAvailableYear, LATEST_ACCIDENT_YEAR);
assert.equal(body.data.accidents.length + body.data.excludedRows, body.data.total);
assert.ok(body.data.accidents.length > 0);
assert.ok(body.data.accidents.every((item) => item.accidentCount >= 0 && item.id && Number.isFinite(item.lat) && Number.isFinite(item.lng)));

// Real Kakao route for public Yeouido/Banpo park coordinates. ST-0 is a probe ID,
// not a selected real station, and this route is never injected into the UI.
const params = new URLSearchParams({ stationId: "ST-0", startLat: "37.5284", startLng: "126.9346", endLat: "37.5107", endLng: "126.9959", route_mode: "BIKE_ONLY" });
const routeResponse = await fetch(`${base}/api/routes?${params}`);
assert.equal(routeResponse.status, 200, "Live Kakao route needed for proximity integration check");
const routeBody = await routeResponse.json();
const hotspots = annotateHotspots(body.data.accidents, routeBody.data.route.paths, 300);
assert.ok(hotspots.every((item, index) => Number.isFinite(item.distanceToRouteMeters) && (index === 0 || hotspots[index - 1].distanceToRouteMeters <= item.distanceToRouteMeters)));
console.log(JSON.stringify({ year: body.data.year, seoulHotspots: body.data.accidents.length, polygons: body.data.accidents.filter((item) => item.polygon).length, routeDistanceMeters: routeBody.data.route.distanceMeters, hotspotsWithin300m: hotspots.filter((item) => item.nearRoute).length, historical: body.meta.historical }));
