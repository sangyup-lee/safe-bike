"use client";
import { useEffect, useState } from "react";
import { bicycleModes, type BicycleMode, type BicycleRoute } from "@/lib/bicycle-route";
import type { NearbyStation } from "@/lib/stations";
import type { Place } from "@/lib/demo-data";

type ModeResult = { route: BicycleRoute | null; error: string; fetchedAt: string };
type Results = Record<BicycleMode, ModeResult>;
const empty: Results = { BIKE_ONLY: { route: null, error: "", fetchedAt: "" }, SHORTEST: { route: null, error: "", fetchedAt: "" } };

export function useBicycleRoutes(station: NearbyStation | undefined, destination: Place) {
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; modes: Results } | null>(null);
  const search = station ? new URLSearchParams({ stationId: station.id, startLat: String(station.lat), startLng: String(station.lng), endLat: String(destination.lat), endLng: String(destination.lng) }).toString() : "";
  const key = `${search}:${refresh}`;
  useEffect(() => {
    if (!search) return;
    const abort = new AbortController();
    void (async () => {
      const responses = await Promise.all(bicycleModes.map(async (mode): Promise<[BicycleMode, ModeResult]> => {
        try {
          const response = await fetch(`/api/routes?${search}&route_mode=${mode}`, { signal: abort.signal, cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error?.message || "자전거 경로를 조회하지 못했습니다.");
          if (body.meta?.isDemo !== false || body.data?.route?.mode !== mode || !Array.isArray(body.data.route.paths)) throw new Error("실제 자전거 경로 응답을 확인하지 못했습니다.");
          return [mode, { route: body.data.route, error: "", fetchedAt: body.meta.fetchedAt }];
        } catch (error) {
          return [mode, { route: null, error: error instanceof Error ? error.message : "경로 조회 중 연결이 끊겼습니다.", fetchedAt: "" }];
        }
      }));
      if (!abort.signal.aborted) setResult({ key, modes: Object.fromEntries(responses) as Results });
    })();
    return () => abort.abort();
  }, [key, search]);
  const current = result?.key === key ? result.modes : empty;
  return { modes: current, loading: Boolean(search) && result?.key !== key, refresh: () => setRefresh((n) => n + 1) };
}
export type RoutingState = ReturnType<typeof useBicycleRoutes>;
