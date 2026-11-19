import assert from "node:assert/strict";
import test from "node:test";
import { collectStations, distanceMeters, findNearbyStations, parseStationPage } from "../src/lib/stations.ts";

// Provider-shaped fixtures exist only in tests, never in application fallbacks.
const row = (id, lat, bikes = "4") => ({ stationId: id, stationName: `Test ${id}`, stationLatitude: lat, stationLongitude: "126.9346", parkingBikeTotCnt: bikes });
const page = (rows) => ({ rentBikeStatus: { RESULT: { CODE: "INFO-000" }, list_total_count: rows.length, row: rows } });

test("parse numeric strings, zero availability, optional rack count, and invalid coordinates", () => {
  const result = parseStationPage(page([row("ST-1", "37.5284", "0"), row("ST-2", "0"), row("ST-3", "37.53", "-1"), row("ST-4", "37.53", "NaN")]));
  assert.equal(result.rowCount, 4);
  assert.equal(result.stations.length, 1);
  assert.equal(result.stations[0].bikes, 0);
  assert.equal(result.stations[0].capacity, null);
  assert.throws(() => parseStationPage({ RESULT: { CODE: "ERROR-300", MESSAGE: "secret value" } }));
});

test("paginate before sorting, deduplicate IDs, and ignore page-local list_total_count", async () => {
  const calls = [];
  const stations = await collectStations(async (first, last) => {
    calls.push([first, last]);
    return first === 1 ? page([row("ST-1", "37.55"), row("ST-2", "37.54")]) : page([row("ST-3", "37.5284")]);
  }, 2);
  assert.deepEqual(calls, [[1, 2], [3, 4]]);
  const nearby = findNearbyStations(stations, { lat: 37.5284, lng: 126.9346 }, 5000, 0, 2);
  assert.equal(nearby.stations[0].id, "ST-3");
  assert.equal(nearby.matchedCount, 3);
  assert.equal(nearby.stations.length, 2);
});

test("exact page boundary terminates at INFO-200; duplicates retain latest row", async () => {
  let calls = 0;
  const stations = await collectStations(async () => {
    calls++;
    if (calls === 1) return page([row("ST-1", "37.5284", "1"), row("ST-1", "37.5284", "9")]);
    return { RESULT: { CODE: "INFO-200" } };
  }, 2);
  assert.equal(calls, 2);
  assert.equal(stations.length, 1);
  assert.equal(stations[0].bikes, 9);
});

test("partial failure does not return a partial station snapshot", async () => {
  await assert.rejects(collectStations(async (first) => {
    if (first === 1) return page([row("ST-1", "37.5284")]);
    throw new Error("offline");
  }, 1));
  await assert.rejects(collectStations(async () => ({ RESULT: { CODE: "INFO-200" } })));
});

test("distance, radius, bike availability, name and limit filters", () => {
  const origin = { lat: 37.5284, lng: 126.9346 };
  assert.equal(distanceMeters(origin, origin), 0);
  const north = distanceMeters(origin, { ...origin, lat: origin.lat + 0.001 });
  assert.ok(north > 111 && north < 112);
  const stations = parseStationPage(page([row("ST-1", "37.5284", "0"), row("ST-2", "37.5294", "3"), row("ST-3", "37.55", "20")])).stations;
  const result = findNearbyStations(stations, origin, 500, 1, 30);
  assert.deepEqual(result.stations.map((s) => s.id), ["ST-2"]);
  assert.equal(findNearbyStations(stations, origin, 5000, 0, 30, "ST-3").stations.length, 1);
  assert.equal(findNearbyStations(stations, origin, 100, 1, 30).stations.length, 0);
});
