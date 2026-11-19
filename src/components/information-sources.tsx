import { informationTime, SOURCES } from "@/lib/information";
import type { BicycleMode } from "@/lib/bicycle-route";
import type { StationsState } from "./use-stations";
import type { RoutingState } from "./use-bicycle-routes";
import type { AccidentsState } from "./use-accidents";
import type { WeatherState } from "./use-weather";
import Icon from "./icon";

type Props = { stations: StationsState; routing: RoutingState; activeMode: BicycleMode; hasStation: boolean; accidents: AccidentsState; weather: WeatherState };
export default function InformationSources({ stations, routing, activeMode, hasStation, accidents, weather }: Props) {
  const active = routing.modes[activeMode];
  return <section className="information-sources" aria-label="통합 정보의 기준시각과 출처">
    <div className="section-heading"><h2><Icon name="clock"/>정보 기준시각과 출처</h2><span className="sample-label">모든 시각 KST</span></div>
    <p className="source-time-notice">자료마다 기준시각이 다릅니다. 서버 조회시각은 제공처 측정시각과 같지 않으며, 캐시된 자료는 실제 수신 시각을 표시합니다.</p>
    <div className="source-table-wrap"><table className="source-table"><caption className="sr-only">정보별 제공처, 기준시각, 서버 조회시각 및 상태</caption><thead><tr><th scope="col">정보</th><th scope="col">출처</th><th scope="col">측정·발표·통계 기준</th><th scope="col">서버 조회시각</th><th scope="col">상태</th></tr></thead><tbody>
      <tr><th scope="row">따릉이 재고</th><td><a href={SOURCES.stations.url} target="_blank" rel="noopener noreferrer">{SOURCES.stations.name}</a></td><td>제공처 측정시각 미제공<small>대여 가능 수량은 현장과 다를 수 있습니다.</small></td><td>{informationTime(stations.fetchedAt)}</td><td>{stations.loading ? "조회 중" : stations.error ? "조회 실패" : "조회 완료"}</td></tr>
      <tr><th scope="row">자전거 경로</th><td><a href={SOURCES.routes.url} target="_blank" rel="noopener noreferrer">{SOURCES.routes.name}</a></td><td>요청 시점의 거리·시간 산출값<small>{activeMode === "BIKE_ONLY" ? "자전거도로 우선" : "최단 경로"} · 실제 주행 측정값 아님</small></td><td>{informationTime(active.fetchedAt)}</td><td>{!hasStation ? "대여소 선택 대기" : routing.loading ? "조회 중" : active.error ? "조회 실패" : active.route ? "조회 완료" : "미조회"}</td></tr>
      <tr><th scope="row">사고다발지역</th><td><a href={SOURCES.accidents.url} target="_blank" rel="noopener noreferrer">{SOURCES.accidents.name}</a></td><td>{accidents.year ? `${accidents.year}년 발생 사고 연간 통계` : accidents.loading ? "사고 기준연도 확인 중" : "사고 기준연도 미확인"}<small>실시간 사고 정보 아님</small></td><td>{informationTime(accidents.fetchedAt)}</td><td>{accidents.loading ? "조회 중" : accidents.error ? "조회 실패" : `${accidents.accidents.length}곳 조회`}</td></tr>
      <tr><th scope="row">출발지 날씨</th><td><a href={SOURCES.weather.url} target="_blank" rel="noopener noreferrer">{SOURCES.weather.name}</a></td><td>{weather.data ? <>발표 {informationTime(weather.data.issuedAt)}<br/>예보 {informationTime(weather.data.current.forecastAt)}</> : weather.loading ? "발표·예보시각 확인 중" : "발표·예보시각 미확인"}<small>현재 실측 기온 아님</small></td><td>{informationTime(weather.fetchedAt)}</td><td>{weather.loading ? "조회 중" : weather.error ? "조회 실패" : "예보 조회 완료"}</td></tr>
    </tbody></table></div>
  </section>;
}
