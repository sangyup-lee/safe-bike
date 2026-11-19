import type { BicycleMode } from "@/lib/bicycle-route";
import type { RouteComparison } from "@/lib/route-comparison";
import { informationTime, SOURCES } from "@/lib/information";
import type { RoutingState } from "./use-bicycle-routes";
import Icon from "./icon";

type Props = {
  rows: RouteComparison[]; routing: RoutingState; hasStation: boolean;
  activeMode: BicycleMode; onSelect: (mode: BicycleMode) => void;
  threshold: number; onThresholdChange: (value: number) => void;
  accidentYear: number | null; accidentsLoading: boolean; accidentError: string;
};
export default function RouteComparisonPanel({ rows, routing, hasStation, activeMode, onSelect, threshold, onThresholdChange, accidentYear, accidentsLoading, accidentError }: Props) {
  return <section className="comparison-panel" id="comparison" aria-label="두 자전거 경로 비교">
    <div className="comparison-heading"><div><h2><Icon name="route"/>경로별 거리와 주변 사고다발지역 비교</h2><p>같은 출발 대여소·목적지, 같은 사고 자료와 거리 기준으로 비교합니다.</p></div><label>주변 범위 <select aria-label="경로 비교 근접 거리 기준" value={threshold} onChange={(e) => onThresholdChange(Number(e.target.value))}><option value={100}>100m</option><option value={300}>300m</option><option value={500}>500m</option><option value={1000}>1km</option></select></label></div>
    <div className="comparison-table-wrap"><table className="comparison-table"><caption className="sr-only">자전거도로 우선과 최단 경로의 거리, 예상 소요시간, 주변 사고다발지역 수 및 조회시각</caption><thead><tr><th scope="col">경로 옵션</th><th scope="col">거리</th><th scope="col">예상 소요</th><th scope="col">주변 사고다발지역</th><th scope="col">조회시각 (KST)</th><th scope="col">지도 경로</th></tr></thead><tbody>{rows.map((row) => {
      const result = routing.modes[row.mode];
      const waiting = !hasStation ? "대여소 선택 대기" : routing.loading ? "조회 중" : result.error;
      const count = row.nearbyHotspotCount === null ? !result.route ? "—" : accidentsLoading ? "조회 중" : accidentError ? "확인 불가" : "분석 대기" : `${row.nearbyHotspotCount}곳`;
      return <tr key={row.mode} className={activeMode === row.mode && result.route ? "selected-route" : ""}><th scope="row">{row.mode === "BIKE_ONLY" ? "자전거도로 우선" : "최단 경로"}{waiting && <small className={result.error ? "comparison-error" : ""}>{waiting}</small>}</th><td>{row.distanceMeters === null ? "—" : `${row.distanceMeters.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}m`}</td><td>{row.durationSeconds === null ? "—" : `${Math.ceil(row.durationSeconds / 60)}분`}</td><td><strong>{count}</strong>{row.nearbyHotspotCount !== null && <small>{accidentYear}년 · {threshold}m 이내</small>}</td><td><small>{informationTime(result.fetchedAt)}</small></td><td><button disabled={!result.route} aria-pressed={Boolean(result.route) && activeMode === row.mode} onClick={() => onSelect(row.mode)}>{result.route && activeMode === row.mode ? "선택됨" : "경로 선택"}</button></td></tr>;
    })}</tbody></table></div>
    <p className="comparison-safety-note"><Icon name="info" size={17}/><span>주변 지점 수가 적거나 자전거도로 우선 경로라고 해서 실제로 더 안전하다는 뜻은 아닙니다. 과거 사고다발지역 중심점과 경로 선분 사이의 직선거리로 집계하며, 현재 도로 상태·교통량·전체 사고 이력을 반영하지 않습니다.</span></p>
    <p className="comparison-source">경로 출처: <a href={SOURCES.routes.url} target="_blank" rel="noopener noreferrer">카카오맵</a> · 사고 출처: <a href={SOURCES.accidents.url} target="_blank" rel="noopener noreferrer">한국도로교통공단 TAAS</a> · 사고정보 조회 실패는 0곳으로 계산하지 않습니다.</p>
  </section>;
}
