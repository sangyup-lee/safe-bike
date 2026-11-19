export const SOURCES = {
  stations: { name: "서울 열린데이터광장", url: "https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do" },
  routes: { name: "카카오맵 자전거 경로", url: "https://developers.kakao.com/docs/ko/kakaomap/rest-api#route-bicycle" },
  accidents: { name: "한국도로교통공단 TAAS", url: "https://opendata.koroad.or.kr/api/selectBicycleDataSet.do" },
  weather: { name: "기상청 단기예보", url: "https://www.data.go.kr/data/15084084/openapi.do" },
} as const;

export function informationTime(iso: string | null | undefined) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "미조회";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}
