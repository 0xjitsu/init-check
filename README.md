# Init Check: heat-safe hours

A free, public-good tool. Pick any Philippine city or municipality and see the hourly heat index for today and the next few days, colored by PAGASA's heat-index bands, with plain advice for kids, elders, pregnant women and outdoor workers. For parents, barangay health workers and outdoor workers who need to know which hours are safe to be outside. *Init* is Tagalog for heat.

Live: https://init-check.vercel.app

## What it does

- Search about 1,200 Philippine cities and municipalities (default: Taguig) or use your location.
- Hourly heat index for today and the next three days, colored by band, with a one-sentence safe-window summary (for example "Safest outdoor hours today: before 8 AM and after 5 PM") and the peak hour.
- Tap an hour for temperature, humidity, heat index and Open-Meteo's feels-like value.
- Advice for kids, elders, pregnant women and outdoor workers that changes with the band of the selected hour.
- English and Tagalog toggle. Works on mobile. No keys, no accounts, no tracking.
- Clear error state when Open-Meteo is unreachable.

## Method

1. Forecast: hourly `temperature_2m`, `relative_humidity_2m` and `apparent_temperature` from the [Open-Meteo forecast API](https://open-meteo.com/en/docs), called from the browser with `timezone=Asia/Manila`. No key needed.
2. Heat index: computed in the browser from temperature and relative humidity with the NOAA / National Weather Service method ([Rothfusz regression](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml)), the same method PAGASA uses. In °F (T = temperature, RH = % humidity):

   ```
   Simple:  HI = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094)
   If the average of that and T is below 80 °F, use it. Otherwise:
   HI = -42.379 + 2.04901523 T + 10.14333127 RH - 0.22475541 T RH
        - 0.00683783 T² - 0.05481717 RH² + 0.00122874 T² RH
        + 0.00085282 T RH² - 0.00000199 T² RH²
   Adjustments:
     RH < 13 % and 80 ≤ T ≤ 112 °F:  subtract ((13 - RH)/4) * sqrt((17 - |T - 95|)/17)
     RH > 85 % and 80 ≤ T ≤ 87 °F:   add ((RH - 85)/10) * ((87 - T)/5)
   ```

   The result is converted back to °C and rounded to whole degrees to pick a band. See `src/heat.ts`; unit tests in `tests/heat.test.ts` check it against NWS table values.
3. Safe window: within waking hours (5 AM to 9 PM), an hour counts as safer when its heat index is below 33 °C (under PAGASA's Extreme Caution). Hours already past are skipped for today. If no hour qualifies, the page names the coolest hours instead.

## PAGASA heat-index bands

Source: [PAGASA heat index classification](https://www.pagasa.dost.gov.ph/weather/heat-index).

| Band | Heat index | PAGASA description |
| --- | --- | --- |
| Caution | 27–32 °C | Fatigue possible with prolonged exposure and activity; heat cramps possible |
| Extreme Caution | 33–41 °C | Heat cramps and heat exhaustion possible; heat stroke possible with prolonged exposure |
| Danger | 42–51 °C | Heat cramps and heat exhaustion likely; heat stroke probable with continued activity |
| Extreme Danger | 52 °C and above | Heat stroke imminent |

Below 27 °C the page shows a green "Below Caution" level. That is our own label, not a PAGASA class.

## Advice and sources

Advice is general health wording drawn from public guidance: [PAGASA](https://www.pagasa.dost.gov.ph/), the [Department of Health](https://doh.gov.ph/) and the [WHO heat and health fact sheet](https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health). It is not medical advice. In an emergency call 911.

## Data sources and credits

- Weather: [Open-Meteo.com](https://open-meteo.com/) (data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Weather data by Open-Meteo.com.
- Bands: PAGASA.
- Places: [GeoNames](https://www.geonames.org/) Philippines dump (CC BY 4.0), reduced to administrative seats (cities and municipalities) with coordinates in `public/data/places.json` by `scripts/build-places.py`. A few Metro Manila cities missing from that class are added by hand.

## Limitations

- Forecasts are uncertain, more so for later days and for local showers or cloud. Check again during the day.
- Open-Meteo gives grid-cell values (a few kilometers wide). Your street, a rooftop or a paved yard can be hotter than the forecast.
- The heat index is a shade-based value for a healthy adult at rest in light wind. Direct sun can add up to about 8 °C. Hard work, heavy clothing, and being a child, elderly, pregnant or on certain medicines raise the risk at lower values.
- Place coordinates are the city or municipality center, not your barangay.
- General information only; not medical advice.

## Development

```
npm install
npm run dev       # local dev server
npm run lint      # type-check
npm test          # unit tests (heat index, bands, summary, advice)
npm run build     # builds to dist/
npm run smoke     # unit tests + checks built index.html tags and the preview video
scripts/check-live.sh https://init-check.vercel.app   # verify tags and video on a deployed URL
```

Stack: Vite + TypeScript, no runtime dependencies. Deployed on Vercel (`vercel.json`: `npm run build`, output `dist/`).

### Link preview video

`public/og/preview.mp4` (1200×630, H.264, about 7.5 s, well under 5 MB) shows an hourly heat strip filling in band by band. `public/og/preview.png` is the 1200×630 fallback and `public/og/player.html` is the Twitter/X player page. Regenerate all three with `python3 -I scripts/make-preview.py` (needs ffmpeg). `index.html` carries absolute `https://init-check.vercel.app` URLs for `og:video*` and `twitter:player*`.

## Support

Free to use. If it helps you, consider a donation: [Sponsor 0xjitsu](https://github.com/sponsors/0xjitsu) <!-- TODO: placeholder until the account is chosen. Set DONATE_URL in src/config.ts to "" to hide it on the site. -->

## License

MIT. See [LICENSE](LICENSE).
