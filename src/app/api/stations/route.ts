import { findNearbyStations } from "@/lib/stations";
import { handleApi, integer, queryParams, success } from "@/server/http";
import { invalid } from "@/server/http";
import { getStationSnapshot, STATION_CACHE_SECONDS } from "@/server/seoul-stations";
import { SOURCES } from "@/lib/information";

function coordinate(params: URLSearchParams, name: string, min: number, max: number) {
  const raw = params.get(name);
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) invalid("출발지의 서울 지역 위도·경도를 입력해 주세요.");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) invalid("출발지는 서울 지역 내 좌표로 선택해 주세요.");
  return value;
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const params = queryParams(request, ["lat", "lng", "radius", "minBikes", "limit", "q"]);
    const origin = { lat: coordinate(params, "lat", 37.4, 37.75), lng: coordinate(params, "lng", 126.7, 127.25) };
    const radius = integer(params, "radius", 2000, 100, 10000);
    const minBikes = integer(params, "minBikes", 0, 0, 100);
    const limit = integer(params, "limit", 30, 1, 100);
    const query = params.get("q")?.trim() ?? "";
    if (query.length > 80) invalid("대여소 검색어는 80자 이하로 입력해 주세요.");
    const snapshot = await getStationSnapshot();
    return success({ ...findNearbyStations(snapshot.stations, origin, radius, minBikes, limit, query), origin, radius, totalStations: snapshot.stations.length, limit }, "seoul-bikeList", false, { fetchedAt: snapshot.fetchedAt, observedAt: null, measurementTimeProvided: false, sourceUrl: SOURCES.stations.url, cacheSeconds: STATION_CACHE_SECONDS, distanceType: "straight-line", attribution: "서울 열린데이터광장" });
  });
}
