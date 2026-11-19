export type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bikes: number;
  capacity: number | null;
};
export type NearbyStation = Station & { distanceMeters: number };
export type StationSnapshot = { stations: Station[]; fetchedAt: string };

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid station response");
  return value as Record<string, unknown>;
}
function numeric(value: unknown) {
  if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "") return NaN;
  return Number(value);
}
export function parseStationPage(value: unknown): { stations: Station[]; rowCount: number; ended: boolean } {
  const body = object(value);
  if (body.RESULT && object(body.RESULT).CODE === "INFO-200") return { stations: [], rowCount: 0, ended: true };
  const data = object(body.rentBikeStatus);
  if (object(data.RESULT).CODE !== "INFO-000" || !Array.isArray(data.row)) throw new Error("Station service rejected request");
  const stations: Station[] = [];
  for (const item of data.row) {
    const row = object(item);
    const lat = numeric(row.stationLatitude), lng = numeric(row.stationLongitude), bikes = numeric(row.parkingBikeTotCnt), capacity = numeric(row.rackTotCnt);
    if (typeof row.stationId !== "string" || !row.stationId.trim() || typeof row.stationName !== "string" || !row.stationName.trim()) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 37.4 || lat > 37.75 || lng < 126.7 || lng > 127.25 || !Number.isInteger(bikes) || bikes < 0) continue;
    stations.push({ id: row.stationId, name: row.stationName, lat, lng, bikes, capacity: Number.isInteger(capacity) && capacity >= 0 ? capacity : null });
  }
  return { stations, rowCount: data.row.length, ended: false };
}

export async function collectStations(fetchPage: (first: number, last: number) => Promise<unknown>, pageSize = 1000): Promise<Station[]> {
  const byId = new Map<string, Station>();
  // list_total_count may be the size of this response, not the citywide total.
  // Read each page before sorting; sorting only the first page misses nearby stations.
  for (let page = 0; page < 20; page++) {
    const first = page * pageSize + 1;
    const result = parseStationPage(await fetchPage(first, first + pageSize - 1));
    result.stations.forEach((station) => byId.set(station.id, station));
    if (result.ended || result.rowCount < pageSize) {
      if (!byId.size) throw new Error("No usable stations returned");
      return [...byId.values()];
    }
  }
  throw new Error("Station pagination incomplete");
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const lat = (b.lat - a.lat) * rad, lng = (b.lng - a.lng) * rad;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function findNearbyStations(stations: Station[], origin: { lat: number; lng: number }, radius: number, minBikes: number, limit: number, query = "") {
  const matching = stations.map((s) => ({ ...s, distanceMeters: distanceMeters(origin, s) }))
    .filter((s) => s.distanceMeters <= radius && s.bikes >= minBikes && s.name.includes(query))
    .sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id));
  return { stations: matching.slice(0, limit), matchedCount: matching.length };
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}
