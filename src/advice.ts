import type { Level } from "./bands";
import type { Lang } from "./i18n";

export type Persona = "kids" | "elders" | "pregnant" | "workers";
export const PERSONAS: readonly Persona[] = ["kids", "elders", "pregnant", "workers"];

type Pair = { en: string; tl: string };

/**
 * General-health advice per persona and heat-index level (0 = below Caution).
 * Wording follows public guidance from PAGASA, DOH and WHO; it is not medical advice.
 */
export const ADVICE: Record<Persona, readonly [Pair, Pair, Pair, Pair, Pair]> = {
  kids: [
    {
      en: "Normal play is fine. Bring water and let kids drink even if they are not thirsty.",
      tl: "Ayos ang normal na laro. Magdala ng tubig at painumin ang bata kahit hindi nauuhaw.",
    },
    {
      en: "Offer water every 20–30 minutes. Light, loose clothes and a hat. Take breaks in the shade.",
      tl: "Painumin ng tubig kada 20–30 minuto. Magaan at maluwag na damit at sombrero. Magpahinga sa lilim.",
    },
    {
      en: "Move active play and sports to cooler hours. Frequent water and shade breaks. Never leave a child in a parked vehicle. Watch for flushed skin, headache, dizziness or unusual sleepiness.",
      tl: "Ilipat ang laro at palakasan sa mas malamig na oras. Madalas na tubig at pahinga sa lilim. Huwag iiwan ang bata sa nakaparadang sasakyan. Bantayan kung namumula, sumasakit ang ulo, nahihilo o sobrang antok.",
    },
    {
      en: "Keep kids indoors in a cool, ventilated place. No sports or outdoor play. Give water often. Cool them with a damp cloth if they feel hot. Heat stroke signs (very hot skin, confusion, fainting, seizure): call 911 and cool them right away.",
      tl: "Manatili sa loob, sa malamig at may hangin na lugar. Walang palakasan o laro sa labas. Painumin nang madalas. Punasan ng basang tela kung mainit ang pakiramdam. Senyales ng heat stroke (napakainit na balat, pagkalito, pagkahimatay, kombulsyon): tumawag sa 911 at palamigin agad.",
    },
    {
      en: "Stay indoors in the coolest room. Do not go out. Give water in small sips and cool the child with a damp cloth. If the child is confused, faints or has a seizure, call 911 and move them somewhere cool right away.",
      tl: "Manatili sa loob, sa pinakamalamig na kuwarto. Huwag lumabas. Painumin ng tubig nang paunti-unti at punasan ng basang tela. Kung nalilito, nahihimatay o kinokombulsyon, tumawag sa 911 at ilipat agad sa malamig na lugar.",
    },
  ],
  elders: [
    {
      en: "Comfortable for most outings. Drink water regularly, and keep taking medicines as prescribed.",
      tl: "Komportable sa karamihan ng lakad. Uminom ng tubig nang regular at ituloy ang mga gamot ayon sa reseta.",
    },
    {
      en: "Drink water regularly, even if not thirsty. Walk in the shade and rest often. Older bodies adapt to heat more slowly.",
      tl: "Uminom ng tubig nang regular kahit hindi nauuhaw. Maglakad sa lilim at magpahinga madalas. Mas mabagal mag-adjust sa init ang katawan ng matatanda.",
    },
    {
      en: "Avoid errands and chores outdoors in the hottest hours. Stay in a cool, ventilated room and sip water often. Ask a doctor if your medicines or a heart, kidney or lung condition affect how much fluid you need. Watch for dizziness, cramps, heavy sweating or weakness.",
      tl: "Iwasan ang lakad at gawain sa labas sa pinakamainit na oras. Manatili sa malamig at may hangin na silid at uminom ng tubig nang madalas. Itanong sa doktor kung nakakaapekto ang gamot o sakit sa puso, bato o baga sa dami ng iinumin. Bantayan ang pagkahilo, pulikat, labis na pagpapawis o panghihina.",
    },
    {
      en: "Stay indoors. Use a fan, wet towel or cool shower. Have someone check on you several times today. Signs of heat stroke (hot dry or very sweaty skin, confusion, fainting): call 911.",
      tl: "Manatili sa loob. Gumamit ng bentilador, basang tuwalya o malamig na paligo. Magpatingin sa kapamilya o kapitbahay nang ilang beses ngayong araw. Senyales ng heat stroke (mainit na tuyo o sobrang pawis na balat, pagkalito, pagkahimatay): tumawag sa 911.",
    },
    {
      en: "Do not go out. Stay in the coolest place you have and keep someone with you or on the phone. Sip water. Any confusion, fainting, very hot skin or fast pulse: call 911 immediately.",
      tl: "Huwag lumabas. Manatili sa pinakamalamig na lugar at may kasama o kausap sa telepono. Uminom ng tubig nang paunti-unti. Kung may pagkalito, pagkahimatay, napakainit na balat o mabilis na pulso: tumawag agad sa 911.",
    },
  ],
  pregnant: [
    {
      en: "Normal activity is fine. Keep a water bottle with you.",
      tl: "Ayos ang normal na gawain. Magdala ng bote ng tubig.",
    },
    {
      en: "Drink water often, wear loose cotton clothes and rest in the shade when you feel warm.",
      tl: "Uminom ng tubig nang madalas, magsuot ng maluwag na cotton at magpahinga sa lilim kapag mainit ang pakiramdam.",
    },
    {
      en: "Limit time outdoors and avoid hard physical work in the hottest hours. Drink water regularly, rest in a cool place, and stop if you feel dizzy, have a headache or notice strong contractions.",
      tl: "Bawasan ang oras sa labas at iwasan ang mabigat na gawain sa pinakamainit na oras. Uminom ng tubig nang regular, magpahinga sa malamig na lugar, at huminto kung nahihilo, sumasakit ang ulo o may malakas na paghilab.",
    },
    {
      en: "Stay indoors where it is cool. Skip travel and errands if you can. Keep drinking water. Dizziness, fainting, a racing heart, vomiting or reduced baby movement: call your doctor or 911.",
      tl: "Manatili sa loob kung saan malamig. Huwag nang lumabas kung maaari. Magpatuloy sa pag-inom ng tubig. Pagkahilo, pagkahimatay, mabilis na tibok ng puso, pagsusuka o mas kaunting galaw ng sanggol: tumawag sa doktor o 911.",
    },
    {
      en: "Do not go out. Stay in the coolest room and cool yourself with a damp cloth and fan. If you feel faint, confused, or the baby moves less, call 911 or your doctor right away.",
      tl: "Huwag lumabas. Manatili sa pinakamalamig na kuwarto at magpalamig gamit ang basang tela at bentilador. Kung nahihilo, nalilito, o bumaba ang galaw ng sanggol, tumawag agad sa 911 o sa doktor.",
    },
  ],
  workers: [
    {
      en: "Normal work. Drink water through the shift, not just at breaks.",
      tl: "Normal na trabaho. Uminom ng tubig sa buong shift, hindi lang tuwing break.",
    },
    {
      en: "Drink about a cup of water every 20 minutes. Take short breaks in the shade. Wear a hat and light clothes.",
      tl: "Uminom ng mga isang tasang tubig kada 20 minuto. Magpahinga sandali sa lilim. Magsuot ng sombrero at magaan na damit.",
    },
    {
      en: "Schedule heavy work for early morning or late afternoon. Rest 10 minutes in the shade each hour. Drink water often. Work in pairs and watch each other for heavy sweating, cramps, headache, nausea or dizziness.",
      tl: "Ilagay ang mabigat na trabaho sa umaga o hapon. Magpahinga ng 10 minuto sa lilim kada oras. Uminom ng tubig madalas. Magtrabaho nang magkapares at bantayan ang isa't isa sa labis na pawis, pulikat, sakit ng ulo, pagduduwal o pagkahilo.",
    },
    {
      en: "Avoid heavy outdoor work in the hottest hours. Rest at least 15 minutes each hour in shade or a cool place. Drink water every 15–20 minutes. Stop at the first sign of illness. Heat stroke (confusion, fainting, hot skin, seizure): call 911, move the person to shade and cool them.",
      tl: "Iwasan ang mabigat na trabaho sa labas sa pinakamainit na oras. Magpahinga ng hindi bababa sa 15 minuto kada oras sa lilim o malamig na lugar. Uminom ng tubig kada 15–20 minuto. Huminto sa unang senyales ng sakit. Heat stroke (pagkalito, pagkahimatay, mainit na balat, kombulsyon): tumawag sa 911, ilipat sa lilim at palamigin.",
    },
    {
      en: "Stop outdoor work if you can, or limit it to short spells with long cool rests. Drink water often and keep a buddy with you. At any sign of heat stroke call 911, move the person to shade and cool them with water and a fan.",
      tl: "Ihinto ang trabaho sa labas kung maaari, o paiksiin at damihan ang pahinga sa malamig. Uminom ng tubig madalas at may kasama. Sa anumang senyales ng heat stroke, tumawag sa 911, ilipat sa lilim at palamigin ng tubig at bentilador.",
    },
  ],
};

export function adviceFor(persona: Persona, level: Level, lang: Lang): string {
  return ADVICE[persona][level][lang];
}

export const SOURCES = [
  {
    label: "PAGASA: Heat Index",
    url: "https://www.pagasa.dost.gov.ph/weather/heat-index",
  },
  {
    label: "DOH: Department of Health",
    url: "https://doh.gov.ph/",
  },
  {
    label: "WHO: Heat and health",
    url: "https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health",
  },
] as const;
