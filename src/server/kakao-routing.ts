import "server-only";
import { BicycleRouteError, parseBicycleRoute, routingHttpError, type BicycleMode, type RoutePoint } from "@/lib/bicycle-route";
import { requireSecret } from "./env";
import { ApiError } from "./http";

export async function getBicycleRoute(start: RoutePoint, end: RoutePoint, mode: BicycleMode) {
  const key = requireSecret("KAKAO_REST_API_KEY");
  const url = new URL("https://dapi.kakao.com/v2/routing/bicycle");
  url.search = new URLSearchParams({ start_x: String(start.lng), start_y: String(start.lat), end_x: String(end.lng), end_y: String(end.lat), input_coord: "WGS84", output_coord: "WGS84", route_mode: mode }).toString();
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error" });
  } catch {
    throw new ApiError(502, "KAKAO_CONNECTION_FAILED", "카카오 자전거 경로 API에 연결하지 못했거나 응답 시간이 초과됐습니다. 경로를 표시하지 않습니다.");
  }
  if (!response.ok) {
    const error = routingHttpError(response.status);
    throw new ApiError(response.status === 429 ? 429 : 502, error.code, error.message);
  }
  try { return parseBicycleRoute(await response.json(), mode); }
  catch (error) {
    if (error instanceof BicycleRouteError) throw new ApiError(error.code === "KAKAO_INVALID_RESPONSE" ? 502 : 422, error.code, error.message);
    throw new ApiError(502, "KAKAO_INVALID_RESPONSE", "카카오 경로 응답을 해석하지 못했습니다. 경로를 표시하지 않습니다.");
  }
}
