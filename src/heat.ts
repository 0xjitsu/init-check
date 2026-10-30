/**
 * Heat index per the NOAA / National Weather Service method (Rothfusz
 * regression with its published adjustments). PAGASA's heat index uses the
 * same method. Inputs are air temperature (°C) and relative humidity (%);
 * the result is in °C. It is a shade-based value: direct sun adds more.
 */

export const cToF = (c: number): number => (c * 9) / 5 + 32;
export const fToC = (f: number): number => ((f - 32) * 5) / 9;

/** Heat index in °F from temperature in °F and RH in %. */
export function heatIndexF(tF: number, rh: number): number {
  // Steadman-style simple formula, used when conditions are mild.
  const simple = 0.5 * (tF + 61.0 + (tF - 68.0) * 1.2 + rh * 0.094);
  if ((simple + tF) / 2 < 80) return simple;

  let hi =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh;

  if (rh < 13 && tF >= 80 && tF <= 112) {
    hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tF - 95)) / 17);
  } else if (rh > 85 && tF >= 80 && tF <= 87) {
    hi += ((rh - 85) / 10) * ((87 - tF) / 5);
  }
  return hi;
}

/** Heat index in °C from temperature in °C and RH in %. */
export function heatIndexC(tC: number, rh: number): number {
  return fToC(heatIndexF(cToF(tC), Math.min(100, Math.max(0, rh))));
}
