export const bicycleModes = ["BIKE_ONLY", "SHORTEST"] as const;
export type BicycleMode = typeof bicycleModes[number];
export type RoutePoint = { lat: number; lng: number };
export type BicycleRoute = { mode: BicycleMode; distanceMeters: number; durationSeconds: number; paths: RoutePoint[][]; landingUrl: string | null };

export class BicycleRouteError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
const searchErrors: Record<string, string> = {
  SAME_POINT: "대여소와 목적지 좌표가 같습니다.",
  START_LINK_NOT_FOUND: "선택한 대여소 주변에서 자전거 경로에 연결할 도로를 찾지 못했습니다.",
  END_LINK_NOT_FOUND: "목적지 주변에서 자전거 경로에 연결할 도로를 찾지 못했습니다.",
  TOO_MANY_SEARCH_LINK: "카카오에서 경로 탐색 범위를 초과했습니다.",
  TOO_FAR_AWAY: "대여소와 목적지가 자전거 경로 탐색 범위보다 멀리 떨어져 있습니다.",
  ROUTE_RESULT_NOT_FOUND: "카카오에서 해당 구간의 자전거 경로를 찾지 못했습니다.",
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BicycleRouteError("KAKAO_INVALID_RESPONSE", "카카오 경로 응답 형식을 확인하지 못했습니다.");
  return value as Record<string, unknown>;
}
function invalid(): never { throw new BicycleRouteError("KAKAO_INVALID_RESPONSE", "카카오 응답에 유효한 경로 좌표·거리·시간이 없습니다. 경로를 표시하지 않습니다."); }

export function parseBicycleRoute(value: unknown, mode: BicycleMode): BicycleRoute {
  const body = object(value);
  if (body.status !== "OK") {
    const status = typeof body.status === "string" && body.status in searchErrors ? body.status : "ROUTE_RESULT_NOT_FOUND";
    throw new BicycleRouteError(status, searchErrors[status]);
  }
  const route = object(body.route), properties = object(route.properties);
  const distance = properties.totalDistance, duration = properties.totalTime;
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || !Array.isArray(route.legs)) invalid();
  const paths: RoutePoint[][] = [];
  for (const leg of route.legs) {
    const steps = object(leg).steps;
    if (!Array.isArray(steps)) invalid();
    for (const step of steps) {
      const points = object(object(step).path).points;
      if (!Array.isArray(points)) invalid();
      const path = points.map((pair): RoutePoint => {
        if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "number" || typeof pair[1] !== "number" || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) || pair[0] < 124 || pair[0] > 132 || pair[1] < 32 || pair[1] > 40) invalid();
        return { lng: pair[0], lat: pair[1] };
      });
      // Preserve step boundaries. Never draw an invented segment between disconnected steps.
      if (path.length >= 2) paths.push(path);
    }
  }
  if (!paths.length) invalid();
  let landingUrl: string | null = null;
  if (typeof properties.landingUrl === "string") {
    try { const url = new URL(properties.landingUrl); if (url.protocol === "https:" && url.hostname === "map.kakao.com" && !url.username && !url.password) landingUrl = url.toString(); } catch { /* An invalid optional link is omitted. */ }
  }
  return { mode, distanceMeters: distance, durationSeconds: duration, paths, landingUrl };
}

export function routingHttpError(status: number) {
  if (status === 401) return { code: "KAKAO_AUTHENTICATION_FAILED", message: "카카오 인증 실패(HTTP 401). 서버의 REST API 키를 확인해 주세요." };
  if (status === 403) return { code: "KAKAO_PERMISSION_DENIED", message: "카카오 자전거 경로 API 호출 권한이 없습니다(HTTP 403). 앱의 API 사용 권한을 확인해 주세요." };
  if (status === 429) return { code: "KAKAO_QUOTA_EXCEEDED", message: "카카오 API 요청 한도를 초과했습니다(HTTP 429). 잠시 후 다시 시도해 주세요." };
  return { code: "KAKAO_UPSTREAM_ERROR", message: `카카오 자전거 경로 조회 실패(HTTP ${status}). 대체 경로는 생성하지 않습니다.` };
}
