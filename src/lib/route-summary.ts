import type { BicycleMode } from "./bicycle-route.ts";
import type { RouteComparison } from "./route-comparison.ts";

export const routeModeLabel = (mode: BicycleMode) => mode === "BIKE_ONLY" ? "자전거도로 우선 경로" : "최단 경로";
const meters = (value: number) => `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}m`;

export function summarizeRoutes(rows: RouteComparison[], activeMode: BicycleMode, year: number | null, threshold: number): string[] {
  const available = rows.filter((row) => row.distanceMeters !== null && row.durationSeconds !== null);
  if (!available.length) return [];
  const paragraphs = available.map((row) => {
    const selected = row.mode === activeMode ? "현재 지도에 선택한 " : "";
    const details = `${selected}${routeModeLabel(row.mode)}는 ${meters(row.distanceMeters!)}이며, 예상 소요시간은 약 ${Math.ceil(row.durationSeconds! / 60)}분입니다.`;
    const accidents = row.nearbyHotspotCount === null
      ? " 사고정보가 아직 확인되지 않아 주변 사고다발지역 수는 요약하지 않았습니다."
      : ` ${year === null ? "과거" : `${year}년`} 사고통계 기준, 경로에서 직선거리 ${meters(threshold)} 이내의 사고다발지역은 ${row.nearbyHotspotCount}곳입니다.`;
    return details + accidents;
  });
  if (available.length === 2) {
    const [first, second] = available;
    const difference = first.distanceMeters! - second.distanceMeters!;
    paragraphs.push(difference === 0
      ? "두 경로의 조회 거리는 같습니다."
      : `${routeModeLabel(difference > 0 ? second.mode : first.mode)}가 다른 경로보다 약 ${meters(Math.abs(difference))} 짧습니다.`);
  }
  return paragraphs;
}
