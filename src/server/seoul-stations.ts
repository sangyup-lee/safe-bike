import "server-only";
import { collectStations, type StationSnapshot } from "@/lib/stations";
import { requireSecret } from "./env";
import { ApiError, upstreamJSON } from "./http";

let snapshot: StationSnapshot | undefined;
let pending: Promise<StationSnapshot> | undefined;
export const STATION_CACHE_SECONDS = 60;

export async function getStationSnapshot(): Promise<StationSnapshot> {
  const key = requireSecret("SEOUL_API_KEY");
  // Explicit operator opt-in is retained; the credential is sent over HTTP by this provider.
  if (process.env.SEOUL_ALLOW_HTTP !== "true") throw new ApiError(503, "SEOUL_TRANSPORT_NOT_ENABLED", "서울시 API 연결 승인 대기 중입니다. 현재 대여소 데이터를 조회할 수 없습니다.");
  if (snapshot && Date.now() - Date.parse(snapshot.fetchedAt) < STATION_CACHE_SECONDS * 1000) return snapshot;
  if (!pending) {
    pending = (async () => {
      const stations = await collectStations((first, last) => upstreamJSON(new URL(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/bikeList/${first}/${last}/`)));
      snapshot = { stations, fetchedAt: new Date().toISOString() };
      return snapshot;
    })().finally(() => { pending = undefined; });
  }
  // A failed/partial refresh is never presented as a complete or current snapshot.
  return pending;
}
