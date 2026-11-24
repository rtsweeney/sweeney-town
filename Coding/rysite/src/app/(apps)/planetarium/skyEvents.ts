// Eclipse dates below come from published long-range eclipse predictions
// (deterministic orbital mechanics — same source data NASA/GSFC eclipse
// catalogs draw from). Equinox/solstice dates are computed from Meeus'
// low-precision polynomial approximation, accurate to within a day.

import { getSunMoonPosition } from './constellations';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export interface SolarEclipseEvent {
  date: string; // ISO date, YYYY-MM-DD — the UTC calendar date of greatest eclipse
  type: 'Total' | 'Annular' | 'Partial' | 'Hybrid';
  visibility: string;
}

export interface LunarEclipseEvent {
  date: string;
  type: 'Total' | 'Partial' | 'Penumbral';
  visibility: string;
}

export interface MeteorShower {
  name: string;
  month: number; // 1-12
  day: number;
  description: string;
}

export const SOLAR_ECLIPSES: SolarEclipseEvent[] = [
  { date: '2024-04-08', type: 'Total', visibility: 'Mexico, United States, Canada' },
  { date: '2024-10-02', type: 'Annular', visibility: 'Southern South America, South Pacific' },
  { date: '2025-03-29', type: 'Partial', visibility: 'Europe, North Africa, Eastern North America, North Atlantic' },
  { date: '2025-09-21', type: 'Partial', visibility: 'New Zealand, South Pacific, Antarctica' },
  { date: '2026-02-17', type: 'Annular', visibility: 'Antarctica, southern Africa, South America' },
  { date: '2026-08-12', type: 'Total', visibility: 'Greenland, Iceland, Spain' },
  { date: '2027-02-06', type: 'Annular', visibility: 'South America, Antarctica, West Africa' },
  { date: '2027-08-02', type: 'Total', visibility: 'North Africa, Spain, Saudi Arabia, Egypt, Yemen, Somalia' },
  { date: '2028-01-26', type: 'Annular', visibility: 'Eastern South America, Atlantic, Central Africa' },
  { date: '2028-07-22', type: 'Total', visibility: 'Australia, New Zealand' },
  { date: '2029-01-14', type: 'Partial', visibility: 'North America, Central America' },
  { date: '2029-06-12', type: 'Partial', visibility: 'Arctic, Scandinavia, Alaska, Canada' },
  { date: '2029-07-11', type: 'Partial', visibility: 'Southern Chile, southern Argentina' },
  { date: '2029-12-05', type: 'Partial', visibility: 'Southern South America, Antarctica' },
  { date: '2030-06-01', type: 'Annular', visibility: 'North Africa, Europe, Asia' },
  { date: '2030-11-25', type: 'Total', visibility: 'Southern Africa, Indian Ocean, Australia' },
  { date: '2031-05-21', type: 'Annular', visibility: 'Angola, Zambia, Tanzania, southern India, Sri Lanka, Southeast Asia' },
  { date: '2031-11-14', type: 'Hybrid', visibility: 'Central Pacific, Panama' },
  { date: '2032-05-09', type: 'Annular', visibility: 'South Atlantic and Southern Ocean, southern Africa, South America' },
  { date: '2032-11-03', type: 'Partial', visibility: 'Eastern Europe, Russia, Asia, Pacific' },
  { date: '2033-03-30', type: 'Total', visibility: 'Alaska, Russian Far East, Hawaii, Greenland, Iceland' },
  { date: '2033-09-23', type: 'Partial', visibility: 'Southern South America, Antarctica, South Pacific, South Atlantic' },
  { date: '2034-03-20', type: 'Total', visibility: 'Nigeria, Chad, Sudan, Egypt, Saudi Arabia, Iran, Pakistan, India, China' },
  { date: '2035-09-02', type: 'Total', visibility: 'China, North Korea, South Korea, Japan' },
  { date: '2036-02-27', type: 'Partial', visibility: 'Southeastern Australia, New Zealand, Antarctica' },
  { date: '2036-07-23', type: 'Partial', visibility: 'East Antarctica, Southern Ocean' },
  { date: '2036-08-21', type: 'Partial', visibility: 'Alaska, Canada, Greenland, Western Europe, Northwest Africa' },
];

