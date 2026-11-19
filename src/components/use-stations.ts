"use client";
import { useEffect, useState } from "react";
import type { NearbyStation } from "@/lib/stations";

type Result = { key: string; stations: NearbyStation[]; fetchedAt: string; matchedCount: number; totalStations: number; error: string };
export function useStations(origin: { lat: number; lng: number }, radius: number, minBikes: number, query: string) {
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const params = new URLSearchParams({ lat: String(origin.lat), lng: String(origin.lng), radius: String(radius), minBikes: String(minBikes), limit: "30", q: query });
  const search = params.toString();
  const key = `${search}:${refresh}`;
  useEffect(() => {
    const abort = new AbortController();
    const delay = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/stations?${search}`, { signal: abort.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "대여소 조회에 실패했습니다.");
        if (body.meta?.isDemo !== false || !Array.isArray(body.data?.stations)) throw new Error("실제 대여소 응답을 확인하지 못했습니다.");
        if (!abort.signal.aborted) setResult({ key, stations: body.data.stations, fetchedAt: body.meta.fetchedAt, matchedCount: body.data.matchedCount, totalStations: body.data.totalStations, error: "" });
      } catch (error) {
        if (!abort.signal.aborted) setResult({ key, stations: [], fetchedAt: "", matchedCount: 0, totalStations: 0, error: error instanceof Error ? error.message : "대여소 조회 중 연결이 끊겼습니다." });
      }
    }, 250);
    return () => { abort.abort(); window.clearTimeout(delay); };
  }, [key, search]);
  useEffect(() => {
    const interval = window.setInterval(() => setRefresh((n) => n + 1), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const current = result?.key === key ? result : null;
  return { stations: current?.stations ?? [], fetchedAt: current?.fetchedAt ?? "", matchedCount: current?.matchedCount ?? 0, totalStations: current?.totalStations ?? 0, error: current?.error ?? "", loading: current === null, refresh: () => setRefresh((n) => n + 1) };
}
export type StationsState = ReturnType<typeof useStations>;
