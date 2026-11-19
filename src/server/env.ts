import "server-only";
import { ApiError } from "./http";

type SecretName = "SEOUL_API_KEY" | "DATA_GO_KR_API_KEY" | "KAKAO_REST_API_KEY";

export function requireSecret(name: SecretName) {
  const value = process.env[name]?.trim();
  if (!value || /[\r\n]/.test(value)) throw new ApiError(503, "SERVICE_NOT_CONFIGURED", "요청한 외부 서비스의 서버 설정이 필요합니다.");
  return value;
}

export function publicDataKey() {
  const value = requireSecret("DATA_GO_KR_API_KEY");
  // Accept either the portal's encoded or decoded key; URLSearchParams encodes once.
  try { return decodeURIComponent(value); } catch { return value; }
}
