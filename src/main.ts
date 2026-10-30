import "./style.css";
import { PERSONAS, SOURCES, adviceFor } from "./advice";
import { BANDS } from "./bands";
import { DEFAULT_PLACE, DONATE_URL } from "./config";
import { fetchForecast, manilaNow, type Day, type HourPoint } from "./forecast";
import { UI, WEEKDAYS, type Lang } from "./i18n";
import { formatHour, peakHour, safeWindowSentence } from "./summary";

type Place = { name: string; lat: number; lon: number; region: string };

interface State {
  lang: Lang;
  place: Place | null;
  days: Day[];
  dayIndex: number;
  hourIndex: number;
  status: "idle" | "loading" | "error" | "ready";
  note: string;
}

const state: State = { lang: "en", place: null, days: [], dayIndex: 0, hourIndex: 0, status: "idle", note: "" };
let places: Place[] = [];
let controller: AbortController | null = null;
const app = document.getElementById("app") as HTMLElement;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem("init-check-lang");
    if (saved === "en" || saved === "tl") return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("fil") || navigator.language?.toLowerCase().startsWith("tl")
    ? "tl"
    : "en";
}

async function loadPlaces(): Promise<void> {
  const res = await fetch("/data/places.json");
  const rows = (await res.json()) as [string, number, number, string][];
  places = rows.map(([name, lat, lon, region]) => ({ name, lat, lon, region }));
}

function dayLabel(day: Day, index: number, lang: Lang): string {
  const t = UI[lang];
  if (index === 0) return t.today;
  if (index === 1) return t.tomorrow;
  const d = new Date(`${day.date}T12:00:00Z`);
  return `${WEEKDAYS[lang][d.getUTCDay()]} ${d.getUTCDate()}`;
}

function bandName(h: HourPoint, lang: Lang): string {
  return h.band.name[lang];
}

/** Pick the hour to show by default: the current hour today, otherwise the peak. */
function defaultHour(day: Day, isToday: boolean): number {
  if (isToday) {
    const now = manilaNow().hour;
    const idx = day.hours.findIndex((h) => h.hour === now);
    if (idx >= 0) return idx;
  }
  const peak = peakHour(day.hours);
  return peak ? day.hours.indexOf(peak) : 0;
}

async function selectPlace(place: Place): Promise<void> {
  state.place = place;
  state.status = "loading";
  state.note = "";
  render();
  controller?.abort();
  controller = new AbortController();
  try {
    const days = await fetchForecast(place.lat, place.lon, controller.signal);
    const today = manilaNow().date;
    const first = Math.max(0, days.findIndex((d) => d.date === today));
    state.days = days.slice(first);
    state.dayIndex = 0;
    state.hourIndex = defaultHour(state.days[0], true);
    state.status = "ready";
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    state.status = "error";
  }
  render();
}

function useMyLocation(): void {
  const t = UI[state.lang];
  if (!navigator.geolocation) {
    state.note = t.locationDenied;
    render();
    return;
  }
  state.note = t.locating;
  render();
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.note = "";
      void selectPlace({ name: t.yourLocation, lat: pos.coords.latitude, lon: pos.coords.longitude, region: "" });
    },
    () => {
      state.note = t.locationDenied;
      render();
    },
    { timeout: 10000, maximumAge: 600000 },
  );
}

function renderHeader(): string {
  const t = UI[state.lang];
  return `
    <header class="top">
      <div>
        <h1>Init Check <span class="sub">heat-safe hours</span></h1>
        <p class="tagline">${esc(t.tagline)}</p>
      </div>
      <button type="button" class="lang" id="lang" aria-label="${esc(t.langLabel)}">${esc(t.lang)}</button>
    </header>
    <p class="intro">${esc(t.intro)}</p>
    <div class="search">
      <label for="q">${esc(t.searchLabel)}</label>
      <div class="row">
        <input id="q" type="search" autocomplete="off" inputmode="search" placeholder="${esc(t.searchPlaceholder)}"
          value="${esc(state.place && state.place.region ? state.place.name : "")}"
          role="combobox" aria-expanded="false" aria-controls="results" />
        <button type="button" id="loc">${esc(t.useLocation)}</button>
      </div>
      <ul id="results" role="listbox" hidden></ul>
      <p class="note" id="note" role="status">${esc(state.note)}</p>
    </div>`;
}

