import type { HourPoint } from "./forecast";
import type { Lang } from "./i18n";

/**
 * An hour is "safer" while its band is Caution or lower (the heat index rounds to
 * under PAGASA's Extreme Caution, 33 °C). This is the same value the strip colours by.
 */
export const isSafeHour = (h: HourPoint): boolean => h.band.level <= 1;

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

/**
 * Warning for hours after `afterHour` that reach Danger (level 3+) while the
 * chosen hour is not already there. Returns null when there is nothing to add.
 */
export function laterDanger(
  hours: HourPoint[],
  afterHour: number,
  currentLevel: number,
): { from: string; top: number } | null {
  if (currentLevel >= 3) return null;
  const danger = hours.filter((h) => h.hour > afterHour && h.band.level >= 3);
  if (danger.length === 0) return null;
  return { from: formatHour(danger[0].hour), top: Math.max(...danger.map((h) => Math.round(h.hi))) };
}

/** Inclusive span: the last hour named is a full hour that is included. */
function describeSpan(r: Run, lang: Lang): string {
  const last = r.end - 1;
  if (last === r.start) return formatHour(r.start);
  return `${formatHour(r.start)}${lang === "tl" ? " hanggang " : " to "}${formatHour(last)}`;
}

/** `first` is the first hour considered; 24 is the end of the day. */
function describeRun(r: Run, first: number, lang: Lang): string {
  const tl = lang === "tl";
  const startsAtEdge = r.start <= first;
  const endsAtEdge = r.end >= 24;
  if (startsAtEdge && endsAtEdge) {
    if (first > 0) return tl ? "buong natitirang araw" : "the rest of the day";
    return tl ? "buong araw" : "all day";
  }
  if (startsAtEdge) return `${tl ? "bago mag-" : "before "}${formatHour(r.end)}`;
  if (endsAtEdge) return `${tl ? "mula " : "from "}${formatHour(r.start)}`;
  return describeSpan(r, lang);
}

function joinList(parts: string[], lang: Lang): string {
  if (parts.length <= 1) return parts.join("");
  const and = lang === "tl" ? " at " : " and ";
  return parts.slice(0, -1).join(", ") + and + parts[parts.length - 1];
}

/**
 * One-sentence safe-window summary for a day. Covers every displayed hour
 * (12 AM to 11 PM); `fromHour` skips hours already past (used for today).
 */
export function safeWindowSentence(
  hours: HourPoint[],
  dayLabel: string,
  lang: Lang,
  fromHour = 0,
): string {
  const window = hours.filter((h) => h.hour >= fromHour);
  if (window.length === 0) {
    return lang === "tl"
      ? `Wala nang natitirang oras ${dayLabel}; tingnan ang susunod na araw.`
      : `No hours left ${dayLabel}; check the next day.`;
  }
  const first = window[0].hour;
  const safe = window.filter(isSafeHour).map((h) => h.hour);
  if (safe.length > 0) {
    const text = joinList(runsOf(safe).map((r) => describeRun(r, first, lang)), lang);
    return lang === "tl"
      ? `Pinakaligtas na oras sa labas ${dayLabel}: ${text}.`
      : `Safest outdoor hours ${dayLabel}: ${text}.`;
  }
  // No hour is Caution or lower: name the coolest stretch as one phrase.
  const min = Math.min(...window.map((h) => Math.round(h.hi)));
  const coolest = window.filter((h) => Math.round(h.hi) <= min + 1).map((h) => h.hour);
  const text = joinList(runsOf(coolest).map((r) => describeSpan(r, lang)), lang);
  return lang === "tl"
    ? `Walang oras na mababa sa 33 °C ${dayLabel}. Pinakamalamig: ${text}; magpahinga nang madalas.`
    : `No hour stays under 33 °C ${dayLabel}. Coolest: ${text}; take frequent breaks.`;
}
