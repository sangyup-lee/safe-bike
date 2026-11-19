import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRoutes } from "../src/lib/route-summary.ts";

const row = (mode, distanceMeters, count = 2) => ({ mode, distanceMeters, durationSeconds: distanceMeters === null ? null : 1416, nearbyHotspotCount: count, hotspots: [] });
test("summarize selected route, actual distance difference, year and threshold", () => {
  const text = summarizeRoutes([row("BIKE_ONLY", 6983), row("SHORTEST", 6893)], "SHORTEST", 2025, 300).join(" ");
  assert.match(text, /현재 지도에 선택한 최단 경로/);
  assert.match(text, /6,893m/);
  assert.match(text, /24분/);
  assert.match(text, /2025년.*300m.*2곳/);
  assert.match(text, /최단 경로가 다른 경로보다 약 90m 짧습니다/);
});
test("unavailable accidents are not summarized as zero, verified zero is retained", () => {
  assert.doesNotMatch(summarizeRoutes([row("BIKE_ONLY", 1000, null)], "BIKE_ONLY", null, 300).join(" "), /0곳|관측|안전합니다/);
  assert.match(summarizeRoutes([row("BIKE_ONLY", 1000, 0)], "BIKE_ONLY", 2025, 500).join(" "), /500m.*0곳/);
});
test("partial failure cannot create a comparison or an invented route", () => {
  const text = summarizeRoutes([row("BIKE_ONLY", null, null), row("SHORTEST", 1000)], "BIKE_ONLY", 2025, 300);
  assert.equal(text.length, 1);
  assert.doesNotMatch(text[0], /현재 지도에 선택한|짧습니다|자전거도로 우선/);
  assert.deepEqual(summarizeRoutes([row("BIKE_ONLY", null)], "BIKE_ONLY", null, 300), []);
});
test("equal route distances do not invent a difference", () => {
  assert.equal(summarizeRoutes([row("BIKE_ONLY", 1000), row("SHORTEST", 1000)], "BIKE_ONLY", 2025, 300).at(-1), "두 경로의 조회 거리는 같습니다.");
});
