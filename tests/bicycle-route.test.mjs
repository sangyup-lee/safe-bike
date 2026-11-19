import assert from "node:assert/strict";
import test from "node:test";
import { parseBicycleRoute, routingHttpError } from "../src/lib/bicycle-route.ts";

function response() {
  return { status: "OK", route: { properties: { totalDistance: 4155, totalTime: 1242, landingUrl: "https://map.kakao.com/link/by/bicycle/test" }, legs: [{ steps: [{ path: { points: [[127.11143401, 37.39488363], [127.1115, 37.395]] } }, { path: { points: [[127.12, 37.40], [127.126, 37.419]] } }] }] } };
}
test("parse documented longitude/latitude ordering and preserve separate step geometry", () => {
  const route = parseBicycleRoute(response(), "BIKE_ONLY");
  assert.equal(route.distanceMeters, 4155);
  assert.equal(route.durationSeconds, 1242);
  assert.equal(route.paths.length, 2);
  assert.deepEqual(route.paths[0][0], { lat: 37.39488363, lng: 127.11143401 });
  assert.equal(route.mode, "BIKE_ONLY");
  assert.equal(route.paths.flat().length, 4, "Do not add connecting/interpolated coordinates");
});
test("no-result statuses produce explanations without generated paths", () => {
  for (const status of ["SAME_POINT", "START_LINK_NOT_FOUND", "END_LINK_NOT_FOUND", "TOO_MANY_SEARCH_LINK", "TOO_FAR_AWAY", "ROUTE_RESULT_NOT_FOUND"]) {
    assert.throws(() => parseBicycleRoute({ status }, "SHORTEST"), (error) => error.code === status && error.message.length > 0);
  }
});
test("reject missing geometry, reversed coordinate order and invalid distances", () => {
  const empty = response(); empty.route.legs = [];
  assert.throws(() => parseBicycleRoute(empty, "BIKE_ONLY"));
  const reversed = response(); reversed.route.legs[0].steps[0].path.points[0] = [37.4, 127.1];
  assert.throws(() => parseBicycleRoute(reversed, "BIKE_ONLY"));
  const invalid = response(); invalid.route.properties.totalDistance = NaN;
  assert.throws(() => parseBicycleRoute(invalid, "SHORTEST"));
});
test("allow only Kakao HTTPS landing links and provide safe HTTP failure reasons", () => {
  const body = response(); body.route.properties.landingUrl = "https://example.com/?secret=value";
  assert.equal(parseBicycleRoute(body, "SHORTEST").landingUrl, null);
  assert.equal(routingHttpError(401).code, "KAKAO_AUTHENTICATION_FAILED");
  assert.equal(routingHttpError(403).code, "KAKAO_PERMISSION_DENIED");
  assert.equal(routingHttpError(429).code, "KAKAO_QUOTA_EXCEEDED");
});
