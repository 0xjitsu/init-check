/**
 * PAGASA heat-index classification (°C):
 *   Caution 27–32, Extreme Caution 33–41, Danger 42–51, Extreme Danger ≥ 52.
 * Level 0 is "below Caution" (not a PAGASA class, shown in green).
 */

export type Level = 0 | 1 | 2 | 3 | 4;

export interface Band {
  level: Level;
  key: "low" | "caution" | "extreme-caution" | "danger" | "extreme-danger";
  name: { en: string; tl: string };
  range: string;
  /** Background colour and a text colour with enough contrast on it. */
  color: string;
  text: string;
  /** PAGASA's published description of the possible heat disorders. */
  effect: { en: string; tl: string };
}

export const BANDS: readonly Band[] = [
  {
    level: 0,
    key: "low",
    name: { en: "Below Caution", tl: "Mababa sa Caution" },
    range: "< 27 °C",
    color: "#bfe3c8",
    text: "#10331c",
    effect: {
      en: "Below PAGASA's lowest class. Still drink water if you are active.",
      tl: "Mas mababa sa pinakamababang klase ng PAGASA. Uminom pa rin ng tubig kung aktibo.",
    },
  },
  {
    level: 1,
    key: "caution",
    name: { en: "Caution", tl: "Caution (Mag-ingat)" },
    range: "27–32 °C",
    color: "#fde047",
    text: "#3a2e00",
    effect: {
      en: "Fatigue is possible with prolonged exposure and activity. Continued activity could result in heat cramps.",
      tl: "Posibleng mapagod kapag matagal na nasa init at kumikilos. Maaaring magka-heat cramps.",
    },
  },
  {
    level: 2,
    key: "extreme-caution",
    name: { en: "Extreme Caution", tl: "Extreme Caution (Mag-ingat nang husto)" },
    range: "33–41 °C",
    color: "#fb923c",
    text: "#3b1800",
    effect: {
      en: "Heat cramps and heat exhaustion are possible. Heat stroke is possible with prolonged exposure and activity.",
      tl: "Posible ang heat cramps at heat exhaustion. Posible rin ang heat stroke kapag matagal sa init.",
    },
  },
  {
    level: 3,
    key: "danger",
    name: { en: "Danger", tl: "Danger (Mapanganib)" },
    range: "42–51 °C",
    color: "#dc2626",
    text: "#ffffff",
    effect: {
      en: "Heat cramps and heat exhaustion are likely. Heat stroke is probable with continued activity.",
      tl: "Malamang ang heat cramps at heat exhaustion. Malamang ang heat stroke kung magpapatuloy sa gawain.",
    },
  },
  {
    level: 4,
    key: "extreme-danger",
    name: { en: "Extreme Danger", tl: "Extreme Danger (Lubhang mapanganib)" },
    range: "≥ 52 °C",
    color: "#7f1d1d",
    text: "#ffffff",
    effect: {
      en: "Heat stroke is imminent.",
      tl: "Napipintong magka-heat stroke.",
    },
  },
];

/** Classify a heat index (°C). PAGASA reports whole degrees, so round first. */
export function bandFor(heatIndexC: number): Band {
  const hi = Math.round(heatIndexC);
  if (hi >= 52) return BANDS[4];
  if (hi >= 42) return BANDS[3];
  if (hi >= 33) return BANDS[2];
  if (hi >= 27) return BANDS[1];
  return BANDS[0];
}
