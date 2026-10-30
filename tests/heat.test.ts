import assert from "node:assert/strict";
import { test } from "node:test";
import { BANDS, bandFor } from "../src/bands";
import { parseForecast } from "../src/forecast";
import { cToF, fToC, heatIndexC, heatIndexF } from "../src/heat";
import { isSafeHour, laterDanger,safeWindowSentence } from "../src/summary";
import { enterIndex, moveActive } from "../src/combobox";
import { ADVICE } from "../src/advice";

// Reference values from the NWS heat index table (°F, RH %) → °F. The table is rounded.
const NOAA: [number, number, number][] = [
  [80, 40, 80],
  [90, 50, 95],
  [90, 70, 105],
  [100, 40, 109],
  [110, 40, 136],
];

test("heat index matches NOAA/NWS table values (±1 °F)", () => {
  for (const [t, rh, expected] of NOAA) {
    const got = heatIndexF(t, rh);
    assert.ok(Math.abs(got - expected) <= 1, `${t}°F ${rh}% → ${got.toFixed(1)}, expected ${expected}`);
  }
});

test("mild conditions use the simple formula and stay close to air temperature", () => {
  const got = heatIndexF(70, 40);
  assert.ok(Math.abs(got - 70) < 3, `got ${got}`);
});

test("low-humidity adjustment lowers the value, high-humidity adjustment raises it", () => {
  const base = (t: number, rh: number) =>
    -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t -
    0.05481717 * rh * rh + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
  assert.ok(heatIndexF(95, 10) < base(95, 10));
  assert.ok(heatIndexF(85, 95) > base(85, 95));
});

test("Celsius wrapper converts correctly", () => {
  assert.ok(Math.abs(fToC(cToF(31)) - 31) < 1e-9);
  // 32 °C, 70% RH is about 41 °C (Extreme Caution upper end)
  const hi = heatIndexC(32, 70);
  assert.ok(hi > 39 && hi < 43, `got ${hi}`);
});

test("PAGASA bands classify at the published boundaries", () => {
  assert.equal(bandFor(26.4).level, 0);
  assert.equal(bandFor(27).level, 1);
  assert.equal(bandFor(32.4).level, 1);
  assert.equal(bandFor(33).level, 2);
  assert.equal(bandFor(41.4).level, 2);
  assert.equal(bandFor(42).level, 3);
  assert.equal(bandFor(51.4).level, 3);
  assert.equal(bandFor(52).level, 4);
  assert.equal(bandFor(60).level, 4);
});

test("every band has advice for every persona in both languages", () => {
  for (const persona of Object.values(ADVICE)) {
    assert.equal(persona.length, BANDS.length);
    for (const pair of persona) {
      assert.ok(pair.en.length > 10 && pair.tl.length > 10);
    }
  }
});

test("parseForecast groups hours by day and skips null readings", () => {
  const days = parseForecast({
    hourly: {
      time: ["2026-10-30T23:00", "2026-10-31T00:00", "2026-10-31T01:00"],
      temperature_2m: [30, 29, null],
      relative_humidity_2m: [70, 75, 80],
      apparent_temperature: [36, 35, 34],
    },
  });
  assert.equal(days.length, 2);
  assert.equal(days[1].hours.length, 1);
  assert.equal(days[0].hours[0].hour, 23);
});

function hoursWith(his: Record<number, number>, fallback: number) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    const hi = his[h] ?? fallback;
    out.push({ time: `2026-10-30T${String(h).padStart(2, "0")}:00`, date: "2026-10-30", hour: h, temp: 30, rh: 70, apparent: null, hi, band: bandFor(hi) });
  }
  return out;
}

test("safe-window sentence names before/from windows (from is inclusive)", () => {
  const hours = hoursWith({}, 40);
  for (let h = 0; h < 24; h++) {
    if (h < 8 || h >= 17) {
      hours[h].hi = 30;
      hours[h].band = bandFor(30);
    }
  }
  const s =safeWindowSentence(hours, "today", "en");
  assert.equal(s, "Safest outdoor hours today: before 8 AM and from 5 PM.");
});

test("B1: safe hours use the rounded band, matching the strip colours", () => {
  // 32.6 rounds to 33 -> Extreme Caution, so it must not count as safe.
  const hours = hoursWith({}, 40);
  for (let h = 0; h < 8; h++) {
    hours[h].hi = 30;
    hours[h].band = bandFor(30);
  }
  for (const h of [18, 19, 20]) {
    hours[h].hi = 32.6;
    hours[h].band = bandFor(32.6);
  }
  assert.equal(isSafeHour(hours[19]), false);
  assert.equal(isSafeHour({ ...hours[19], hi: 32.4, band: bandFor(32.4) }), true);
  assert.equal(safeWindowSentence(hours, "today", "en"), "Safest outdoor hours today: before 8 AM.");
});

