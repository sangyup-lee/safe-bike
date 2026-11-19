import "server-only";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function invalid(message = "요청한 검색 조건을 확인해 주세요."): never {
  throw new ApiError(400, "INVALID_QUERY", message);
}

export function queryParams(request: Request, allowed: string[]) {
  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) {
    if (!allowed.includes(key) || params.getAll(key).length > 1) invalid();
  }
  return params;
}

export function integer(params: URLSearchParams, name: string, fallback: number, min: number, max: number) {
  const raw = params.get(name);
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) invalid();
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}

export function success<T>(data: T, source: string, isDemo: boolean, extra: Record<string, unknown> = {}) {
  return { data, meta: { source, isDemo, fetchedAt: new Date().toISOString(), ...extra } };
}

export async function handleApi(work: () => Promise<unknown>) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  try { return Response.json(await work(), { headers }); }
  catch (error) {
    // Never serialize/log fetch errors: their URLs or headers may include credentials.
    const safe = error instanceof ApiError ? error : new ApiError(502, "UPSTREAM_UNAVAILABLE", "외부 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers });
  }
}

export async function upstreamJSON(url: URL, headers?: HeadersInit): Promise<unknown> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000), cache: "no-store", redirect: "error" });
  if (response.status === 401) throw new ApiError(502, "UPSTREAM_AUTHENTICATION_FAILED", "외부 API 인증에 실패했습니다(HTTP 401). 서버 인증키를 확인해 주세요.");
  if (response.status === 403) throw new ApiError(502, "UPSTREAM_PERMISSION_DENIED", "외부 API 호출 권한이 없습니다(HTTP 403). 서비스 활용 승인을 확인해 주세요.");
  if (response.status === 429) throw new ApiError(429, "UPSTREAM_QUOTA_EXCEEDED", "외부 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
  if (!response.ok) throw new ApiError(502, "UPSTREAM_UNAVAILABLE", "외부 서비스에서 데이터를 가져오지 못했습니다.");
  return response.json();
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid upstream response");
  return value as Record<string, unknown>;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid upstream response");
  return value;
}
export function text(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Invalid upstream response");
  return String(value);
}
export function number(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "") throw new Error("Invalid upstream response");
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error("Invalid upstream response");
  return result;
}