function renderStrip(day: Day, selected: number): string {
  const lang = state.lang;
  const now = day.date === manilaNow().date ? manilaNow().hour : -1;
  const cells = day.hours
    .map((h, i) => {
      const label = `${formatHour(h.hour)}: ${Math.round(h.hi)} °C, ${bandName(h, lang)}`;
      return `<button type="button" class="cell${i === selected ? " sel" : ""}${h.hour === now ? " now" : ""}"
        data-i="${i}" style="--bg:${h.band.color};--fg:${h.band.text}" aria-label="${esc(label)}" aria-pressed="${i === selected}">
        <span class="v">${Math.round(h.hi)}</span><span class="h">${h.hour % 3 === 0 || i === selected ? formatHour(h.hour) : ""}</span>
      </button>`;
    })
    .join("");
  return `<div class="strip" role="group" aria-label="${esc(UI[lang].hour)}">${cells}</div>`;
}

function renderResults(): string {
  const t = UI[state.lang];
  const lang = state.lang;
  const day = state.days[state.dayIndex];
  const hour = day.hours[state.hourIndex] ?? day.hours[0];
  const isToday = state.dayIndex === 0;
  const label = isToday ? t.todayLabel : state.dayIndex === 1 ? t.tomorrowLabel : dayLabel(day, state.dayIndex, lang);
  const fromHour = isToday ? manilaNow().hour : 0;
  const peak = peakHour(day.hours);
  const place = state.place as Place;

  const tabs = state.days
    .map(
      (d, i) =>
        `<button type="button" role="tab" class="tab" data-day="${i}" aria-selected="${i === state.dayIndex}">${esc(dayLabel(d, i, lang))}</button>`,
    )
    .join("");

  const advice = PERSONAS.map(
    (p) => `
      <article class="card" style="--bc:${hour.band.color}">
        <h3>${esc(t.personas[p])}</h3>
        <p>${esc(adviceFor(p, hour.band.level, lang))}</p>
      </article>`,
  ).join("");

  return `
    <section class="result" aria-live="polite">
      <h2>${esc(place.name)}${place.region ? `<span class="region">${esc(place.region)}</span>` : ""}</h2>
      <div class="tabs" role="tablist">${tabs}</div>
      <p class="safe">${esc(safeWindowSentence(day.hours, label, lang, fromHour))}</p>
      ${peak ? `<p class="peak">${esc(t.peakLine(formatHour(peak.hour), Math.round(peak.hi), bandName(peak, lang)))}</p>` : ""}
      ${renderStrip(day, state.hourIndex)}
      <div class="detail" style="--bc:${hour.band.color}">
        <strong>${esc(t.selected)}: ${esc(formatHour(hour.hour))}</strong>
        <span class="chip" style="background:${hour.band.color};color:${hour.band.text}">${Math.round(hour.hi)} °C · ${esc(bandName(hour, lang))}</span>
        <dl>
          <div><dt>${esc(t.temp)}</dt><dd>${hour.temp.toFixed(1)} °C</dd></div>
          <div><dt>${esc(t.humidity)}</dt><dd>${Math.round(hour.rh)}%</dd></div>
          <div><dt>${esc(t.heatIndex)}</dt><dd>${hour.hi.toFixed(1)} °C</dd></div>
          ${hour.apparent != null ? `<div><dt>${esc(t.apparent)}</dt><dd>${hour.apparent.toFixed(1)} °C</dd></div>` : ""}
        </dl>
        <p class="effect">${esc(hour.band.effect[lang])}</p>
      </div>
      <h2 class="adv">${esc(t.adviceTitle)}</h2>
      <p class="advfor">${esc(t.adviceFor(formatHour(hour.hour), bandName(hour, lang)))}</p>
      <div class="cards">${advice}</div>
      <p class="note">${esc(t.forecastNote)}</p>
    </section>`;
}

function renderStatus(): string {
  const t = UI[state.lang];
  if (state.status === "loading") return `<p class="loading" role="status">${esc(t.loading)}</p>`;
  if (state.status === "error")
    return `<div class="error" role="alert"><strong>${esc(t.errorTitle)}</strong><p>${esc(t.errorBody)}</p>
      <button type="button" id="retry">${esc(t.retry)}</button></div>`;
  if (state.status === "ready" && state.place) return renderResults();
  return "";
}

