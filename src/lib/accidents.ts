export const LATEST_ACCIDENT_YEAR = 2025;
export const ACCIDENT_YEAR_VERIFIED_AT = "2026-11-19";
export const ACCIDENT_SOURCE_URL = "https://opendata.koroad.or.kr/api/selectBicycleDataSet.do";
export type GeoPoint = { lat: number; lng: number };
export type AccidentHotspot = {
  id: string; name: string; district: string; lat: number; lng: number;
  accidentCount: number; casualties: number; deaths: number; severeInjuries: number;
  polygon: GeoPoint[][] | null;
};
export type RouteHotspot = AccidentHotspot & { distanceToRouteMeters: number | null; nearRoute: boolean };

export class AccidentDataError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccidentDataError("INVALID_ACCIDENT_RESPONSE", "사고정보 응답 형식을 확인하지 못했습니다.");
  return value as Record<string, unknown>;
}
function numeric(value: unknown) {
  return (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) ? Number(value) : NaN;
}
function count(value: unknown) {
  const valueNumber = numeric(value);
  if (!Number.isSafeInteger(valueNumber) || valueNumber < 0) throw new AccidentDataError("INVALID_ACCIDENT_RESPONSE", "사고 통계 수량을 확인하지 못했습니다.");
  return valueNumber;
}
function parsePolygon(raw: unknown): GeoPoint[][] | null {
  try {
    const geometry = object(typeof raw === "string" ? JSON.parse(raw) : raw);
    if (geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) return null;
    const polygon = geometry.coordinates.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) throw new Error("Invalid ring");
      return ring.map((pair) => {
        if (!Array.isArray(pair) || pair.length !== 2) throw new Error("Invalid point");
        const lng = numeric(pair[0]), lat = numeric(pair[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 40 || lng < 124 || lng > 132) throw new Error("Invalid point");
        return { lat, lng };
      });
    });
    return polygon.length ? polygon : null;
  } catch { return null; }
}

export function parseAccidentPage(value: unknown) {
  const body = object(value);
  if (body.resultCode === "03") return { accidents: [] as AccidentHotspot[], total: 0, rowCount: 0, excluded: 0 };
  if (body.resultCode !== "00") throw new AccidentDataError("ACCIDENT_SERVICE_REJECTED", "사고정보 API가 요청을 처리하지 못했습니다. 서비스 활용 승인과 조회 조건을 확인해 주세요.");
  const total = count(body.totalCount);
  const raw = body.items && typeof body.items === "object" ? object(body.items).item : null;
  const items: unknown[] = raw == null || raw === "" ? [] : Array.isArray(raw) ? raw : [raw];
  const accidents: AccidentHotspot[] = [];
  let excluded = 0;
  for (const item of items) {
    const row = object(item);
    const lat = numeric(row.la_crd), lng = numeric(row.lo_crd);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 37.4 || lat > 37.75 || lng < 126.7 || lng > 127.25) { excluded++; continue; }
    if ((typeof row.afos_fid !== "number" && typeof row.afos_fid !== "string") || typeof row.spot_nm !== "string") throw new AccidentDataError("INVALID_ACCIDENT_RESPONSE", "사고다발지역 식별자·지점명을 확인하지 못했습니다.");
    accidents.push({ id: String(row.afos_fid), name: row.spot_nm, district: typeof row.sido_sgg_nm === "string" ? row.sido_sgg_nm : "서울", lat, lng, accidentCount: count(row.occrrnc_cnt), casualties: count(row.caslt_cnt), deaths: count(row.dth_dnv_cnt), severeInjuries: count(row.se_dnv_cnt), polygon: parsePolygon(row.geom_json) });
  }
  return { accidents, total, rowCount: items.length, excluded };
}

export async function collectAccidents(fetchPage: (page: number) => Promise<unknown>, pageSize = 100) {
  const byId = new Map<string, AccidentHotspot>();
  let consumed = 0, excluded = 0, expectedTotal: number | null = null;
  for (let page = 1; page <= 100; page++) {
    const result = parseAccidentPage(await fetchPage(page));
    if (expectedTotal !== null && result.total !== expectedTotal) throw new AccidentDataError("ACCIDENT_DATA_CHANGED", "조회 중 사고정보의 전체 건수가 변경됐습니다. 다시 조회해 주세요.");
    expectedTotal = result.total;
    if (result.rowCount > pageSize || (result.rowCount === 0 && consumed < expectedTotal)) throw new AccidentDataError("INCOMPLETE_ACCIDENT_DATA", "사고정보 일부 페이지를 가져오지 못했습니다.");
    consumed += result.rowCount; excluded += result.excluded;
    result.accidents.forEach((item) => byId.set(item.id, item));
    if (consumed >= expectedTotal) {
      if (byId.size + excluded !== expectedTotal) throw new AccidentDataError("INCOMPLETE_ACCIDENT_DATA", "사고정보 전체 건수와 수신 데이터가 일치하지 않습니다.");
      return { accidents: [...byId.values()], total: expectedTotal, excluded };
    }
  }
  throw new AccidentDataError("INCOMPLETE_ACCIDENT_DATA", "사고정보 페이지 조회 한도를 초과했습니다.");
}

const R = 6371000, rad = Math.PI / 180;
function angularDistance(a: GeoPoint, b: GeoPoint) {
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function bearing(a: GeoPoint, b: GeoPoint) {
  const dLng = (b.lng - a.lng) * rad;
  return Math.atan2(Math.sin(dLng) * Math.cos(b.lat * rad), Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(dLng));
}
export function pointToSegmentMeters(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const segment = angularDistance(start, end), fromStart = angularDistance(start, point);
  if (segment < 1e-12) return fromStart * R;
  const angle = bearing(start, point) - bearing(start, end);
  const along = Math.atan2(Math.sin(fromStart) * Math.cos(angle), Math.cos(fromStart));
  if (along <= 0) return fromStart * R;
  if (along >= segment) return angularDistance(end, point) * R;
  return Math.abs(Math.asin(Math.max(-1, Math.min(1, Math.sin(fromStart) * Math.sin(angle))))) * R;
}
export function distanceToRouteMeters(point: GeoPoint, paths: GeoPoint[][]): number | null {
  let nearest = Infinity;
  // Preserve route step boundaries; do not create artificial connecting segments.
  for (const path of paths) for (let i = 1; i < path.length; i++) nearest = Math.min(nearest, pointToSegmentMeters(point, path[i - 1], path[i]));
  return Number.isFinite(nearest) ? nearest : null;
}
export function annotateHotspots(accidents: AccidentHotspot[], paths: GeoPoint[][] | null, thresholdMeters: number): RouteHotspot[] {
  return accidents.map((item) => {
    const distance = paths ? distanceToRouteMeters(item, paths) : null;
    return { ...item, distanceToRouteMeters: distance, nearRoute: distance !== null && distance <= thresholdMeters };
  }).sort((a, b) => (a.distanceToRouteMeters ?? Infinity) - (b.distanceToRouteMeters ?? Infinity) || a.id.localeCompare(b.id));
}
