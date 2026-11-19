import "server-only";
import { collectForecastItems, combineForecastItems, forecastBase, previousForecastBase, selectUpcomingForecast, toKmaGrid, WeatherDataError, type ForecastBase, type ForecastData, type ForecastSlot, type WeatherGrid } from "@/lib/weather";
import { publicDataKey } from "./env";
import { ApiError } from "./http";

type Snapshot = { slots: ForecastSlot[]; fetchedAt: string };
const cache = new Map<string, Snapshot>();
const pending = new Map<string, Promise<Snapshot>>();
const TTL = 10 * 60_000;

async function issueSnapshot(base: ForecastBase, grid: WeatherGrid): Promise<Snapshot> {
  const serviceKey = publicDataKey();
  const cacheKey = `${grid.nx}:${grid.ny}:${base.date}:${base.time}`;
  const previous = cache.get(cacheKey);
  if (previous && Date.now() - Date.parse(previous.fetchedAt) < TTL) return previous;
  if (!pending.has(cacheKey)) {
    pending.set(cacheKey, (async () => {
      const items = await collectForecastItems(async (page) => {
        const url = new URL("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst");
        url.search = new URLSearchParams({ serviceKey, pageNo: String(page), numOfRows: "1000", dataType: "JSON", base_date: base.date, base_time: base.time, nx: String(grid.nx), ny: String(grid.ny) }).toString();
        let response: Response;
        try { response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store", redirect: "error" }); }
        catch { throw new ApiError(502, "WEATHER_CONNECTION_FAILED", "기상청 단기예보 API에 연결하지 못했거나 응답 시간이 초과됐습니다."); }
        if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 502, "WEATHER_UPSTREAM_ERROR", `기상청 단기예보 조회에 실패했습니다(HTTP ${response.status}). 인증키·활용 승인·요청 한도를 확인해 주세요.`);
        const raw = await response.text();
        try { return JSON.parse(raw) as unknown; }
        catch {
          const authFailed = raw.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") || raw.includes("SERVICE_ACCESS_DENIED_ERROR");
          throw new ApiError(502, authFailed ? "WEATHER_AUTH_FAILED" : "WEATHER_INVALID_RESPONSE", authFailed ? "공공데이터포털 인증키와 기상청 단기예보 API 활용 승인을 확인해 주세요." : "기상청에서 유효한 단기예보 JSON을 받지 못했습니다.");
        }
      });
      const snapshot = { slots: combineForecastItems(items, base, grid), fetchedAt: new Date().toISOString() };
      if (cache.size >= 64) cache.delete(cache.keys().next().value!);
      cache.set(cacheKey, snapshot);
      return snapshot;
    })().finally(() => pending.delete(cacheKey)));
  }
  return pending.get(cacheKey)!;
}

export async function getKmaForecast(origin: { lat: number; lng: number }): Promise<{ data: ForecastData; fetchedAt: string }> {
  try {
    const grid = toKmaGrid(origin.lat, origin.lng);
    const latest = forecastBase();
    let base = latest;
    let snapshot: Snapshot;
    try { snapshot = await issueSnapshot(base, grid); }
    catch (error) {
      // Only an explicit "not published/no data" result permits the previous real issue.
      // Authentication, network, parsing and partial-page failures are not hidden.
      if (!(error instanceof WeatherDataError) || error.code !== "FORECAST_NOT_PUBLISHED") throw error;
      base = previousForecastBase(latest);
      snapshot = await issueSnapshot(base, grid);
    }
    const selection = selectUpcomingForecast(snapshot.slots, new Date());
    return { data: { grid, baseDate: base.date, baseTime: base.time, issuedAt: base.issuedAt, ...selection, usedPreviousIssue: base.issuedAt !== latest.issuedAt }, fetchedAt: snapshot.fetchedAt };
  } catch (error) {
    if (error instanceof WeatherDataError) throw new ApiError(error.code === "INVALID_WEATHER_LOCATION" ? 400 : 502, error.code, error.message);
    throw error;
  }
}
