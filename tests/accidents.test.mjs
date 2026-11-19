import assert from "node:assert/strict";
import test from "node:test";
import { annotateHotspots, collectAccidents, distanceToRouteMeters, parseAccidentPage, pointToSegmentMeters } from "../src/lib/accidents.ts";

const row = (id = 1) => ({ afos_fid: id, spot_nm: "Test hotspot", sido_sgg_nm: "서울", la_crd: "37.52", lo_crd: "126.93", occrrnc_cnt: "4", caslt_cnt: 5, dth_dnv_cnt: 0, se_dnv_cnt: 2, geom_json: JSON.stringify({ type: "Polygon", coordinates: [[[126.93, 37.52], [126.931, 37.52], [126.931, 37.521], [126.93, 37.52]]] }) });
const page = (rows, total = rows.length) => ({ resultCode: "00", totalCount: total, items: { item: rows } });

test("parse provider statistics, singleton items and official polygon coordinates", () => {
  const result = parseAccidentPage({ resultCode: "00", totalCount: 1, items: { item: row() } });
  assert.equal(result.accidents[0].accidentCount, 4);
  assert.equal(result.accidents[0].deaths, 0);
  assert.deepEqual(result.accidents[0].polygon[0][0], { lat: 37.52, lng: 126.93 });
  assert.equal(result.accidents[0].polygon[0].length, 4);
  const invalid = row(); invalid.la_crd = "0";
  assert.equal(parseAccidentPage(page([invalid])).excluded, 1);
});
test("distinguish an official empty response from denied access", () => {
  assert.equal(parseAccidentPage({ resultCode: "03" }).total, 0);
  assert.throws(() => parseAccidentPage({ resultCode: "99", resultMsg: "secret error" }));
  const invalidPolygon = row(); invalidPolygon.geom_json = "invalid JSON";
  assert.equal(parseAccidentPage(page([invalidPolygon])).accidents[0].polygon, null);
});
test("collect every page and reject partial, duplicated or changed datasets", async () => {
  const result = await collectAccidents(async (number) => page([row(number)], 2), 1);
  assert.equal(result.accidents.length, 2);
  await assert.rejects(collectAccidents(async (number) => number === 1 ? page([row()], 2) : page([], 2), 1));
  await assert.rejects(collectAccidents(async () => page([row()], 2), 1));
  await assert.rejects(collectAccidents(async (number) => page([row(number)], number === 1 ? 2 : 3), 1));
});
test("measure shortest distance to segment interior instead of only route vertices", () => {
  const start = { lat: 0, lng: 0 }, end = { lat: 0, lng: 0.01 };
  const meters = pointToSegmentMeters({ lat: 0.001, lng: 0.005 }, start, end);
  assert.ok(Math.abs(meters - 111.195) < 0.1);
  assert.ok(pointToSegmentMeters({ lat: 0, lng: -0.001 }, start, end) > 111);
  assert.ok(pointToSegmentMeters({ lat: 0, lng: 0.011 }, start, end) > 111);
  assert.equal(pointToSegmentMeters(start, start, start), 0);
});
test("do not invent a connector across disconnected route steps", () => {
  const paths = [[{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }], [{ lat: 0, lng: 0.01 }, { lat: 0, lng: 0.011 }]];
  assert.ok(distanceToRouteMeters({ lat: 0, lng: 0.005 }, paths) > 400);
  assert.equal(distanceToRouteMeters({ lat: 0, lng: 0 }, []), null);
});
test("sort and flag nearby historical hotspots; no route is not a safe-route verdict", () => {
  const paths = [[{ lat: 37.52, lng: 126.92 }, { lat: 37.52, lng: 126.94 }]];
  const base = parseAccidentPage(page([row()])).accidents[0];
  const results = annotateHotspots([{ ...base, id: "far", lat: 37.53 }, { ...base, id: "near", lat: 37.5205 }], paths, 300);
  assert.equal(results[0].id, "near"); assert.equal(results[0].nearRoute, true); assert.equal(results[1].nearRoute, false);
  const absent = annotateHotspots([base], null, 300)[0];
  assert.equal(absent.distanceToRouteMeters, null); assert.equal(absent.nearRoute, false);
});
