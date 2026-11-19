import { annotateHotspots, type AccidentHotspot, type RouteHotspot } from "./accidents.ts";
import { bicycleModes, type BicycleMode, type BicycleRoute } from "./bicycle-route.ts";

export type RouteComparison = {
  mode: BicycleMode;
  distanceMeters: number | null;
  durationSeconds: number | null;
  nearbyHotspotCount: number | null;
  hotspots: RouteHotspot[];
};

export function compareRoutes(routes: Record<BicycleMode, BicycleRoute | null>, accidents: AccidentHotspot[] | null, thresholdMeters: number): RouteComparison[] {
  return bicycleModes.map((mode) => {
    const route = routes[mode];
    const hotspots = accidents ? annotateHotspots(accidents, route?.paths ?? null, thresholdMeters) : [];
    return { mode, distanceMeters: route?.distanceMeters ?? null, durationSeconds: route?.durationSeconds ?? null, nearbyHotspotCount: route && accidents ? hotspots.filter((item) => item.nearRoute).length : null, hotspots };
  });
}
