import assert from "node:assert/strict";
import test from "node:test";
import { collectForecastItems, combineForecastItems, forecastBase, kmaTimestamp, parseForecastPage, previousForecastBase, selectUpcomingForecast, toKmaGrid } from "../src/lib/weather.ts";

const grid = { nx: 59, ny: 126 };
const base = { date: "20261119", time: "1700", issuedAt: "2026-11-19T08:00:00.000Z" };
const item = (category, value, time = "1800", date = "20261119") => ({ baseDate: base.date, baseTime: base.time, nx: grid.nx, ny: grid.ny, category, fcstDate: date, fcstTime: time, fcstValue: value });
const page = (items, total = items.length) => ({ response: { header: { resultCode: "00" }, body: { totalCount: total, items: { item: items } } } });

test("KMA grid projection: official reference point, Seoul City Hall and verified Yeouido", () => {
  assert.deepEqual(toKmaGrid(38, 126), { nx: 43, ny: 136 });
  assert.deepEqual(toKmaGrid(37.5665, 126.9780), { nx: 60, ny: 127 });
  assert.deepEqual(toKmaGrid(37.5284, 126.9346), grid);
  assert.throws(() => toKmaGrid(NaN, 126.93));
  assert.throws(() => toKmaGrid(126.93, 37.52));
});

test("publication schedule, ten-minute grace and previous-day/year rollover in KST", () => {
  const cases = [
    ["2026-11-19T02:09:59+09:00", "20261118", "2300"],
    ["2026-11-19T02:10:00+09:00", "20261119", "0200"],
    ["2026-11-19T05:09:59+09:00", "20261119", "0200"],
    ["2026-11-19T05:10:00+09:00", "20261119", "0500"],
    ["2026-11-19T23:09:59+09:00", "20261119", "2000"],
    ["2026-11-19T23:10:00+09:00", "20261119", "2300"],
    ["2027-01-01T00:05:00+09:00", "20261231", "2300"],
  ];
  for (const [now, date, time] of cases) {
    const actual = forecastBase(new Date(now));
    assert.equal(actual.date, date); assert.equal(actual.time, time);
    assert.equal(actual.issuedAt, kmaTimestamp(date, time));
  }
  const previous = previousForecastBase(forecastBase(new Date("2026-11-19T02:10:00+09:00")));
  assert.equal(previous.date, "20261118"); assert.equal(previous.time, "2300");
});

test("group TMP and POP at the same forecast time and retain zero values", () => {
  const slots = combineForecastItems([item("TMP", "5", "1900"), item("POP", "40", "1900"), item("POP", "0"), item("TMP", "0"), item("WSD", "2.8"), item("SKY", "3"), item("PTY", "0")], base, grid);
  assert.equal(slots[0].temperature, 0);
  assert.equal(slots[0].precipitationProbability, 0);
  assert.equal(slots[0].windSpeed, 2.8);
  assert.equal(slots[0].condition, "구름 많음");
  assert.equal(slots[1].temperature, 5);
  assert.equal(slots[1].precipitationProbability, 40);
  const chosen = selectUpcomingForecast(slots, new Date("2026-11-19T18:00:01+09:00"));
  assert.equal(chosen.current.forecastTime, "1900");
  assert.notEqual(chosen.current.forecastAt, base.issuedAt);
});

test("never combine different times, grids or publications, or show missing-value sentinels", () => {
  assert.equal(combineForecastItems([item("TMP", "3"), item("POP", "20", "1900")], base, grid).length, 0);
  assert.equal(combineForecastItems([item("TMP", "-999"), item("POP", "10")], base, grid).length, 0);
  const wrongGrid = item("TMP", "3"); wrongGrid.nx = 60;
  assert.throws(() => combineForecastItems([wrongGrid], base, grid));
  const wrongBase = item("POP", "10"); wrongBase.baseTime = "1400";
  assert.throws(() => combineForecastItems([wrongBase], base, grid));
  assert.throws(() => combineForecastItems([item("TMP", "3"), item("TMP", "4")], base, grid));
  assert.throws(() => selectUpcomingForecast([], new Date()));
});

test("forecast date rollover and invalid dates", () => {
  assert.equal(kmaTimestamp("20261231", "2400"), "2026-12-31T15:00:00.000Z");
  assert.equal(kmaTimestamp("20270101", "0000"), "2026-12-31T15:00:00.000Z");
  assert.throws(() => kmaTimestamp("20260230", "1800"));
  assert.throws(() => kmaTimestamp("20261119", "2460"));
});

test("collect all pages and distinguish unpublished, denied and partial responses", async () => {
  const collected = await collectForecastItems(async (number) => number === 1 ? page([item("TMP", "2")], 2) : page([item("POP", "20")], 2), 1);
  assert.equal(combineForecastItems(collected, base, grid)[0].precipitationProbability, 20);
  assert.throws(() => parseForecastPage({ response: { header: { resultCode: "03" } } }), (error) => error.code === "FORECAST_NOT_PUBLISHED");
  assert.throws(() => parseForecastPage({ response: { header: { resultCode: "30" } } }), (error) => error.code === "FORECAST_SERVICE_REJECTED");
  await assert.rejects(collectForecastItems(async (number) => number === 1 ? page([item("TMP", "2")], 2) : page([], 2), 1));
});
