import "server-only";
import { AccidentDataError, collectAccidents, LATEST_ACCIDENT_YEAR, type AccidentHotspot } from "@/lib/accidents";
import { publicDataKey } from "./env";
import { ApiError } from "./http";

type Snapshot = { accidents: AccidentHotspot[]; total: number; excluded: number; year: number; fetchedAt: string };
const cache = new Map<string, Snapshot>();
const pending = new Map<string, Promise<Snapshot>>();
const TTL = 3600_000;
const PAGE_SIZE = 100;

export async function getAccidentSnapshot(year = LATEST_ACCIDENT_YEAR, district = "") {
  const serviceKey = publicDataKey();
  const cacheKey = `${year}:${district}`;
  const previous = cache.get(cacheKey);
  if (previous && Date.now() - Date.parse(previous.fetchedAt) < TTL) return previous;
  if (!pending.has(cacheKey)) {
    const request = (async () => {
      try {
        const result = await collectAccidents(async (page) => {
          const url = new URL("https://apis.data.go.kr/B552061/frequentzoneBicycle/getRestFrequentzoneBicycle");
          url.search = new URLSearchParams({ serviceKey, searchYearCd: String(year), siDo: "11", guGun: district, type: "json", numOfRows: String(PAGE_SIZE), pageNo: String(page) }).toString();
          let response: Response;
          try { response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store", redirect: "error" }); }
          catch { throw new ApiError(502, "ACCIDENT_CONNECTION_FAILED", "한국도로교통공단 사고정보 API에 연결하지 못했거나 응답 시간이 초과됐습니다."); }
          if (!response.ok) throw new ApiError(502, "ACCIDENT_UPSTREAM_ERROR", `사고정보 제공처가 HTTP ${response.status}를 반환했습니다. API 인증키와 활용 승인을 확인해 주세요.`);
          const raw = await response.text();
          try { return JSON.parse(raw) as unknown; }
          catch {
            const keyError = raw.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") || raw.includes("SERVICE_ACCESS_DENIED_ERROR");
            throw new ApiError(502, keyError ? "ACCIDENT_AUTH_FAILED" : "ACCIDENT_INVALID_RESPONSE", keyError ? "공공데이터포털 인증키 또는 사고정보 API 활용 승인을 확인해 주세요." : "사고정보 API에서 유효한 JSON을 받지 못했습니다.");
          }
        }, PAGE_SIZE);
        const snapshot = { ...result, year, fetchedAt: new Date().toISOString() };
        // Keep a small bounded in-memory cache; credentials are never written to disk.
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(cacheKey, snapshot);
        return snapshot;
      } catch (error) {
        if (error instanceof AccidentDataError) throw new ApiError(502, error.code, error.message);
        throw error;
      }
    })().finally(() => pending.delete(cacheKey));
    pending.set(cacheKey, request);
  }
  return pending.get(cacheKey)!;
}
