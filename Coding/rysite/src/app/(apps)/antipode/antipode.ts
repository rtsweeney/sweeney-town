// ── Antipode math, and the trivia that hangs off it ──────────────────────────
// Pure functions, no data loading and no DOM. The atlas lookups live in
// atlas.ts and the drawing in globe.ts.

export interface Point {
  lat: number;
  lon: number;
}

/** Volumetric mean radius, IAU/NASA fact sheet. */
export const EARTH_RADIUS_KM = 6371;
/** Straight through the middle — the whole point of the exercise. */
export const EARTH_DIAMETER_KM = EARTH_RADIUS_KM * 2;
/** Mean circumference, so half of it is the shortest way round the outside. */
export const HALF_CIRCUMFERENCE_KM = 20_015;

const DEG = Math.PI / 180;

/**
 * The point diametrically opposite: same distance from the centre, opposite
 * side. Flip the latitude, swing the longitude half a turn.
 */
export function antipodeOf({ lat, lon }: Point): Point {
  return { lat: -lat, lon: normalizeLon(lon + 180) };
}

/** Wrap any longitude into (-180, 180]. */
export function normalizeLon(lon: number): number {
  let value = ((lon + 180) % 360 + 360) % 360 - 180;
  if (value === -180) value = 180;
  return value;
}

