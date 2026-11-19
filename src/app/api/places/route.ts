import { handleApi, integer, invalid, queryParams, success } from "@/server/http";
import { searchPlaces } from "@/server/providers";

export async function GET(request: Request) {
  return handleApi(async () => {
    const params = queryParams(request, ["q", "page"]);
    const query = params.get("q")?.trim();
    if (!query || query.length > 80) invalid("검색어는 1~80자로 입력해 주세요.");
    const page = integer(params, "page", 1, 1, 45);
    return success(await searchPlaces(query, page), "kakao-local", false);
  });
}
