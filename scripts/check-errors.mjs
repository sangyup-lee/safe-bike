import assert from "node:assert/strict";

// Run against an isolated `next start` process with invalid dummy credentials.
// Never change the primary server's real credentials or enable Seoul HTTP here.
const base = process.env.TEST_ERROR_BASE_URL || "http://127.0.0.1:3101";
assert.equal(new URL(base).hostname, "127.0.0.1");
const paths = [
  "/api/places?q=Seoul",
  "/api/routes?stationId=ST-0&startLat=37.5284&startLng=126.9346&endLat=37.5107&endLng=126.9959&route_mode=BIKE_ONLY",
  "/api/accidents",
  "/api/weather?lat=37.5284&lng=126.9346",
  "/api/stations?lat=37.5284&lng=126.9346",
];
await Promise.all(paths.map(async (path) => {
  const response = await fetch(base + path);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.ok([429, 502, 503].includes(response.status));
  assert.ok(body.error?.code && body.error?.message);
  assert.equal(body.data, undefined);
  assert.equal(text.includes("safe-bike-invalid-test-key"), false);
  console.log(JSON.stringify({ api: path.split("?")[0], status: response.status, code: body.error.code }));
}));
