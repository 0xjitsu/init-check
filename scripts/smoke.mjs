// Smoke checks run by `npm run smoke` (and CI): unit tests, built HTML tags, preview video.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const BASE = "https://init-check.vercel.app";
const MAX_BYTES = 5 * 1024 * 1024;
const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
};

// 1. Heat-index / bands / advice unit tests.
try {
  execSync("npx tsc -p tsconfig.test.json && node --test .test-build/tests/", { stdio: "inherit" });
  check(true, "unit tests pass");
} catch {
  check(false, "unit tests pass");
}

// 2. Built index.html has the preview tags.
check(existsSync("dist/index.html"), "dist/index.html exists");
const html = existsSync("dist/index.html") ? readFileSync("dist/index.html", "utf8") : "";
const metaContent = (attr, name) => {
  const re = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`, "i");
  return html.match(re)?.[1];
};
const expected = [
  ["property", "og:title", (v) => v.length > 0],
  ["property", "og:description", (v) => v.length > 0],
  ["property", "og:image", (v) => v === `${BASE}/og/preview.png`],
  ["property", "og:video", (v) => v === `${BASE}/og/preview.mp4`],
  ["property", "og:video:secure_url", (v) => v === `${BASE}/og/preview.mp4`],
  ["property", "og:video:type", (v) => v === "video/mp4"],
  ["property", "og:video:width", (v) => /^\d+$/.test(v)],
  ["property", "og:video:height", (v) => /^\d+$/.test(v)],
  ["name", "twitter:card", (v) => v === "player"],
  ["name", "twitter:player", (v) => v.startsWith("https://") && v.endsWith("/og/player.html")],
  ["name", "twitter:player:width", (v) => /^\d+$/.test(v)],
  ["name", "twitter:player:height", (v) => /^\d+$/.test(v)],
];
for (const [attr, name, ok] of expected) {
  const v = metaContent(attr, name);
  check(v !== undefined && ok(v), `index.html has ${name}${v ? ` = ${v}` : ""}`);
}

// 3. Preview assets exist in dist and are valid.
for (const f of ["dist/og/player.html", "dist/og/preview.png", "dist/data/places.json"]) {
  check(existsSync(f), `${f} exists`);
}
const mp4 = "dist/og/preview.mp4";
if (existsSync(mp4)) {
  const size = statSync(mp4).size;
  check(size > 0 && size < MAX_BYTES, `${mp4} is under 5 MB (${(size / 1048576).toFixed(2)} MB)`);
  const buf = readFileSync(mp4);
  check(buf.subarray(4, 8).toString("latin1") === "ftyp", "preview.mp4 is an MP4 container (ftyp)");
  check(buf.includes(Buffer.from("avc1")), "preview.mp4 is H.264 (avc1)");
  const png = readFileSync("dist/og/preview.png");
  check(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, "preview.png is 1200x630");
} else {
  check(false, `${mp4} exists`);
}

// 4. Place list sanity.
if (existsSync("dist/data/places.json")) {
  const places = JSON.parse(readFileSync("dist/data/places.json", "utf8"));
  check(places.length > 1000, `places.json has ${places.length} places`);
  check(places.some((p) => p[0] === "Taguig"), "places.json includes the default city (Taguig)");
}

if (failures.length) {
  console.error(`\n${failures.length} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nsmoke: all checks passed");
