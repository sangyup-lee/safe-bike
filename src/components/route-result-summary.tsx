import type { BicycleMode } from "@/lib/bicycle-route";
import type { RouteComparison } from "@/lib/route-comparison";
import { routeModeLabel, summarizeRoutes } from "@/lib/route-summary";
import { informationTime } from "@/lib/information";
import type { RoutingState } from "./use-bicycle-routes";
import Icon from "./icon";

type Props = {
  rows: RouteComparison[]; routing: RoutingState; activeMode: BicycleMode;
  stationName?: string; destinationName: string; year: number | null; threshold: number;
};
export default function RouteResultSummary({ rows, routing, activeMode, stationName, destinationName, year, threshold }: Props) {
  const paragraphs = summarizeRoutes(rows, activeMode, year, threshold);
  return <section className="route-result-summary" aria-labelledby="route-result-summary-title">
    <h2 id="route-result-summary-title"><Icon name="route" size={20}/>경로 결과 요약</h2>
    <div aria-live="polite" aria-atomic="true">
      {!stationName ? <p>출발 대여소를 선택하면 조회된 자전거 경로를 글로 요약해 드립니다.</p> : routing.loading ? <p>경로를 조회하고 있습니다. 조회가 끝나면 요약이 자동으로 표시됩니다.</p> : <>
        <p className="summary-journey">{stationName}에서 {destinationName}까지</p>
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {(["BIKE_ONLY", "SHORTEST"] as const).map((mode) => routing.modes[mode].error && <p className="summary-unavailable" key={mode}>{routeModeLabel(mode)}는 조회하지 못해 요약에서 제외했습니다. {routing.modes[mode].error}</p>)}
        {!paragraphs.length && <p>조회된 경로가 없어 결과를 요약할 수 없습니다.</p>}
      </>}
    </div>
    {stationName && !routing.loading && paragraphs.length > 0 && <>
      <p className="summary-caution">실제 조회값을 문장으로 정리한 참고 정보입니다. 예상 시간은 실제 주행시간과 다를 수 있습니다. 사고정보는 과거 다발지역 중심점과 경로 사이의 직선거리 기준이며, 지점 수나 경로 옵션만으로 실제 안전성을 판단할 수 없습니다.</p>
      <p className="summary-provenance">출처: 카카오맵 경로 API · 한국도로교통공단 TAAS<br/>{(["BIKE_ONLY", "SHORTEST"] as const).filter((mode) => routing.modes[mode].route).map((mode) => <span key={mode}>{routeModeLabel(mode)} 조회: {informationTime(routing.modes[mode].fetchedAt)}<br/></span>)}</p>
    </>}
  </section>;
}
