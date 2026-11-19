import { WEATHER_SOURCE_URL } from "@/lib/weather";
import { handleApi, invalid, queryParams, success } from "@/server/http";
import { getKmaForecast } from "@/server/kma-forecast";

function coordinate(params: URLSearchParams, name: string, min: number, max: number) {
  const raw = params.get(name);
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) invalid("출발지의 올바른 위도·경도를 입력해 주세요.");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) invalid("대한민국 영역 내 출발지 좌표를 선택해 주세요.");
  return value;
}

export async function GET(request: Request) {
  return handleApi(async () => {
    const params = queryParams(request, ["lat", "lng"]);
    const origin = { lat: coordinate(params, "lat", 32, 40), lng: coordinate(params, "lng", 124, 132) };
    const result = await getKmaForecast(origin);
    return success({ origin, ...result.data }, "kma-vilage-forecast", false, { fetchedAt: result.fetchedAt, attribution: "기상청", sourceUrl: WEATHER_SOURCE_URL, timezone: "Asia/Seoul", isObservation: false, note: "발표시각은 예보 자료가 발표된 시각, 예보시각은 기온·강수확률이 예측하는 대상 시각입니다. 현재 관측값이 아닙니다." });
  });
}