function renderLegend(): string {
  const t = UI[state.lang];
  const items = BANDS.map(
    (b) =>
      `<li><span class="sw" style="background:${b.color}"></span><span><strong>${esc(b.name[state.lang])}</strong> ${esc(b.range)}</span></li>`,
  ).join("");
  return `<section class="legend"><h2>${esc(t.legendTitle)}</h2><ul>${items}</ul><p class="note">${esc(t.legendNote)}</p></section>`;
}

function renderFooter(): string {
  const t = UI[state.lang];
  const sources = SOURCES.map((s) => `<a href="${s.url}" rel="noopener" target="_blank">${esc(s.label)}</a>`).join(" · ");
  return `
    <footer>
      <p class="disclaimer">${esc(t.disclaimer)}</p>
      <p>${esc(t.sources)}: ${sources}</p>
      <p>${esc(t.footerData)} <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo.com</a> (CC BY 4.0) ·
        ${esc(t.footerBands)} <a href="https://www.pagasa.dost.gov.ph/" rel="noopener" target="_blank">PAGASA</a> ·
        ${esc(t.footerPlaces)} <a href="https://www.geonames.org/" rel="noopener" target="_blank">GeoNames</a> (CC BY 4.0)</p>
      <p>${esc(t.license)} · <a href="https://github.com/0xjitsu/init-check" rel="noopener" target="_blank">GitHub</a>${
        DONATE_URL
          ? ` · <a href="${esc(DONATE_URL)}" rel="noopener" target="_blank">${esc(t.donate)}</a>`
          : ""
      }</p>
    </footer>`;
}

function render(): void {
  const hadFocus = document.activeElement?.id === "q";
  const q = (document.getElementById("q") as HTMLInputElement | null)?.value;
  app.innerHTML = `${renderHeader()}<div id="out">${renderStatus()}</div>${renderLegend()}${renderFooter()}`;
  document.documentElement.lang = state.lang === "tl" ? "fil" : "en";
  const input = document.getElementById("q") as HTMLInputElement;
  if (hadFocus && q !== undefined) {
    input.value = q;
    input.focus();
  }
  bind();
}

function search(term: string): Place[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (const p of places) {
    const n = p.name.toLowerCase();
    if (n.startsWith(t)) starts.push(p);
    else if (n.includes(t) || p.region.toLowerCase().includes(t)) contains.push(p);
  }
  return [...starts, ...contains].slice(0, 8);
}

function bind(): void {
  const input = document.getElementById("q") as HTMLInputElement;
  const list = document.getElementById("results") as HTMLUListElement;
  let matches: Place[] = [];

  input.addEventListener("input", () => {
    matches = search(input.value);
    list.innerHTML = matches
      .map((p, i) => `<li role="option" data-i="${i}">${esc(p.name)}<span>${esc(p.region)}</span></li>`)
      .join("");
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(matches.length > 0));
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && matches[0]) {
      e.preventDefault();
      void selectPlace(matches[0]);
    }
  });
  list.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li");
    if (li) void selectPlace(matches[Number(li.dataset.i)]);
  });

  document.getElementById("loc")?.addEventListener("click", useMyLocation);
  document.getElementById("retry")?.addEventListener("click", () => state.place && void selectPlace(state.place));
  document.getElementById("lang")?.addEventListener("click", () => {
    state.lang = state.lang === "en" ? "tl" : "en";
    try {
      localStorage.setItem("init-check-lang", state.lang);
    } catch {
      /* ignore */
    }
    render();
  });
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) =>
    b.addEventListener("click", () => {
      state.dayIndex = Number(b.dataset.day);
      state.hourIndex = defaultHour(state.days[state.dayIndex], state.dayIndex === 0);
      render();
    }),
  );
  document.querySelectorAll<HTMLButtonElement>(".cell").forEach((b) =>
    b.addEventListener("click", () => {
      state.hourIndex = Number(b.dataset.i);
      render();
    }),
  );
}

async function init(): Promise<void> {
  state.lang = loadLang();
  render();
  try {
    await loadPlaces();
  } catch {
    state.note = "Place list failed to load. Use my location instead.";
  }
  const start = places.find((p) => p.name === DEFAULT_PLACE) ?? { name: DEFAULT_PLACE, lat: 14.5243, lon: 121.0792, region: "Metro Manila" };
  void selectPlace(start);
}

void init();