test("B2: the window covers late-night hours and the 'from' wording is inclusive", () => {
  // Taguig-like day: hot all day, 9-11 PM drop to 32 (Caution).
  const hours = hoursWith({ 21: 32, 22: 32, 23: 32 }, 40);
  assert.equal(safeWindowSentence(hours, "today", "en"), "Safest outdoor hours today: from 9 PM.");
  // 12-5 AM cool hours are inside the displayed day too.
  const early = hoursWith({ 0: 28, 1: 28, 2: 28 }, 40);
  assert.equal(safeWindowSentence(early, "today", "en"), "Safest outdoor hours today: before 3 AM.");
});

test("safe-window sentence says 'the rest of the day' when everything left is safe", () => {
  const hours = hoursWith({}, 30);
  assert.equal(safeWindowSentence(hours, "today", "en", 10), "Safest outdoor hours today: the rest of the day.");
  assert.equal(safeWindowSentence(hours, "today", "en"), "Safest outdoor hours today: all day.");
});

test("safe-window sentence falls back to the coolest hours when none is under 33 °C", () => {
  const hours = hoursWith({}, 40);
  hours[6].hi = 36;
  hours[6].band = bandFor(36);
  const s = safeWindowSentence(hours, "today", "en");
  assert.match(s, /No hour stays under 33/);
  assert.match(s, /Coolest: 6 AM;/);
});

test("later Danger hours produce a warning only when the chosen hour is below Danger", () => {
  const hours = hoursWith({ 13: 44, 14: 45 }, 34);
  const warn = laterDanger(hours, 9, 2);
  assert.deepEqual({ from: warn?.from, top: warn?.top, band: warn?.band.key }, { from: "1 PM", top: 45, band: "danger" });
  assert.equal(laterDanger(hours, 15, 2), null);
  assert.equal(laterDanger(hours, 13, 3), null);
});

test("B3: combobox keyboard navigation reaches the 4th option and Enter picks the active one", () => {
  let active = -1;
  for (let i = 0; i < 3; i++) active = moveActive(active, "ArrowDown", 8);
  assert.equal(active, 2);
  active = moveActive(active, "ArrowDown", 8);
  assert.equal(active, 3);
  assert.equal(enterIndex(active, 8), 3);
  assert.equal(enterIndex(-1, 8), 0);
  assert.equal(enterIndex(-1, 0), -1);
  assert.equal(moveActive(0, "ArrowUp", 8), 7);
  assert.equal(moveActive(7, "ArrowDown", 8), 0);
  assert.equal(moveActive(-1, "ArrowUp", 8), 7);
});

test("coolest fallback is one phrase with an inclusive end hour", () => {
  const hours = hoursWith({}, 40);
  for (const h of [5, 6, 7]) {
    hours[h].hi = 35;
    hours[h].band = bandFor(35);
  }
  assert.match(safeWindowSentence(hours, "today", "en"), /Coolest: 5 AM to 7 AM; take frequent breaks\.$/);
});

test("safe-window sentence skips hours already past", () => {
  const hours = hoursWith({}, 30);
  assert.match(safeWindowSentence(hours, "today", "en", 22), /the rest of the day/);
  assert.match(safeWindowSentence(hours, "today", "en", 24), /No hours left/);
});

test("a single last safe hour reads 'at', and a longer run reads 'from'", () => {
  const one = hoursWith({}, 40);
  one[23].hi = 30;
  one[23].band = bandFor(30);
  assert.equal(safeWindowSentence(one, "today", "en"), "Safest outdoor hours today: at 11 PM.");
  const two = hoursWith({}, 40);
  for (const i of [22, 23]) {
    two[i].hi = 30;
    two[i].band = bandFor(30);
  }
  assert.equal(safeWindowSentence(two, "today", "en"), "Safest outdoor hours today: from 10 PM.");
});

test("later-danger warning reports the peak band", () => {
  const hours = hoursWith({ 13: 44, 14: 53 }, 34);
  assert.equal(laterDanger(hours, 9, 2)?.band.key, "extreme-danger");
});

test("the Coolest line names at most three stretches", () => {
  const hours = hoursWith({}, 40);
  for (const i of [1, 4, 7, 10, 13]) {
    hours[i].hi = 35;
    hours[i].band = bandFor(35);
  }
  const s = safeWindowSentence(hours, "today", "en");
  assert.equal((s.match(/ AM| PM/g) ?? []).length, 3);
});
