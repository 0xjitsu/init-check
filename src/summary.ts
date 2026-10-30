import type { HourPoint } from "./forecast";
import type { Lang } from "./i18n";

/** Waking hours we judge for outdoor activity: 5 AM up to (not incl.) 9 PM. */
export const OUTDOOR_START = 5;
export const OUTDOOR_END = 21;
/** An hour is "safer" while the heat index stays under PAGASA's Extreme Caution (33 °C). */
export const SAFE_BELOW_C = 33;

export function peakHour(hours: HourPoint[]): HourPoint | null {
  return hours.reduce<HourPoint | null>((best, h) => (best && best.hi >= h.hi ? best : h), null);
}

export function formatHour(hour: number, _lang?: Lang): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour % 24 < 12 ? "AM" : "PM"}`;
}

interface Run {
  start: number;
  end: number; // exclusive
}

function runsOf(hours: number[]): Run[] {
  const runs: Run[] = [];
  for (const h of hours) {
    const last = runs[runs.length - 1];
    if (last && last.end === h) last.end = h + 1;
    else runs.push({ start: h, end: h + 1 });
  }
  return runs;
}

function describeRun(r: Run, lang: Lang): string {
  const before = lang === "tl" ? "bago mag-" : "before ";
  const after = lang === "tl" ? "pagkatapos ng " : "after ";
  if (r.start <= OUTDOOR_START && r.end < OUTDOOR_END) return `${before}${formatHour(r.end, lang)}`;
  if (r.end >= OUTDOOR_END && r.start > OUTDOOR_START) return `${after}${formatHour(r.start, lang)}`;
  if (r.start <= OUTDOOR_START && r.end >= OUTDOOR_END) return lang === "tl" ? "buong araw" : "all day";
  return `${formatHour(r.start, lang)}–${formatHour(r.end, lang)}`;
}

function joinList(parts: string[], lang: Lang): string {
  if (parts.length <= 1) return parts.join("");
  const and = lang === "tl" ? " at " : " and ";
  return parts.slice(0, -1).join(", ") + and + parts[parts.length - 1];
}

/**
 * One-sentence safe-window summary for a day. `fromHour` skips hours already
 * past (used for today).
 */
export function safeWindowSentence(
  hours: HourPoint[],
  dayLabel: string,
  lang: Lang,
  fromHour = 0,
): string {
  const window = hours.filter((h) => h.hour >= Math.max(OUTDOOR_START, fromHour) && h.hour < OUTDOOR_END);
  if (window.length === 0) {
    return lang === "tl"
      ? `Wala nang natitirang oras sa labas ${dayLabel}; tingnan ang susunod na araw.`
      : `No outdoor hours left ${dayLabel}; check the next day.`;
  }
  const safe = window.filter((h) => h.hi < SAFE_BELOW_C).map((h) => h.hour);
  if (safe.length > 0) {
    const text = joinList(runsOf(safe).map((r) => describeRun(r, lang)), lang);
    return lang === "tl"
      ? `Pinakaligtas na oras sa labas ${dayLabel}: ${text}.`
      : `Safest outdoor hours ${dayLabel}: ${text}.`;
  }
  // No hour is under 33 °C: point to the coolest stretch instead.
  const min = Math.min(...window.map((h) => h.hi));
  const coolest = window.filter((h) => h.hi <= min + 1).map((h) => h.hour);
  const text = joinList(runsOf(coolest).map((r) => describeRun(r, lang)), lang);
  return lang === "tl"
    ? `Walang oras na mababa sa 33 °C ${dayLabel}. Pinakamalamig: ${text}; magpahinga nang madalas.`
    : `No hour stays under 33 °C ${dayLabel}. Coolest: ${text}; take frequent breaks.`;
}
