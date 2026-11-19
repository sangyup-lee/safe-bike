"use client";
import { formatWeatherTime, WEATHER_SOURCE_URL } from "@/lib/weather";
import type { WeatherState } from "./use-weather";
import Icon from "./icon";

export default function WeatherCard({ origin, weather }: { origin: { lat: number; lng: number; name: string }; weather: WeatherState }) {
  const data = weather.data;
  const icon = data?.current.precipitationType ? "drop" : data?.current.sky === 1 ? "sun" : "cloud";
  return <section className="weather-card" aria-label="출발지 기상청 단기예보">
    <div className="section-heading"><h2><Icon name="sun" size={19}/>라이딩 기상예보</h2><span className="sample-label">기상청 단기예보</span></div>
    <p className="weather-origin"><Icon name="pin" size={14}/>{origin.name}</p>
    {weather.loading && <p className="station-state" role="status">출발지 격자를 변환해 단기예보를 조회하고 있습니다…</p>}
    {weather.error && <div className="station-state error" role="alert"><p>{weather.error}</p><button onClick={weather.refresh}>다시 조회</button></div>}
    {data && <>
      <div className="weather-main"><div><span className="weather-location">가장 가까운 미래 시각의 예보</span><div className="temperature">{data.current.temperature}<span>°C</span><small>{data.current.condition}</small></div></div><span className={`weather-symbol ${icon}`}><Icon name={icon} size={52}/></span></div>
      <div className="weather-details"><span><Icon name="drop" size={15}/>강수확률 <b>{data.current.precipitationProbability}%</b></span>{data.current.windSpeed !== null && <span><Icon name="wind" size={17}/>바람 <b>{data.current.windSpeed}m/s</b></span>}</div>
      <dl className="forecast-times"><div><dt>발표시각</dt><dd><time dateTime={data.issuedAt}>{formatWeatherTime(data.issuedAt)}</time><small>예보 자료가 발표된 시각</small></dd></div><div><dt>예보시각</dt><dd><time dateTime={data.current.forecastAt}>{formatWeatherTime(data.current.forecastAt)}</time><small>위 기온·강수확률의 예측 대상 시각</small></dd></div></dl>
      <p className="weather-grid">출발지 격자 ({data.grid.nx}, {data.grid.ny}) · 약 5km 격자<br/>모든 시각은 한국표준시(KST)입니다.</p>
      {data.usedPreviousIssue && <p className="forecast-fallback">최신 발표 자료가 아직 제공되지 않아 이전 발표의 실제 예보를 사용했습니다.</p>}
      <p className="weather-note">실측 현재 기온이 아닌 예보기온입니다.<br/>강수확률은 표시된 예보시각의 값입니다.</p>
    </>}
    <div className="weather-footer"><a href={WEATHER_SOURCE_URL} target="_blank" rel="noopener noreferrer">출처: 기상청</a><button onClick={weather.refresh} disabled={weather.loading}>새로고침</button></div>
    {weather.fetchedAt && <p className="weather-retrieved">조회 {formatWeatherTime(weather.fetchedAt)} KST · 5분마다 재조회</p>}
  </section>;
}
