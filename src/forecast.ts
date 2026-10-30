import { bandFor, type Band } from "./bands";
import { heatIndexC } from "./heat";

export interface HourPoint {
  /** Local (Asia/Manila) ISO time, e.g. "2026-10-30T14:00". */
  time: string;
  date: string;
  hour: number;
  temp: number;
  rh: number;
  apparent: number | null;
  hi: number;
  band: Band;
}

export interface Day {
  date: string;
  hours: HourPoint[];
}

interface OpenMeteoResponse {
  hourly?: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    apparent_temperature?: (number | null)[];
  };
}

export const FORECAST_DAYS = 4;

export function forecastUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "temperature_2m,relative_humidity_2m,apparent_temperature",
    timezone: "Asia/Manila",
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

/** Turn an Open-Meteo response into per-day lists of hours with heat index. */
export function parseForecast(data: OpenMeteoResponse): Day[] {
  const h = data.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error("Unexpected response shape");
  const days = new Map<string, HourPoint[]>();
  h.time.forEach((time, i) => {
    const temp = h.temperature_2m[i];
    const rh = h.relative_humidity_2m[i];
    if (temp == null || rh == null) return;
    const hi = heatIndexC(temp, rh);
    const date = time.slice(0, 10);
    const point: HourPoint = {
      time,
      date,
      hour: Number(time.slice(11, 13)),
      temp,
      rh,
      apparent: h.apparent_temperature?.[i] ?? null,
      hi,
      band: bandFor(hi),
    };
    const list = days.get(date) ?? [];
    list.push(point);
    days.set(date, list);
  });
  return [...days.entries()].map(([date, hours]) => ({ date, hours }));
}

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Day[]> {
  const res = await fetch(forecastUrl(lat, lon), { signal });
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
  const days = parseForecast((await res.json()) as OpenMeteoResponse);
  if (days.length === 0) throw new Error("Empty forecast");
  return days;
}

/** Current date and hour in the Philippines, independent of the device clock zone. */
export function manilaNow(now = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}