/** Great-circle distance in km — over the surface, not through the rock. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, in degrees clockwise from north. */
export function bearingDeg(a: Point, b: Point): number {
  const dLon = (b.lon - a.lon) * DEG;
  const y = Math.sin(dLon) * Math.cos(b.lat * DEG);
  const x =
    Math.cos(a.lat * DEG) * Math.sin(b.lat * DEG) -
    Math.sin(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.cos(dLon);
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

export function compassWord(bearing: number): string {
  return COMPASS[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

/**
 * Drop a ball down a frictionless hole through the centre and it arrives on the
 * far side in half the period of a pendulum the size of the planet — π√(R/g),
 * about 42 minutes, famously independent of where you dug. That figure assumes
 * uniform density; Earth's core is much denser than its crust, which pulls the
 * real answer down to roughly 38 minutes.
 */
export const GRAVITY_TRAIN_MINUTES = (Math.PI * Math.sqrt(EARTH_RADIUS_KM * 1000 / 9.80665)) / 60;
export const GRAVITY_TRAIN_MINUTES_REALISTIC = 38.2;
/** Speed at the centre, ωR, for the same uniform-density ball. */
export const GRAVITY_TRAIN_TOP_SPEED_KMH =
  Math.sqrt(9.80665 * EARTH_RADIUS_KM * 1000) * 3.6;

/**
 * Where the Sun is directly overhead right now, which is the centre of the lit
 * half of the globe. NOAA's low-precision solar position: good to about a
 * tenth of a degree, far past what a shaded terminator needs.
 */
export function subsolarPoint(date: Date): Point {
  const julianDays = date.getTime() / 86_400_000 + 2440587.5;
  const n = julianDays - 2451545.0;
  const meanLongitude = (280.46 + 0.9856474 * n) * DEG;
  const meanAnomaly = (357.528 + 0.9856003 * n) * DEG;
  const eclipticLongitude =
    meanLongitude + (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEG;
  const obliquity = (23.439 - 0.0000004 * n) * DEG;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) / DEG;

  // Equation of time, in minutes, from the same two angles.
  const y = Math.tan(obliquity / 2) ** 2;
  const eqTime =
    4 *
    (y * Math.sin(2 * meanLongitude) -
      2 * 0.0167 * Math.sin(meanAnomaly) +
      4 * 0.0167 * y * Math.sin(meanAnomaly) * Math.cos(2 * meanLongitude) -
      0.5 * y * y * Math.sin(4 * meanLongitude) -
      1.25 * 0.0167 * 0.0167 * Math.sin(2 * meanAnomaly)) /
    DEG;

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const longitude = normalizeLon(-(utcMinutes + eqTime - 720) / 4);

  return { lat: declination, lon: longitude };
}

/** 🇦🇷 from "AR" — regional indicator letters, no image assets involved. */
export function flagEmoji(iso2: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso2)) return '';
  return String.fromCodePoint(
    ...iso2.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

let regionNames: Intl.DisplayNames | null | undefined;

/** "AR" → "Argentina", using the browser's own country list. */
export function countryName(iso2: string, fallback: string): string {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  if (!regionNames) return fallback;
  try {
    return regionNames.of(iso2.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Ocean and sea names as boxes, most specific first. Real hydrographic limits
 * are ragged and the IHO has been arguing about some of them for a century —
 * this is a label for a fun fact, not a chart to navigate by. Boxes may overlap
 * land; nothing calls this unless the point already failed the land test.
 */
interface WaterBox {
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const SEAS: WaterBox[] = [
  { name: 'the Mediterranean Sea', minLat: 30, maxLat: 46, minLon: -6, maxLon: 36 },
  { name: 'the Black Sea', minLat: 40, maxLat: 48, minLon: 27, maxLon: 42 },
  { name: 'the Caspian Sea', minLat: 36, maxLat: 48, minLon: 46, maxLon: 55 },
  { name: 'the Red Sea', minLat: 12, maxLat: 30, minLon: 32, maxLon: 44 },
  { name: 'the Persian Gulf', minLat: 23, maxLat: 31, minLon: 47, maxLon: 57 },
  { name: 'the Baltic Sea', minLat: 53, maxLat: 66, minLon: 10, maxLon: 30 },
  { name: 'the North Sea', minLat: 51, maxLat: 62, minLon: -5, maxLon: 10 },
  { name: 'the Norwegian Sea', minLat: 62, maxLat: 75, minLon: -8, maxLon: 20 },
  { name: 'Hudson Bay', minLat: 51, maxLat: 66, minLon: -95, maxLon: -75 },
  { name: 'the Gulf of Mexico', minLat: 18, maxLat: 31, minLon: -98, maxLon: -81 },
  { name: 'the Caribbean Sea', minLat: 9, maxLat: 23, minLon: -88, maxLon: -59 },
  { name: 'the Gulf of Alaska', minLat: 50, maxLat: 62, minLon: -160, maxLon: -130 },
  { name: 'the Bering Sea', minLat: 52, maxLat: 66, minLon: 162, maxLon: -157 },
  { name: 'the Sea of Okhotsk', minLat: 43, maxLat: 62, minLon: 135, maxLon: 165 },
  { name: 'the Sea of Japan', minLat: 34, maxLat: 52, minLon: 127, maxLon: 142 },
  { name: 'the East China Sea', minLat: 24, maxLat: 34, minLon: 119, maxLon: 131 },
  { name: 'the South China Sea', minLat: 0, maxLat: 24, minLon: 104, maxLon: 122 },
  { name: 'the Philippine Sea', minLat: 5, maxLat: 25, minLon: 122, maxLon: 140 },
  { name: 'the Coral Sea', minLat: -30, maxLat: -8, minLon: 142, maxLon: 170 },
  { name: 'the Tasman Sea', minLat: -50, maxLat: -30, minLon: 148, maxLon: 175 },
  { name: 'the Great Australian Bight', minLat: -40, maxLat: -31, minLon: 118, maxLon: 142 },
  { name: 'the Arabian Sea', minLat: 0, maxLat: 25, minLon: 52, maxLon: 75 },
  { name: 'the Bay of Bengal', minLat: 5, maxLat: 23, minLon: 78, maxLon: 95 },
  { name: 'the Gulf of Guinea', minLat: -5, maxLat: 7, minLon: -5, maxLon: 10 },
  // The Americas sit between the two big oceans, so a plain longitude split
  // would call the water off New York "Pacific". These two claim the western
  // Atlantic before that split runs.
  { name: 'the North Atlantic Ocean', minLat: 23, maxLat: 70, minLon: -82, maxLon: -45 },
  { name: 'the South Atlantic Ocean', minLat: -60, maxLat: 10, minLon: -70, maxLon: -20 },
];

function inBox(box: WaterBox, { lat, lon }: Point): boolean {
  if (lat < box.minLat || lat > box.maxLat) return false;
  return box.minLon <= box.maxLon
    ? lon >= box.minLon && lon <= box.maxLon
    : lon >= box.minLon || lon <= box.maxLon;
}

export function waterName(point: Point): string {
  for (const box of SEAS) if (inBox(box, point)) return box.name;
  if (point.lat > 66.5) return 'the Arctic Ocean';
  if (point.lat < -60) return 'the Southern Ocean';
  if (point.lon >= 20 && point.lon <= 147) return 'the Indian Ocean';
  if (point.lon >= 147 || point.lon <= -70) {
    return point.lat >= 0 ? 'the North Pacific Ocean' : 'the South Pacific Ocean';
  }
  return point.lat >= 0 ? 'the North Atlantic Ocean' : 'the South Atlantic Ocean';
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function formatCoord({ lat, lon }: Point): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export function formatKm(km: number): string {
  if (km < 1) return '<1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** Populations are GeoNames estimates — showing all six digits oversells them. */
export function formatPopulation(population: number): string {
  if (population >= 1_000_000) return `${(population / 1_000_000).toFixed(population >= 10_000_000 ? 0 : 1)}M`;
  if (population >= 10_000) return `${Math.round(population / 1000)}k`;
  return population.toLocaleString();
}

export interface ClockReading {
  time: string;
  weekday: string;
  date: string;
  /** Offset from the digger's own clock, e.g. "11 hours ahead". */
  offsetLabel: string;
  isNight: boolean;
}

/** Reads the wall clock in `timeZone` at instant `now`. */
export function readClock(now: Date, timeZone: string, here: Date = now): ClockReading | null {
  try {
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(now);
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(now);
    const date = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'long',
      day: 'numeric',
    }).format(now);

    const hourThere = Number(
      new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(now)
    );
    // getTimezoneOffset counts minutes *west* of UTC, so negate it to compare
    // against the minutes-east figure zoneOffsetMinutes returns.
    const offsetMinutes = zoneOffsetMinutes(now, timeZone) + here.getTimezoneOffset();
    const hours = Math.trunc(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const magnitude = !hours ? `${minutes} minutes` : minutes ? `${hours}h ${minutes}m` : `${hours} hours`;
    const offsetLabel =
      offsetMinutes === 0
        ? 'the same time as you'
        : `${magnitude} ${offsetMinutes > 0 ? 'ahead of' : 'behind'} you`;

    return { time, weekday, date, offsetLabel, isNight: hourThere < 6 || hourThere >= 19 };
  } catch {
    return null;
  }
}

/** Minutes east of UTC for `timeZone` at `at`, DST included. */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Intl renders midnight as hour 24 in some engines; Date.UTC normalizes it.
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}
