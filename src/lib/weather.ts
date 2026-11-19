export const WEATHER_SOURCE_URL = "https://www.data.go.kr/data/15084084/openapi.do";
export const GRID_SOURCE_URL = "https://apihub.kma.go.kr/getAttachFile.do?fileName=%2820240305%29%EB%8F%99%EB%84%A4%EC%98%88%EB%B3%B4+%EA%B2%A9%EC%9E%90%EC%98%81%EC%97%AD+%EC%A0%95%EB%B3%B4.pdf";
export type WeatherGrid = { nx: number; ny: number };
export type ForecastBase = { date: string; time: string; issuedAt: string };
export type ForecastSlot = {
  forecastDate: string; forecastTime: string; forecastAt: string;
  temperature: number; precipitationProbability: number; windSpeed: number | null;
  sky: number | null; precipitationType: number | null; condition: string;
};
export type ForecastData = {
  grid: WeatherGrid; baseDate: string; baseTime: string; issuedAt: string;
  current: ForecastSlot; upcoming: ForecastSlot[]; usedPreviousIssue: boolean;
};
export class WeatherDataError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

// KMA Lambert conformal conic, dot-point indexing. Official 5 km grid specification.
export function toKmaGrid(lat: number, lng: number): WeatherGrid {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 40 || lng < 124 || lng > 132) throw new WeatherDataError("INVALID_WEATHER_LOCATION", "대한민국 영역 내 출발지 좌표를 선택해 주세요.");
  const rad = Math.PI / 180;
  const re = 6371.00877 / 5, slat1 = 30 * rad, slat2 = 60 * rad, olat = 38 * rad;
  const sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + slat1 / 2), sn) * Math.cos(slat1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI / 4 + olat / 2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI / 4 + lat * rad / 2), sn);
  const theta = (lng - 126) * rad * sn;
  const nx = Math.floor(ra * Math.sin(theta) + 43 + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5);
  if (nx < 1 || nx > 149 || ny < 1 || ny > 253) throw new WeatherDataError("INVALID_WEATHER_LOCATION", "기상청 예보 격자 범위 밖의 좌표입니다.");
  return { nx, ny };
}

