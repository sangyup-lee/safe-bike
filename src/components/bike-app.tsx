"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { places } from "@/lib/demo-data";
import { ACCIDENT_SOURCE_URL, ACCIDENT_YEAR_VERIFIED_AT } from "@/lib/accidents";
import { compareRoutes } from "@/lib/route-comparison";
import { informationTime, SOURCES } from "@/lib/information";
import type { BicycleMode } from "@/lib/bicycle-route";
import BikeMap from "./bike-map";
import Icon from "./icon";
import { useStations } from "./use-stations";
import { useBicycleRoutes } from "./use-bicycle-routes";
import { useAccidents } from "./use-accidents";
import WeatherCard from "./weather-card";
import { useWeather } from "./use-weather";
import RouteComparisonPanel from "./route-comparison";
import InformationSources from "./information-sources";
import PlaceSearch from "./place-search";
import RouteResultSummary from "./route-result-summary";
import { formatDistance } from "@/lib/stations";

export default function BikeApp() {
  const [draftStart, setDraftStart] = useState(places[0]);
  const [draftEnd, setDraftEnd] = useState(places[1]);
  const [mode, setMode] = useState<BicycleMode>("BIKE_ONLY");
  const [showStations, setShowStations] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [stationFilter, setStationFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [radius, setRadius] = useState(2000);
  const [stationQuery, setStationQuery] = useState("");
  const [accidentDistance, setAccidentDistance] = useState(300);
  const [onlyNearRoute, setOnlyNearRoute] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<string | null>(null);
  const accidentData = useAccidents();
  const nearby = useStations(draftStart, radius, stationFilter === "available" ? 1 : 0, stationQuery);
  const stations = nearby.stations;
  const selectStation = useCallback((id: string) => setSelectedStation(id), []);
  const selected = stations.find((s) => s.id === selectedStation);
  const weather = useWeather(selected ?? draftStart);
  const routing = useBicycleRoutes(selected, draftEnd);
  const route = routing.modes[mode].route;
  const comparisons = useMemo(() => compareRoutes({ BIKE_ONLY: routing.modes.BIKE_ONLY.route, SHORTEST: routing.modes.SHORTEST.route }, accidentData.loading || accidentData.error ? null : accidentData.accidents, accidentDistance), [routing.modes, accidentData.accidents, accidentData.loading, accidentData.error, accidentDistance]);
  const activeComparison = comparisons.find((item) => item.mode === mode)!;
  const routeHotspots = activeComparison.hotspots;
  const nearHotspots = routeHotspots.filter((item) => item.nearRoute);
  const displayedHotspots = route && onlyNearRoute ? nearHotspots : routeHotspots;
  const selectedHotspot = displayedHotspots.find((item) => item.id === selectedAccident);
  const selectAccident = useCallback((id: string) => { setSelectedAccident(id); setShowIncidents(true); }, []);
  const filtered = stations;
  function searchRoute(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) { setNotice("주변 따릉이 목록이나 지도에서 경로를 시작할 대여소를 선택해 주세요."); return; }
    routing.refresh(); setNotice("");
  }
  return <div className="app-shell">
    <header className="site-header"><Link className="brand" href="/" aria-label="Safe Bike Seoul 홈"><span className="brand-icon"><Icon name="bike" size={27}/></span><span>safe bike<span className="brand-city">SEOUL</span></span></Link><nav aria-label="주요 메뉴"><a className="active" href="#route-panel">자전거 길찾기</a><a href="#comparison">경로 비교</a><a href="#stations">따릉이 대여소</a><a href="#safety">사고·날씨</a></nav><span className="header-caption"><Icon name="bike" size={17}/>서울 자전거 정보를 한눈에</span><span className="demo-badge">SEOUL BIKE</span></header>
    <div className="demo-banner"><Icon name="info" size={16}/><span><strong>이 화면은 실제 안전성을 판정하거나 보증하지 않습니다.</strong> 재고·경로·과거 사고통계·기상예보는 기준시각이 다른 참고 정보입니다.</span><span className="banner-tag">정보 비교용</span></div>
    <main className="workspace"><aside className="sidebar" id="route-panel">
      <section className="route-search"><div className="eyebrow">PLAN YOUR SEOUL RIDE</div><h1>오늘은 어디로<br/>달려볼까요<span>?</span></h1><p className="intro">대여소를 선택하고 두 자전거 경로를 비교하세요.</p><form onSubmit={searchRoute}><div className="search-fields"><PlaceSearch label="출발지" place={draftStart} onChange={setDraftStart}/><div className="field-divider"/><PlaceSearch label="목적지" place={draftEnd} onChange={setDraftEnd}/><button type="button" className="swap-button" aria-label="출발지와 목적지 바꾸기" onClick={() => { setDraftStart(draftEnd); setDraftEnd(draftStart); }}><Icon name="swap" size={16}/></button></div><button className="primary-button" type="submit"><Icon name="route"/>자전거 경로 찾기</button></form>{notice && <p className="notice" role="status">{notice}</p>}</section>
      <section className="route-options">
        <div className="section-heading"><h2>자전거 경로</h2><span className="sample-label">카카오 공식 API</span></div>
        <p className="routing-origin">{selected ? `출발 대여소: ${selected.name}` : "먼저 주변 따릉이 대여소를 선택해 주세요."}</p>
        <div className="route-tabs" role="group" aria-label="자전거 경로 선택"><button className={mode === "BIKE_ONLY" ? "active" : ""} aria-pressed={mode === "BIKE_ONLY"} onClick={() => setMode("BIKE_ONLY")}><Icon name="bike" size={17}/>자전거도로 우선</button><button className={mode === "SHORTEST" ? "active" : ""} aria-pressed={mode === "SHORTEST"} onClick={() => setMode("SHORTEST")}><Icon name="route" size={17}/>최단 경로</button></div>
        {routing.loading && <p className="station-state" role="status">두 가지 자전거 경로를 조회하고 있습니다…</p>}
        {!routing.loading && routing.modes[mode].error && <div className="station-state error" role="alert"><strong>이 경로를 불러오지 못했습니다.</strong><p>{routing.modes[mode].error}</p><button onClick={routing.refresh}>다시 조회</button></div>}
        {route && <div className="route-summary"><div className="route-type"><span>{mode === "BIKE_ONLY" ? "자전거도로 우선 경로" : "최단 자전거 경로"}</span><span className="green-label">실제 조회</span></div><div className="route-numbers"><strong>{Math.ceil(route.durationSeconds / 60)}<span>분</span></strong><span className="number-divider"/><strong className="distance">{(route.distanceMeters / 1000).toFixed(1)}<span>km</span></strong></div><div className="route-caption"><Icon name="info" size={14}/>선택한 대여소부터 목적지까지의 자전거 경로입니다.</div>{route.landingUrl && <a className="routing-link" href={route.landingUrl} target="_blank" rel="noopener noreferrer">카카오맵에서 경로 열기</a>}</div>}
        <a className="routing-link" href="#comparison">두 경로의 거리·주변 사고다발지역 비교</a>
      </section>
      <section className="station-section" id="stations">
        <div className="section-heading"><h2>출발지 주변 따릉이 <span className="count">{nearby.loading || nearby.error ? "—" : nearby.matchedCount}</span></h2><span className="sample-label">서울시 bikeList</span></div>
        <p className="station-origin"><Icon name="pin" size={14}/>{draftStart.name} 기준 · 직선거리순</p>
        <div className="station-toolbar station-filters">
          <select aria-label="대여소 검색 반경" value={radius} onChange={(e) => setRadius(Number(e.target.value))}><option value={500}>반경 500m</option><option value={1000}>반경 1km</option><option value={2000}>반경 2km</option><option value={5000}>반경 5km</option></select>
          <select aria-label="대여소 필터" value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}><option value="all">전체 대여소</option><option value="available">대여 가능</option></select>
          <button type="button" onClick={nearby.refresh} disabled={nearby.loading} aria-label="대여소 새로고침">새로고침</button>
        </div>
        <label className="station-name-search"><Icon name="search" size={16}/><input aria-label="주변 대여소 이름 검색" placeholder="주변 대여소 이름 검색" value={stationQuery} onChange={(e) => setStationQuery(e.target.value)} maxLength={80}/></label>
        {nearby.loading && <p className="station-state" role="status">서울시 대여소를 조회하고 있습니다…</p>}
        {nearby.error && <div className="station-state error" role="alert"><strong>대여소를 불러오지 못했습니다.</strong><p>{nearby.error}</p><button type="button" onClick={nearby.refresh}>다시 시도</button></div>}
        {!nearby.loading && !nearby.error && filtered.length === 0 && <p className="station-state" role="status">조건에 맞는 대여소가 없습니다. 검색 반경을 넓히거나 필터를 변경해 보세요.</p>}
        <div className="station-list">{filtered.map((s) => <button key={s.id} className={`station-row ${s.id === selectedStation ? "active" : ""}`} onClick={() => { setSelectedStation(s.id); setShowStations(true); }}><span className="station-icon"><Icon name="bike" size={20}/></span><span className="station-info"><strong>{s.name}</strong><small>직선 {formatDistance(s.distanceMeters)} · {s.id}</small></span><span className={`bike-count ${s.bikes === 0 ? "empty" : s.bikes < 5 ? "low" : ""}`}>{s.bikes}<small>대</small></span></button>)}</div>
        <p className="station-updated">출처: <a href={SOURCES.stations.url} target="_blank" rel="noopener noreferrer">서울 열린데이터광장</a><br/>{nearby.fetchedAt ? `서버 조회 ${informationTime(nearby.fetchedAt)} KST` : "아직 조회한 재고 정보가 없습니다."}<br/>제공처 측정시각 미제공 · 수량은 현장과 다를 수 있습니다.{nearby.fetchedAt && <><br/>60초마다 갱신 · 최대 30곳 표시 ({nearby.matchedCount}곳 중)</>}</p>
      </section><footer className="sidebar-footer"><Icon name="shield" size={17}/><span>헬멧과 함께, 안전한 라이딩을 시작하세요.</span></footer>
    </aside><section className="map-workspace" aria-label="통합 자전거 정보 화면"><div className="map-topbar"><div><span className="region-label">서울특별시</span><span className="map-topbar-divider"/><span>{selected?.name ?? draftStart.name} · {draftEnd.name}</span></div><a className="preview-pill" href="#information-sources">기준시각·출처 확인</a></div>
      <div className="journey-overview" aria-label="선택한 여정 통합 요약">
        <div><span><Icon name="bike" size={17}/>대여 가능 수량</span><strong>{selected ? `${selected.bikes}대` : nearby.error ? "조회 실패" : "대여소 선택"}</strong><small>{selected?.name ?? "주변 목록에서 선택하세요."}</small></div>
        <div><span><Icon name="route" size={17}/>선택 경로 거리</span><strong>{route ? `${(route.distanceMeters / 1000).toFixed(2)}km` : routing.loading ? "조회 중" : "경로 미조회"}</strong><small>{mode === "BIKE_ONLY" ? "자전거도로 우선" : "최단 경로"}</small></div>
        <div><span><Icon name="warning" size={17}/>주변 사고다발지역</span><strong>{activeComparison.nearbyHotspotCount === null ? accidentData.error ? "확인 불가" : "분석 대기" : `${activeComparison.nearbyHotspotCount}곳`}</strong><small>{accidentData.year ? `${accidentData.year}년 과거 통계` : "사고 기준연도 조회 중"} · {accidentDistance}m 기준</small></div>
        <div><span><Icon name="sun" size={17}/>출발지 기상예보</span><strong>{weather.data ? `${weather.data.current.temperature}°C · ${weather.data.current.precipitationProbability}%` : weather.error ? "조회 실패" : "조회 중"}</strong><small>기온 · 강수확률{weather.data && <> · {new Date(weather.data.current.forecastAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} 예보</>}</small></div>
      </div>
      <div className="map-container"><BikeMap stations={stations} stationOrigin={draftStart} end={draftEnd} route={route} accidents={displayedHotspots} accidentYear={accidentData.year} selectedAccident={selectedAccident} onSelectAccident={selectAccident} showStations={showStations} showIncidents={showIncidents} selectedStation={selectedStation} onSelectStation={selectStation}/><div className="layer-controls" aria-label="지도 표시 설정"><span className="layer-title"><Icon name="layers" size={17}/>지도 표시</span><button className={showStations ? "active" : ""} aria-pressed={showStations} onClick={() => setShowStations(!showStations)}><Icon name="bike" size={17}/>따릉이{showStations && <Icon name="check" size={14}/>}</button><button className={showIncidents ? "active warning-layer" : ""} aria-pressed={showIncidents} onClick={() => setShowIncidents(!showIncidents)}><Icon name="warning" size={17}/>과거 사고{showIncidents && <Icon name="check" size={14}/>}</button></div>
      {selectedHotspot && showIncidents && <div className="accident-popup"><div className="popup-heading"><span><Icon name="warning" size={17}/>{accidentData.year}년 과거 사고 통계</span><button aria-label="사고다발지역 상세 닫기" onClick={() => setSelectedAccident(null)}><Icon name="close" size={16}/></button></div><strong>{selectedHotspot.name}</strong><p>사고 <b>{selectedHotspot.accidentCount}건</b> · 사상자 {selectedHotspot.casualties}명</p><p>사망 {selectedHotspot.deaths}명 · 중상 {selectedHotspot.severeInjuries}명</p>{selectedHotspot.distanceToRouteMeters !== null && <p className="hotspot-distance">경로까지 직선 {formatDistance(selectedHotspot.distanceToRouteMeters)}</p>}<small>실시간 사고·현재 위험도 정보가 아닙니다.</small></div>}
      {selected && showStations && <div className="station-popup"><div className="popup-heading"><span><Icon name="bike" size={17}/>선택한 대여소</span><button aria-label="대여소 상세 닫기" onClick={() => setSelectedStation(null)}><Icon name="close" size={16}/></button></div><strong>{selected.name}</strong><p>대여 가능 <b>{selected.bikes}대</b>{selected.capacity !== null && <span>거치대 {selected.capacity}개</span>}</p><small>출발지에서 직선 {formatDistance(selected.distanceMeters)}<br/>서울시 제공 수량 · 현장 상황과 다를 수 있습니다.</small></div>}<div className="ride-tip"><span className="tip-icon"><Icon name="shield" size={22}/></span><div><strong>천천히 달려도, 충분히 좋은 하루</strong><p>보행자와 만나는 곳에서는 속도를 줄여주세요.</p></div></div></div>
      <RouteResultSummary rows={comparisons} routing={routing} activeMode={mode} stationName={selected?.name} destinationName={draftEnd.name} year={accidentData.year} threshold={accidentDistance}/>
      <RouteComparisonPanel rows={comparisons} routing={routing} hasStation={Boolean(selected)} activeMode={mode} onSelect={setMode} threshold={accidentDistance} onThresholdChange={setAccidentDistance} accidentYear={accidentData.year} accidentsLoading={accidentData.loading} accidentError={accidentData.error}/>
      <div className="insight-grid"><WeatherCard origin={selected ?? draftStart} weather={weather}/>
      <section className="safety-card" id="safety">
        <div className="section-heading"><h2><Icon name="warning" size={19}/>자전거 사고다발지역</h2><span className="historical-badge">{accidentData.year ? `${accidentData.year}년 과거 통계` : "과거 통계"}</span></div>
        <p className="historical-notice">과거 1년간 발생한 자전거 교통사고를 집계한 자료입니다. 실시간 사고나 현재 도로의 위험도·안전도를 뜻하지 않습니다.</p>
        <div className="accident-toolbar"><label>경로 근접 기준 <select aria-label="경로와 사고다발지역 사이 거리 기준" value={accidentDistance} onChange={(e) => setAccidentDistance(Number(e.target.value))}><option value={100}>100m</option><option value={300}>300m</option><option value={500}>500m</option><option value={1000}>1km</option></select></label><label><input type="checkbox" checked={Boolean(route) && onlyNearRoute} disabled={!route} onChange={(e) => setOnlyNearRoute(e.target.checked)}/>경로 주변만</label><button onClick={accidentData.refresh} disabled={accidentData.loading}>다시 조회</button></div>
        {accidentData.loading && <p className="station-state" role="status">최신 제공 연도의 서울 사고다발지역을 조회하고 있습니다…</p>}
        {accidentData.error && <p className="station-state error" role="alert">{accidentData.error}</p>}
        {!accidentData.loading && !accidentData.error && <>
          <p className="safety-subtitle">최신 제공 사고 기준연도 <b>{accidentData.latestYear}년</b> · 서울 {routeHotspots.length}곳{route ? <> · 경로 {formatDistance(accidentDistance)} 이내 <b>{nearHotspots.length}곳</b></> : " · 자전거 경로 조회 후 근접 분석"}</p>
          {displayedHotspots.length === 0 && <p className="station-state">선택한 거리 내 사고다발지역이 없습니다. 현재 경로가 안전하다는 의미는 아닙니다.</p>}
          <div className="incident-list accident-list">{displayedHotspots.slice(0, 10).map((item) => <button className={`incident-row accident-row ${item.nearRoute ? "near-route" : ""} ${item.id === selectedAccident ? "selected" : ""}`} key={item.id} onClick={() => selectAccident(item.id)}><span className="incident-symbol"><Icon name="warning" size={18}/></span><span><strong>{item.name}</strong><span className="accident-row-detail">사고 {item.accidentCount}건 · 사상자 {item.casualties}명{item.distanceToRouteMeters !== null && <> · 경로에서 {formatDistance(item.distanceToRouteMeters)}</>}</span></span>{item.nearRoute && <span className="near-badge">경로 근접</span>}</button>)}</div>
          <div className="safety-note">목록은 최대 10곳, 지도는 조건에 맞는 전체 지점을 표시합니다. 근접 거리는 다발지역 중심점과 선택한 경로 선분 사이의 직선 최단거리입니다.</div>
        </>}
        <p className="accident-attribution">출처: <a href={ACCIDENT_SOURCE_URL} target="_blank" rel="noopener noreferrer">한국도로교통공단 TAAS</a><br/>최신 제공연도 확인: {ACCIDENT_YEAR_VERIFIED_AT}{accidentData.fetchedAt && <> · 데이터 조회 {new Date(accidentData.fetchedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</>}</p>
      </section></div>
      <div id="information-sources"><InformationSources stations={nearby} routing={routing} activeMode={mode} hasStation={Boolean(selected)} accidents={accidentData} weather={weather}/></div>
      <footer className="workspace-footer"><span>SAFE BIKE SEOUL</span><p>데이터를 비교하는 서울 자전거 지도.</p><span>실제 안전성·주행 가능 여부를 보증하지 않습니다.</span></footer></section></main>
  </div>;
}
