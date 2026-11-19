import assert from "node:assert/strict";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const key = process.env.KAKAO_REST_API_KEY;
let failed = false;
// Official Kakao documentation coordinates only. ST-0 is a probe identifier,
// not a real selected station; this does not verify the station selection workflow.
for (const mode of ["BIKE_ONLY", "SHORTEST"]) {
  const params = new URLSearchParams({ stationId: "ST-0", startLat: "37.394776627382875", startLng: "127.11119669891646", endLat: "37.4199323570413", endLng: "127.12629039752096", route_mode: mode });
  const response = await fetch(`${base}/api/routes?${params}`);
  const raw = await response.text();
  if (key) assert.equal(raw.includes(key), false, "REST API key must never appear in route responses");
  const body = JSON.parse(raw);
  if (!response.ok) {
    assert.equal(body.data, undefined, "Failed routing must not contain generated routes");
    console.log(JSON.stringify({ mode, http: response.status, error: body.error }));
    failed = true;
    continue;
  }
  assert.equal(body.meta.source, "kakao-bicycle");
  assert.equal(body.meta.isDemo, false);
  assert.equal(body.data.route.mode, mode);
  assert.ok(body.data.route.paths.length > 0);
  assert.ok(body.data.route.distanceMeters > 0);
  assert.ok(body.data.route.durationSeconds > 0);
  console.log(JSON.stringify({ mode, http: response.status, distanceMeters: body.data.route.distanceMeters, durationSeconds: body.data.route.durationSeconds, segments: body.data.route.paths.length }));
}
if (failed) process.exitCode = 1;