export const LUNAR_ECLIPSES: LunarEclipseEvent[] = [
  { date: '2024-09-18', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2025-03-14', type: 'Total', visibility: 'Americas, Western Europe, Western Africa' },
  { date: '2025-09-07', type: 'Total', visibility: 'Asia, Australia, Europe, Africa' },
  { date: '2026-03-03', type: 'Total', visibility: 'Asia, Australia, Pacific, Americas' },
  { date: '2026-08-28', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2028-01-12', type: 'Partial', visibility: 'Americas, Europe, Africa' },
  { date: '2028-07-06', type: 'Partial', visibility: 'Africa, Asia, Australia' },
  { date: '2028-12-31', type: 'Total', visibility: 'Europe, Africa, Asia' },
  { date: '2029-06-26', type: 'Total', visibility: 'Americas, Europe, Africa' },
  { date: '2029-12-20', type: 'Total', visibility: 'Americas, Europe, Africa, Asia' },
  { date: '2030-06-15', type: 'Partial', visibility: 'Africa, Europe, Asia, Australia' },
  { date: '2030-12-09', type: 'Total', visibility: 'Americas, Europe, Africa, Asia' },
  { date: '2032-04-25', type: 'Total', visibility: 'Asia, Australia, Africa, Europe, Americas' },
  { date: '2032-10-18', type: 'Total', visibility: 'Asia, Africa, Antarctica, Europe, Oceania' },
  { date: '2033-04-14', type: 'Total', visibility: 'Antarctica, Asia, Africa, Europe, Oceania' },
  { date: '2033-10-08', type: 'Total', visibility: 'Asia, Australia, Americas, Pacific' },
  { date: '2034-09-27', type: 'Partial', visibility: 'Americas, Western Africa, Western Europe' },
  { date: '2035-08-18', type: 'Partial', visibility: 'South America, Africa, Europe, North America' },
  { date: '2036-02-11', type: 'Total', visibility: 'Africa, Europe, Asia, Americas' },
  { date: '2036-08-06', type: 'Total', visibility: 'South America, Africa, North America' },
];

export const METEOR_SHOWERS: MeteorShower[] = [
  { name: 'Quadrantids', month: 1, day: 3, description: 'A short, sharp peak favoring observers under dark northern-hemisphere skies.' },
  { name: 'Lyrids', month: 4, day: 22, description: 'A modest but reliable shower known for occasional bright fireballs.' },
  { name: 'Eta Aquariids', month: 5, day: 5, description: 'Debris from Halley\'s Comet; best seen from the southern hemisphere before dawn.' },
  { name: 'Perseids', month: 8, day: 12, description: 'One of the year\'s most popular showers, with fast, bright meteors in warm summer nights.' },
  { name: 'Orionids', month: 10, day: 21, description: 'Another Halley\'s Comet shower, producing fast meteors with fine trains.' },
  { name: 'Leonids', month: 11, day: 17, description: 'Known for occasional meteor storms once every ~33 years; typically a modest shower otherwise.' },
  { name: 'Geminids', month: 12, day: 13, description: 'Often the year\'s best shower — prolific, colorful, and reliable.' },
  { name: 'Ursids', month: 12, day: 22, description: 'A minor shower near the winter solstice for northern-hemisphere observers.' },
];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function findNextEvent<T extends { date: string }>(events: T[], from: Date): T | null {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  let best: T | null = null;
  let bestTime = Infinity;
  for (const ev of events) {
    const t = parseISODate(ev.date).getTime();
    if (t >= fromDay && t < bestTime) {
      bestTime = t;
      best = ev;
    }
  }
  return best;
}

export function getNextSolarEclipse(from: Date): SolarEclipseEvent | null {
  return findNextEvent(SOLAR_ECLIPSES, from);
}

export function getNextLunarEclipse(from: Date): LunarEclipseEvent | null {
  return findNextEvent(LUNAR_ECLIPSES, from);
}

function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

// Meeus, "Astronomical Algorithms," low-precision equinox/solstice formulas (valid 1000-3000 CE)
function equinoxSolsticeJDE(year: number, which: 0 | 1 | 2 | 3): number {
  const Y = (year - 2000) / 1000;
  switch (which) {
    case 0: // March equinox
      return 2451623.80984 + 365242.37404 * Y + 0.05169 * Y ** 2 - 0.00411 * Y ** 3 - 0.00057 * Y ** 4;
    case 1: // June solstice
      return 2451716.56767 + 365241.62603 * Y + 0.00325 * Y ** 2 + 0.00888 * Y ** 3 - 0.00030 * Y ** 4;
    case 2: // September equinox
      return 2451810.21715 + 365242.01767 * Y - 0.11575 * Y ** 2 + 0.00337 * Y ** 3 + 0.00078 * Y ** 4;
    case 3: // December solstice
      return 2451900.05952 + 365242.74049 * Y - 0.06223 * Y ** 2 - 0.00823 * Y ** 3 + 0.00032 * Y ** 4;
  }
}

const SEASONAL_MARKER_NAMES = ['March Equinox', 'June Solstice', 'September Equinox', 'December Solstice'] as const;

export interface SeasonalMarker {
  name: string;
  date: Date;
}

export function getNextSeasonalMarker(from: Date): SeasonalMarker {
  const candidates: SeasonalMarker[] = [];
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    for (let which = 0; which < 4; which++) {
      candidates.push({
        name: SEASONAL_MARKER_NAMES[which],
        date: jdToDate(equinoxSolsticeJDE(year, which as 0 | 1 | 2 | 3)),
      });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates.find(c => c.date.getTime() >= from.getTime()) ?? candidates[candidates.length - 1];
}

export interface UpcomingMeteorShower {
  name: string;
  date: Date;
  description: string;
}

export function getNextMeteorShower(from: Date): UpcomingMeteorShower {
  const candidates: UpcomingMeteorShower[] = [];
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    for (const shower of METEOR_SHOWERS) {
      candidates.push({
        name: shower.name,
        date: new Date(year, shower.month - 1, shower.day),
        description: shower.description,
      });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates.find(c => c.date.getTime() >= from.getTime()) ?? candidates[candidates.length - 1];
}

function angularSeparationDeg(ra1Hours: number, dec1: number, ra2Hours: number, dec2: number): number {
  const ra1 = ra1Hours * 15 * DEG2RAD;
  const ra2 = ra2Hours * 15 * DEG2RAD;
  const d1 = dec1 * DEG2RAD;
  const d2 = dec2 * DEG2RAD;
  const cosSep = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2);
  return Math.acos(Math.max(-1, Math.min(1, cosSep))) * RAD2DEG;
}

/** Distance (degrees) of a phase angle from exact opposition (180° = full moon / lunar-eclipse season). */
function distanceFromOpposition(phaseAngle: number): number {
  return Math.abs(((phaseAngle - 180 + 540) % 360) - 180);
}

/**
 * Coarse-then-fine grid search for the time (within +/-windowHours of centerMs)
 * that minimizes `objective`. The Sun/Moon motion here is smooth with a single
 * minimum near the known eclipse date, so a grid search is simpler and just as
 * reliable as a gradient method at this precision.
 */
function minimizeNear(centerMs: number, windowHours: number, objective: (ms: number) => number): Date {
  let bestMs = centerMs;
  let bestVal = Infinity;
  let spanMs = windowHours * 2 * 3600000;
  let originMs = centerMs - windowHours * 3600000;

  for (let pass = 0; pass < 5; pass++) {
    const steps = pass === 0 ? 288 : 60; // coarse pass: ~10-minute resolution across the full window
    for (let i = 0; i <= steps; i++) {
      const ms = originMs + (spanMs * i) / steps;
      const val = objective(ms);
      if (val < bestVal) {
        bestVal = val;
        bestMs = ms;
      }
    }
    spanMs = (spanMs / steps) * 4; // zoom in around the best point found so far
    originMs = bestMs - spanMs / 2;
  }

  return new Date(bestMs);
}

/**
 * Finds the moment (within +/-2 days of the known eclipse date) where the Sun and
 * Moon are closest together in the sky, using the same geocentric Sun/Moon math
 * that drives the rest of the planetarium. This is accurate to roughly the
 * ~1° precision of that underlying model — enough to show the Moon visually
 * overlapping the Sun, but it does not account for lunar parallax, so it can't
 * determine whether any specific location falls inside the eclipse's actual
 * shadow path.
 */
export function findSolarEclipseMoment(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const centerMs = Date.UTC(y, m - 1, d, 12, 0, 0);
  return minimizeNear(centerMs, 48, (ms) => {
    const { sun, moon } = getSunMoonPosition(new Date(ms));
    return angularSeparationDeg(sun.ra, sun.dec, moon.ra, moon.dec);
  });
}

/**
 * Finds the moment (within +/-2 days of the known eclipse date) of exact
 * Sun-Earth-Moon opposition — the peak of a lunar eclipse. Unlike a solar
 * eclipse this is a purely geocentric alignment, so it needs no
 * location-dependent correction to be accurate.
 */
export function findLunarEclipseMoment(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const centerMs = Date.UTC(y, m - 1, d, 12, 0, 0);
  return minimizeNear(centerMs, 48, (ms) => {
    const { phaseAngle } = getSunMoonPosition(new Date(ms));
    return distanceFromOpposition(phaseAngle);
  });
}
