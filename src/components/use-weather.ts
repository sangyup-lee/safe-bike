"use client";
import { useEffect, useState } from "react";
import type { ForecastData } from "@/lib/weather";

type Result = { key: string; data: ForecastData | null; fetchedAt: string; error: string };
export function useWeather(origin: { lat: number; lng: number }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const search = new URLSearchParams({ lat: String(origin.lat), lng: String(origin.lng) }).toString();
  const key = `${search}:${revision}`;
  useEffect(() => {
    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/weather?${search}`, { signal: abort.signal, cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "단기예보를 불러오지 못했습니다.");
        if (body.meta?.isDemo !== false || body.meta?.isObservation !== false || !body.data?.current) throw new Error("기상청의 실제 단기예보 응답을 확인하지 못했습니다.");
        if (!abort.signal.aborted) setResult({ key, data: body.data, fetchedAt: body.meta.fetchedAt, error: "" });
      } catch (error) {
        if (!abort.signal.aborted) setResult({ key, data: null, fetchedAt: "", error: error instanceof Error ? error.message : "단기예보 조회 중 연결이 끊겼습니다." });
      }
    }, 250);
    return () => { abort.abort(); window.clearTimeout(timer); };
  }, [key, search]);
  useEffect(() => {
    const interval = window.setInterval(() => setRevision((n) => n + 1), 5 * 60000);
    return () => window.clearInterval(interval);
  }, []);
  const current = result?.key === key ? result : null;
  return { data: current?.data ?? null, fetchedAt: current?.fetchedAt ?? "", error: current?.error ?? "", loading: !current, refresh: () => setRevision((n) => n + 1) };
}
export type WeatherState = ReturnType<typeof useWeather>;