const KST = 9 * 3600_000;
const hours = [2, 5, 8, 11, 14, 17, 20, 23];
export function forecastBase(now = new Date(), availabilityMinutes = 10): ForecastBase {
  // Select an issue only after the application's availability grace period.
  const available = new Date(now.getTime() + KST - availabilityMinutes * 60_000);
  let hour = hours.filter((value) => value <= available.getUTCHours()).at(-1);
  if (hour === undefined) { available.setUTCDate(available.getUTCDate() - 1); hour = 23; }
  const date = available.toISOString().slice(0, 10).replaceAll("-", "");
  const time = `${String(hour).padStart(2, "0")}00`;
  return { date, time, issuedAt: kmaTimestamp(date, time) };
}
export function previousForecastBase(base: ForecastBase): ForecastBase {
  return forecastBase(new Date(Date.parse(base.issuedAt) - 3 * 3600_000), 0);
}
export function kmaTimestamp(date: string, time: string) {
  if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "기상청 날짜·시각 형식을 확인하지 못했습니다.");
  const year = Number(date.slice(0, 4)), month = Number(date.slice(4, 6)), day = Number(date.slice(6, 8));
  const hour = Number(time.slice(0, 2)), minute = Number(time.slice(2, 4));
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "유효하지 않은 기상청 날짜·시각입니다.");
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - KST).toISOString();
}
export function formatWeatherTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "기상청 단기예보 응답 형식을 확인하지 못했습니다.");
  return value as Record<string, unknown>;
}
export function parseForecastPage(value: unknown) {
  const response = object(object(value).response), header = object(response.header);
  if (header.resultCode === "03") throw new WeatherDataError("FORECAST_NOT_PUBLISHED", "선택한 발표시각의 단기예보가 아직 제공되지 않았습니다.");
  if (header.resultCode !== "00") throw new WeatherDataError("FORECAST_SERVICE_REJECTED", "기상청 단기예보 요청이 거절됐습니다. 인증키·활용 승인·요청 조건을 확인해 주세요.");
  const body = object(response.body);
  const total = Number(body.totalCount);
  if (!Number.isSafeInteger(total) || total < 0 || total > 10000) throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "단기예보 전체 자료 수를 확인하지 못했습니다.");
  if (total === 0) throw new WeatherDataError("FORECAST_NOT_PUBLISHED", "선택한 발표시각의 예보 자료가 없습니다.");
  const items = object(body.items).item;
  if (!Array.isArray(items)) throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "단기예보 항목 목록이 없습니다.");
  return { items: items.map(object), total };
}
export async function collectForecastItems(fetchPage: (page: number) => Promise<unknown>, pageSize = 1000) {
  const items: Record<string, unknown>[] = [];
  let expected: number | null = null;
  for (let page = 1; page <= 10; page++) {
    const result = parseForecastPage(await fetchPage(page));
    if (expected !== null && result.total !== expected) throw new WeatherDataError("FORECAST_MISMATCH", "조회 중 기상청 예보 자료 수가 변경됐습니다. 다시 조회해 주세요.");
    expected = result.total;
    if (!result.items.length || result.items.length > pageSize) throw new WeatherDataError("INCOMPLETE_FORECAST", "예보 일부 페이지를 가져오지 못했습니다.");
    items.push(...result.items);
    if (items.length >= expected) {
      if (items.length !== expected) throw new WeatherDataError("INCOMPLETE_FORECAST", "예보 자료 수와 수신 항목 수가 일치하지 않습니다.");
      return items;
    }
  }
  throw new WeatherDataError("INCOMPLETE_FORECAST", "기상청 예보 페이지 조회 한도를 초과했습니다.");
}
function measurement(raw: unknown, min: number, max: number): number | null {
  if ((typeof raw !== "string" && typeof raw !== "number") || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}
function condition(sky: number | null, precipitation: number | null) {
  const rain: Record<number, string> = { 1: "비", 2: "비/눈", 3: "눈", 4: "소나기" };
  if (precipitation !== null && precipitation > 0) return rain[precipitation] ?? "강수 예보";
  return sky === 1 ? "맑음" : sky === 3 ? "구름 많음" : sky === 4 ? "흐림" : "단기예보";
}
export function combineForecastItems(items: Record<string, unknown>[], base: ForecastBase, grid: WeatherGrid): ForecastSlot[] {
  const groups = new Map<string, { date: string; time: string; instant: string; values: Map<string, unknown> }>();
  for (const row of items) {
    if (row.baseDate !== base.date || row.baseTime !== base.time || Number(row.nx) !== grid.nx || Number(row.ny) !== grid.ny) throw new WeatherDataError("FORECAST_MISMATCH", "요청한 격자·발표시각과 응답 자료가 일치하지 않습니다.");
    if (typeof row.fcstDate !== "string" || typeof row.fcstTime !== "string" || typeof row.category !== "string") throw new WeatherDataError("INVALID_FORECAST_RESPONSE", "예보 대상시각·자료 항목을 확인하지 못했습니다.");
    const instant = kmaTimestamp(row.fcstDate, row.fcstTime);
    let group = groups.get(instant);
    if (!group) { group = { date: row.fcstDate, time: row.fcstTime, instant, values: new Map() }; groups.set(instant, group); }
    if (group.values.has(row.category) && String(group.values.get(row.category)) !== String(row.fcstValue)) throw new WeatherDataError("FORECAST_MISMATCH", "같은 예보시각의 자료 값이 서로 다릅니다.");
    group.values.set(row.category, row.fcstValue);
  }
  const forecasts: ForecastSlot[] = [];
  for (const group of groups.values()) {
    const temperature = measurement(group.values.get("TMP"), -100, 70);
    const probability = measurement(group.values.get("POP"), 0, 100);
    if (temperature === null || probability === null) continue;
    const sky = measurement(group.values.get("SKY"), 1, 4);
    const precipitationType = measurement(group.values.get("PTY"), 0, 7);
    forecasts.push({ forecastDate: group.date, forecastTime: group.time, forecastAt: group.instant, temperature, precipitationProbability: probability, windSpeed: measurement(group.values.get("WSD"), 0, 100), sky, precipitationType, condition: condition(sky, precipitationType) });
  }
  return forecasts.sort((a, b) => Date.parse(a.forecastAt) - Date.parse(b.forecastAt));
}
export function selectUpcomingForecast(slots: ForecastSlot[], now: Date): { current: ForecastSlot; upcoming: ForecastSlot[] } {
  const upcoming = slots.filter((slot) => Date.parse(slot.forecastAt) >= now.getTime()).slice(0, 6);
  if (!upcoming.length) throw new WeatherDataError("NO_UPCOMING_FORECAST", "현재 이후의 기온·강수확률 예보를 찾지 못했습니다. 과거 값을 현재 예보로 표시하지 않습니다.");
  return { current: upcoming[0], upcoming };
}
