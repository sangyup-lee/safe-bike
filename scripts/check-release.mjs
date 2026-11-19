import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const files = execFileSync("git", ["ls-files", "--cached", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
assert.ok(files.length > 0, "Stage the intended release files first.");
const credentials = ["SEOUL_API_KEY", "DATA_GO_KR_API_KEY", "KAKAO_REST_API_KEY", "NEXT_PUBLIC_KAKAO_JS_KEY"].flatMap((name) => {
  const value = process.env[name]?.trim();
  if (!value || value.length < 8) return [];
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { /* Keep raw value. */ }
  return [...new Set([value, decoded, encodeURIComponent(decoded)])];
});
for (const file of files) {
  const name = file.split("/").at(-1);
  assert.ok(!(name.startsWith(".env") && file !== ".env.example"), `Environment file staged: ${file}`);
  assert.ok(!/(^|\/)(node_modules|\.next|\.vercel|\.release)(\/|$)|\.(pem|key|p12|pfx|zip)$/i.test(file), `Excluded file staged: ${file}`);
  const data = execFileSync("git", ["show", `:${file}`], { maxBuffer: 20 * 1024 * 1024 });
  for (const credential of credentials) assert.equal(data.includes(Buffer.from(credential)), false, `Credential detected in ${file}; value withheld.`);
}
const example = await readFile(".env.example", "utf8");
for (const line of example.split(/\r?\n/)) {
  if (/^(SEOUL_API_KEY|DATA_GO_KR_API_KEY|KAKAO_REST_API_KEY|NEXT_PUBLIC_KAKAO_JS_KEY)=/.test(line)) assert.equal(line.split("=").slice(1).join(""), "", "Environment template must contain empty keys.");
}
console.log(`Release check passed: ${files.length} tracked files; environment files/build artifacts excluded; configured credentials absent.`);
