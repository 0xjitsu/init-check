import assert from "node:assert/strict";
import { test } from "node:test";
import { BANDS, bandFor } from "../src/bands";
import { parseForecast } from "../src/forecast";
import { cToF, fToC, heatIndexC, heatIndexF } from "../src/heat";
import { safeWindowSentence } from "../src/summary";
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

test("safe-window sentence names before/after windows", () => {
  const hours = hoursWith({}, 40);
  for (let h = 0; h < 24; h++) if (h < 8 || h >= 17) hours[h].hi = 30;
  const s = safeWindowSentence(hours, "today", "en");
  assert.equal(s, "Safest outdoor hours today: before 8 AM and after 5 PM.");
});

test("safe-window sentence falls back to the coolest hours when none is under 33 °C", () => {
  const hours = hoursWith({}, 40);
  hours[6].hi = 36;
  const s = safeWindowSentence(hours, "today", "en");
  assert.match(s, /No hour stays under 33/);
  assert.match(s, /6 AM/);
});

test("safe-window sentence skips hours already past", () => {
  const hours = hoursWith({}, 30);
  assert.match(safeWindowSentence(hours, "today", "en", 22), /No outdoor hours left/);
});
