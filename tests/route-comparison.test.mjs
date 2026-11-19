import assert from "node:assert/strict";
import test from "node:test";
import { compareRoutes } from "../src/lib/route-comparison.ts";
import { informationTime } from "../src/lib/information.ts";

const route = (mode, lat, distanceMeters = 1000) => ({ mode, distanceMeters, durationSeconds: 360, paths: [[{ lat, lng: 126.92 }, { lat, lng: 126.94 }]], landingUrl: null });
const hotspot = { id: "test-1", name: "Test historical hotspot", district: "서울", lat: 37.5205, lng: 126.93, accidentCount: 4, casualties: 4, deaths: 0, severeInjuries: 1, polygon: null };

test("compare both real geometries against the same hotspot data and threshold", () => {
  const rows = compareRoutes({ BIKE_ONLY: route("BIKE_ONLY", 37.52, 1500), SHORTEST: route("SHORTEST", 37.53, 1200) }, [hotspot], 300);
  assert.equal(rows[0].distanceMeters, 1500);
  assert.equal(rows[1].distanceMeters, 1200);
  assert.equal(rows[0].nearbyHotspotCount, 1);
  assert.equal(rows[1].nearbyHotspotCount, 0);
  assert.equal(rows[0].hotspots[0].nearRoute, true);
  assert.equal(compareRoutes({ BIKE_ONLY: route("BIKE_ONLY", 37.52), SHORTEST: route("SHORTEST", 37.53) }, [hotspot], 1000)[1].nearbyHotspotCount, 0);
});

test("unknown accident data is not a verified zero; a verified empty dataset is zero", () => {
  const routes = { BIKE_ONLY: route("BIKE_ONLY", 37.52), SHORTEST: route("SHORTEST", 37.53) };
  assert.equal(compareRoutes(routes, null, 300)[0].nearbyHotspotCount, null);
  assert.equal(compareRoutes(routes, [], 300)[0].nearbyHotspotCount, 0);
});

test("missing or failed route remains unavailable and does not affect the other option", () => {
  const rows = compareRoutes({ BIKE_ONLY: null, SHORTEST: route("SHORTEST", 37.52) }, [hotspot], 300);
  assert.equal(rows[0].distanceMeters, null);
  assert.equal(rows[0].durationSeconds, null);
  assert.equal(rows[0].nearbyHotspotCount, null);
  assert.equal(rows[1].nearbyHotspotCount, 1);
});

test("timestamps explicitly format in Korea time and unavailable timestamps are not invented", () => {
  const formatted = informationTime("2026-11-19T08:00:00.000Z");
  assert.ok(formatted.includes("17:00:00"));
  assert.equal(informationTime(""), "미조회");
  assert.equal(informationTime("invalid"), "미조회");
});
