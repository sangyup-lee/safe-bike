"use client";
import { useEffect, useState } from "react";
import type { AccidentHotspot } from "@/lib/accidents";

type Result = { revision: number; accidents: AccidentHotspot[]; year: number | null; latestYear: number | null; fetchedAt: string; error: string };
export function useAccidents() {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/accidents", { signal: abort.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "사고다발지역 정보를 불러오지 못했습니다.");
        if (body.meta?.isDemo !== false || body.meta?.historical !== true || !Array.isArray(body.data?.accidents)) throw new Error("과거 사고 통계의 실제 응답을 확인하지 못했습니다.");
        if (!abort.signal.aborted) setResult({ revision, accidents: body.data.accidents, year: body.data.year, latestYear: body.data.latestAvailableYear, fetchedAt: body.meta.fetchedAt, error: "" });
      } catch (error) {
        if (!abort.signal.aborted) setResult({ revision, accidents: [], year: null, latestYear: null, fetchedAt: "", error: error instanceof Error ? error.message : "사고정보 조회 중 연결이 끊겼습니다." });
      }
    })();
    return () => abort.abort();
  }, [revision]);
  const current = result?.revision === revision ? result : null;
  return { accidents: current?.accidents ?? [], year: current?.year ?? null, latestYear: current?.latestYear ?? null, fetchedAt: current?.fetchedAt ?? "", error: current?.error ?? "", loading: !current, refresh: () => setRevision((n) => n + 1) };
}
export type AccidentsState = ReturnType<typeof useAccidents>;
