import "server-only";
import { requireSecret } from "./env";
import { array, number, record, text, upstreamJSON } from "./http";

export async function searchPlaces(query: string, page: number) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.search = new URLSearchParams({ query, page: String(page), size: "10", rect: "126.76,37.42,127.19,37.71" }).toString();
  const body = record(await upstreamJSON(url, { Authorization: `KakaoAK ${requireSecret("KAKAO_REST_API_KEY")}` }));
  const meta = record(body.meta);
  return {
    places: array(body.documents).map((item) => { const row = record(item); return { id: text(row.id), name: text(row.place_name), address: text(row.road_address_name || row.address_name), lat: number(row.y), lng: number(row.x) }; }),
    pagination: { page, isEnd: meta.is_end === true },
  };
}


