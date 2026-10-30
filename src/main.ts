import "./style.css";
import { PERSONAS, SOURCES, adviceFor } from "./advice";
import { BANDS } from "./bands";
import { DEFAULT_PLACE, DONATE_URL } from "./config";
import { fetchForecast, manilaNow, type Day, type HourPoint } from "./forecast";
import { UI, WEEKDAYS, type Lang } from "./i18n";
import { enterIndex, moveActive } from "./combobox";
import { formatHour, laterDanger, peakHour, safeWindowSentence } from "./summary";

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
/** Set when the strip should centre on the selected hour after the next render. */
let scrollToSelected = false;
/** Sentence for the live region; empty when no results are shown. */
let currentSentence = "";

/** Persistent screen-reader live region: announces only the safe-window sentence. */
const live = document.createElement("p");
live.className = "sr";
live.setAttribute("aria-live", "polite");
live.setAttribute("aria-atomic", "true");
document.body.appendChild(live);

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
    scrollToSelected = true;
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
          role="combobox" aria-expanded="false" aria-controls="results" aria-autocomplete="list" aria-haspopup="listbox" />
        <button type="button" id="loc">${esc(t.useLocation)}</button>
      </div>
      <ul id="results" role="listbox" aria-label="${esc(t.searchLabel)}" hidden></ul>
      <p class="note" id="note" role="status">${esc(state.note)}</p>
    </div>`;
}

function renderStrip(day: Day, selected: number): string {
  const lang = state.lang;
  const now = day.date === manilaNow().date ? manilaNow().hour : -1;
  const cells = day.hours
    .map((h, i) => {
      const isNow = h.hour === now;
      const label = `${formatHour(h.hour)}: ${Math.round(h.hi)} °C, ${bandName(h, lang)}${isNow ? `, ${UI[lang].nowSr}` : ""}`;
      return `<button type="button" class="cell${i === selected ? " sel" : ""}${isNow ? " now" : ""}"
        data-i="${i}" style="--bg:${h.band.color};--fg:${h.band.text}" aria-label="${esc(label)}" aria-pressed="${i === selected}">
        <span class="v">${Math.round(h.hi)}</span><span class="h">${h.hour % 3 === 0 || i === selected ? formatHour(h.hour) : ""}</span>${
          isNow ? `<span class="nt" aria-hidden="true">${esc(UI[lang].nowTag)}</span>` : ""
        }
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
  const sentence = safeWindowSentence(day.hours, label, lang, fromHour);
  currentSentence = `${place.name}: ${sentence}`;
  const danger = laterDanger(day.hours, hour.hour, hour.band.level);

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
    <section class="result">
      <h2>${esc(place.name)}${place.region ? `<span class="region">${esc(place.region)}</span>` : ""}</h2>
      <div class="tabs" role="tablist">${tabs}</div>
      <p class="safe">${esc(sentence)}</p>
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
      ${danger ? `<p class="warn" role="note">${esc(t.laterDanger(danger.from, danger.top, danger.band.name.en))}</p>` : ""}
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
  const active = document.activeElement as HTMLElement | null;
  const hadFocus = active?.id === "q";
  const q = (document.getElementById("q") as HTMLInputElement | null)?.value;
  // Remember which button had focus so a re-render does not drop it.
  const focusSel = active?.classList.contains("cell")
    ? `.cell[data-i="${active.dataset.i}"]`
    : active?.classList.contains("tab")
      ? `.tab[data-day="${active.dataset.day}"]`
      : active?.id && active.id !== "q"
        ? `#${active.id}`
        : "";
  currentSentence = "";
  app.innerHTML = `<main>${renderHeader()}<div id="out">${renderStatus()}</div>${renderLegend()}</main>${renderFooter()}`;
  document.documentElement.lang = state.lang === "tl" ? "fil" : "en";
  const input = document.getElementById("q") as HTMLInputElement;
  if (hadFocus && q !== undefined) {
    input.value = q;
    input.focus();
  } else if (focusSel) {
    app.querySelector<HTMLElement>(focusSel)?.focus({ preventScroll: true });
  }
  if (scrollToSelected) {
    scrollToSelected = false;
    const strip = app.querySelector<HTMLElement>(".strip");
    const cell = strip?.querySelector<HTMLElement>(".cell.sel");
    if (strip && cell) strip.scrollLeft = cell.offsetLeft - (strip.clientWidth - cell.offsetWidth) / 2;
  }
  if (live.textContent !== currentSentence) live.textContent = currentSentence;
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
  const note = document.getElementById("note") as HTMLElement;
  let matches: Place[] = [];
  let active = -1;

  const setActive = (i: number) => {
    active = i;
    list.querySelectorAll<HTMLElement>("[role=option]").forEach((li, n) => {
      li.setAttribute("aria-selected", String(n === i));
      li.classList.toggle("active", n === i);
    });
    if (i >= 0) {
      input.setAttribute("aria-activedescendant", `opt-${i}`);
      document.getElementById(`opt-${i}`)?.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setActive(-1);
  };
  const open = () => {
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(matches.length > 0));
  };
  const pick = (i: number) => {
    const p = matches[i];
    if (!p) return;
    input.value = p.name;
    close();
    void selectPlace(p);
  };

  input.addEventListener("focus", () => input.select());
  input.addEventListener("input", () => {
    matches = search(input.value);
    list.innerHTML = matches
      .map((p, i) => `<li role="option" id="opt-${i}" aria-selected="false" data-i="${i}">${esc(p.name)}<span>${esc(p.region)}</span></li>`)
      .join("");
    setActive(-1);
    open();
    note.textContent = input.value.trim() && matches.length === 0 ? UI[state.lang].noMatches : state.note;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (matches.length === 0) return;
      e.preventDefault();
      if (list.hidden) open();
      setActive(moveActive(active, e.key, matches.length));
    } else if (e.key === "Enter") {
      const i = enterIndex(active, list.hidden ? 0 : matches.length);
      if (i >= 0) {
        e.preventDefault();
        pick(i);
      }
    } else if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      close();
    }
  });
  input.addEventListener("blur", () => close());
  // Keep focus in the input while clicking an option.
  list.addEventListener("mousedown", (e) => e.preventDefault());
  list.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest("li");
    if (li) pick(Number(li.dataset.i));
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
      scrollToSelected = true;
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
