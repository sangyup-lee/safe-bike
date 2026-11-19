"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/demo-data";
import type { RouteHotspot } from "@/lib/accidents";
import type { BicycleRoute } from "@/lib/bicycle-route";
import { formatDistance, type NearbyStation } from "@/lib/stations";
import Icon from "./icon";

type LatLng = object;
type MapInstance = { setBounds: (bounds: object) => void; panTo: (point: LatLng) => void; getLevel: () => number; setLevel: (level: number) => void; relayout: () => void };
type Overlay = { setMap: (map: MapInstance | null) => void };
type MapsSDK = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new () => { extend: (point: LatLng) => void };
  Map: new (container: HTMLElement, options: object) => MapInstance;
  CustomOverlay: new (options: object) => Overlay;
  Polyline: new (options: object) => Overlay;
  Polygon: new (options: object) => Overlay;
};
declare global { interface Window { kakao?: { maps: MapsSDK } } }
let sdkPromise: Promise<MapsSDK> | undefined;
function loadSDK(key: string) {
  if (!sdkPromise) sdkPromise = new Promise<MapsSDK>((resolve, reject) => {
    const timer = window.setTimeout(() => fail(), 9000);
    const script = document.createElement("script");
    const fail = () => { window.clearTimeout(timer); script?.remove(); sdkPromise = undefined; reject(new Error("SDK unavailable")); };
    const ready = () => window.kakao?.maps.load(() => { window.clearTimeout(timer); resolve(window.kakao!.maps); });
    if (window.kakao?.maps) return ready();
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.onload = () => window.kakao?.maps ? ready() : fail();
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return sdkPromise;
}

type Props = { end: Place; stationOrigin: Place; stations: NearbyStation[]; route: BicycleRoute | null; accidents: RouteHotspot[]; accidentYear: number | null; selectedAccident: string | null; onSelectAccident: (id: string) => void; showStations: boolean; showIncidents: boolean; selectedStation: string | null; onSelectStation: (id: string) => void };
export default function BikeMap({ end, stationOrigin, stations, route, accidents, accidentYear, selectedAccident, onSelectAccident, showStations, showIncidents, selectedStation, onSelectStation }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const [sdk, setSDK] = useState<MapsSDK | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const lastAccident = useRef<string | null>(null);
  useEffect(() => {
    let disposed = false;
    const timeout = window.setTimeout(() => { if (!disposed) setStatus("error"); }, 10000);
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) { window.clearTimeout(timeout); const timer = window.setTimeout(() => setStatus("error"), 0); return () => { disposed = true; window.clearTimeout(timer); }; }
    loadSDK(key).then((maps) => {
      if (disposed || !container.current) return;
      map.current = new maps.Map(container.current, { center: new maps.LatLng(37.5284, 126.9346), level: 6 });
      setSDK(maps); setStatus("ready"); window.clearTimeout(timeout);
    }).catch(() => { if (!disposed) { setStatus("error"); window.clearTimeout(timeout); } });
    return () => { disposed = true; window.clearTimeout(timeout); };
  }, [retry]);

  useEffect(() => {
    if (!sdk || !map.current) return;
    const overlays: Overlay[] = [];
    const point = (p: { lat: number; lng: number }) => new sdk.LatLng(p.lat, p.lng);
    if (route) for (const segment of route.paths) {
      const path = segment.map(point);
      overlays.push(new sdk.Polyline({ map: map.current, path, strokeWeight: 9, strokeColor: "#ffffff", strokeOpacity: 0.9 }));
      overlays.push(new sdk.Polyline({ map: map.current, path, strokeWeight: 5, strokeColor: route.mode === "BIKE_ONLY" ? "#17866c" : "#4e75d9", strokeOpacity: 1 }));
    }
    const marker = (p: { lat: number; lng: number }, text: string, className: string, onClick?: () => void, title?: string) => {
      const el = document.createElement("button");
      el.className = `map-marker ${className}`; el.textContent = text; el.type = "button";
      el.title = title ?? text; el.setAttribute("aria-label", title ?? text);
      if (onClick) el.onclick = onClick;
      overlays.push(new sdk.CustomOverlay({ map: map.current, position: point(p), content: el, yAnchor: 1.2, zIndex: className.includes("selected") ? 9 : 5 }));
    };
    const selected = stations.find((s) => s.id === selectedStation);
    if (selected) marker(selected, `경로 출발 · ${selected.name}`, "endpoint start");
    marker(end, `도착 · ${end.name}`, "endpoint end");
    marker(stationOrigin, "대여소 검색 기준", "endpoint start");
    if (showStations) stations.forEach((s) => marker(s, `${s.bikes}대`, `station ${s.bikes === 0 ? "empty" : ""} ${selectedStation === s.id ? "selected" : ""}`, () => onSelectStation(s.id), `${s.name}: 대여 가능 ${s.bikes}대, 출발지에서 직선 ${formatDistance(s.distanceMeters)}`));
    if (showIncidents) accidents.forEach((s) => {
      const highlight = s.nearRoute || s.id === selectedAccident;
      if (s.polygon) overlays.push(new sdk.Polygon({ map: map.current, path: s.polygon.map((ring) => ring.map(point)), strokeWeight: highlight ? 2 : 1, strokeColor: highlight ? "#c65236" : "#b9925e", strokeOpacity: 0.8, fillColor: highlight ? "#e88862" : "#dfbb7c", fillOpacity: highlight ? 0.23 : 0.1, zIndex: 2 }));
      marker(s, `⚠ ${s.accidentCount}건`, `incident ${highlight ? "near-route" : ""}`, () => onSelectAccident(s.id), `${accidentYear}년 과거 사고다발지역: ${s.name}, 사고 ${s.accidentCount}건${s.distanceToRouteMeters === null ? "" : `, 경로까지 직선 ${formatDistance(s.distanceToRouteMeters)}`}`);
    });
    const observer = new ResizeObserver(() => map.current?.relayout());
    if (container.current) observer.observe(container.current);
    return () => { overlays.forEach((o) => o.setMap(null)); observer.disconnect(); };
  }, [sdk, end, stationOrigin, stations, route, accidents, accidentYear, selectedAccident, onSelectAccident, showStations, showIncidents, selectedStation, onSelectStation]);

  useEffect(() => {
    if (!sdk || !map.current) return;
    const bounds = new sdk.LatLngBounds();
    [end, stationOrigin, ...(route ? route.paths.flat() : [])].forEach((p) => bounds.extend(new sdk.LatLng(p.lat, p.lng)));
    map.current.setBounds(bounds);
  }, [sdk, end, stationOrigin, route]);

  useEffect(() => {
    const station = stations.find((s) => s.id === selectedStation);
    if (sdk && map.current && station && showStations) map.current.panTo(new sdk.LatLng(station.lat, station.lng));
  }, [sdk, stations, selectedStation, showStations]);

  useEffect(() => {
    const accident = accidents.find((s) => s.id === selectedAccident);
    if (!accident) { lastAccident.current = null; return; }
    if (sdk && map.current && showIncidents && lastAccident.current !== accident.id) { map.current.panTo(new sdk.LatLng(accident.lat, accident.lng)); map.current.setLevel(Math.min(map.current.getLevel(), 5)); lastAccident.current = accident.id; }
  }, [sdk, accidents, selectedAccident, showIncidents]);

  function reset() {
    if (!sdk || !map.current) return;
    const bounds = new sdk.LatLngBounds();
    [end, stationOrigin, ...(showStations ? stations : []), ...(route ? route.paths.flat() : [])].forEach((p) => bounds.extend(new sdk.LatLng(p.lat, p.lng)));
    map.current.setBounds(bounds);
  }
  function changeZoom(delta: number) {
    if (map.current) map.current.setLevel(Math.max(1, Math.min(12, map.current.getLevel() + delta)));
  }
  function showAllAccidents() {
    if (!sdk || !map.current || !accidents.length) return;
    const bounds = new sdk.LatLngBounds();
    accidents.forEach((p) => bounds.extend(new sdk.LatLng(p.lat, p.lng)));
    map.current.setBounds(bounds);
  }
  return <div className="map-stage">
    <div ref={container} className={`kakao-canvas ${status !== "ready" ? "hidden-map" : ""}`} aria-label="카카오 지도"/>
    {status !== "ready" && <div className="map-error-panel" role="status"><Icon name="pin" size={38}/><h2>{status === "loading" ? "카카오 지도를 불러오는 중입니다" : "카카오 지도에 연결하지 못했습니다"}</h2><p>{status === "loading" ? "대여소 현황은 목록에서도 확인할 수 있습니다." : "JavaScript 키, 지도 API 사용 설정과 등록 도메인을 확인해 주세요."}</p><small>지도 연결 전에는 실제 대여소 위치 마커를 표시하지 않습니다.</small>{status === "error" && <button onClick={() => { setStatus("loading"); setRetry((n) => n + 1); }}>지도 다시 연결</button>}</div>}
    <div className="map-provider"><span className={`provider-dot ${status === "ready" ? "connected" : ""}`}/>{status === "ready" ? "Kakao Map · 따릉이: 서울시" : "카카오맵 연결 대기"}</div>
    <div className="map-controls"><button aria-label="지도 확대" disabled={status !== "ready"} onClick={() => changeZoom(-1)}>+</button><button aria-label="지도 축소" disabled={status !== "ready"} onClick={() => changeZoom(1)}>−</button><button aria-label="경로와 대여소 전체 보기" title="경로와 대여소 전체 보기" disabled={status !== "ready"} onClick={reset}><Icon name="locate"/></button><button aria-label="사고다발지역 전체 보기" title="사고다발지역 전체 보기" disabled={status !== "ready" || !showIncidents || !accidents.length} onClick={showAllAccidents}><Icon name="warning"/></button></div>
    <div className="map-legend"><span><i className="legend-line"/>{route ? route.mode === "BIKE_ONLY" ? "자전거도로 우선" : "최단 경로" : "경로 미조회"}</span><span><i className="legend-dot"/>실제 따릉이</span><span><i className="legend-warning"/>{accidentYear ? `${accidentYear}년 과거 사고` : "사고 통계 조회 중"}</span></div>
  </div>;
}
