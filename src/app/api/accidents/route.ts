import { ACCIDENT_SOURCE_URL, ACCIDENT_YEAR_VERIFIED_AT, LATEST_ACCIDENT_YEAR } from "@/lib/accidents";
import { handleApi, integer, invalid, queryParams, success } from "@/server/http";
import { getAccidentSnapshot } from "@/server/accident-hotspots";

const districts = new Set(["110", "140", "170", "200", "215", "230", "260", "290", "305", "320", "350", "380", "410", "440", "470", "500", "545", "560", "590", "620", "650", "680", "710", "740", "530"]);
export async function GET(request: Request) {
  return handleApi(async () => {
    const params = queryParams(request, ["year", "district"]);
    const year = integer(params, "year", LATEST_ACCIDENT_YEAR, 2012, LATEST_ACCIDENT_YEAR);
    const district = params.get("district") ?? "";
    if (district !== "" && !districts.has(district)) invalid("서울시 자치구 코드 3자리를 입력해 주세요.");
    const snapshot = await getAccidentSnapshot(year, district);
    return success({ accidents: snapshot.accidents, year, district, total: snapshot.total, excludedRows: snapshot.excluded, latestAvailableYear: LATEST_ACCIDENT_YEAR }, "koroad-bicycle-hotspots", false, { fetchedAt: snapshot.fetchedAt, historical: true, yearVerifiedAt: ACCIDENT_YEAR_VERIFIED_AT, sourceUrl: ACCIDENT_SOURCE_URL, attribution: "한국도로교통공단 TAAS", note: `${year}년 과거 자전거 교통사고 다발지역 통계입니다. 실시간 사고나 현재 위험도·안전도 판정이 아닙니다.` });
  });
}
