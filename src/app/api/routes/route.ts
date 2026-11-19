import { bicycleModes, type BicycleMode } from "@/lib/bicycle-route";
import { handleApi, invalid, queryParams, success } from "@/server/http";
import { getBicycleRoute } from "@/server/kakao-routing";
import { SOURCES } from "@/lib/information";

function coordinate(params: URLSearchParams, name: string, min: number, max: number) {
  const raw = params.get(name);
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) invalid("대여소와 목적지의 올바른 좌표를 입력해 주세요.");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) invalid("좌표는 대한민국 영역 내 WGS84 위·경도여야 합니다.");
  return value;
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const params = queryParams(request, ["stationId", "startLat", "startLng", "endLat", "endLng", "route_mode"]);
    const stationId = params.get("stationId");
    if (!stationId || !/^ST-\d+$/.test(stationId)) invalid("선택한 따릉이 대여소 ID가 필요합니다.");
    const start = { lat: coordinate(params, "startLat", 32, 40), lng: coordinate(params, "startLng", 124, 132) };
    const end = { lat: coordinate(params, "endLat", 32, 40), lng: coordinate(params, "endLng", 124, 132) };
    if (start.lat === end.lat && start.lng === end.lng) invalid("대여소와 목적지는 서로 다른 위치여야 합니다.");
    const mode = params.get("route_mode") ?? "BIKE_ONLY";
    if (!bicycleModes.includes(mode as BicycleMode)) invalid("경로 옵션은 BIKE_ONLY 또는 SHORTEST여야 합니다.");
    return success({ stationId, start, end, route: await getBicycleRoute(start, end, mode as BicycleMode) }, "kakao-bicycle", false, { sourceUrl: SOURCES.routes.url, timeType: "server-retrieval", note: "거리·소요시간은 API 산출값이며 실제 안전성을 판정하지 않습니다." });
  });
}
