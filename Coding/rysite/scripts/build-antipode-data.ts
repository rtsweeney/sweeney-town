// ── Antipode atlas — data build ──────────────────────────────────────────────
// Bakes the offline atlas the "Dig Through the Earth" page reads. The page does
// every lookup in the browser: no geocoding API, no key, nothing about the
// visitor's location ever leaves their device.
//
// Run with:  npm run build:antipode
//
// The inputs are two public datasets, both installed as devDependencies so the
// build needs no network at all:
//
//   Natural Earth country polygons, via the world-atlas TopoJSON build
//     https://github.com/topojson/world-atlas          (public domain)
//     - countries-110m: 8k points. Cheap enough to redraw every frame, so it
//       is what the spinning globe is made of.
//     - countries-50m: 80k points. Ten times the coastline detail, used only
//       for the "which country did I land in" test and to redraw the one
//       country you surfaced in.
//
//   GeoNames populated places, via the all-the-cities package
//     https://github.com/zeke/all-the-cities           (CC BY 4.0)
//
// Outputs land in public/data/antipode/ and are committed. None of it changes
// on a schedule — coastlines and the list of towns are effectively static —
// so there is no workflow rerunning this, unlike the NFL ratings.

import { writeFileSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import allTheCities from 'all-the-cities';
import * as topojson from 'topojson-client';
import { geoBounds, geoContains } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import type { GeometryCollection, GeometryObjectA, Topology } from 'topojson-specification';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'antipode');
const ATLAS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'world-atlas');

/**
 * Population floor for the "nearest town" answer. GeoNames goes down to 1,000
 * but that triples the file for hamlets most people have never heard of; 5,000
 * still puts a named place within a few tens of km of anywhere inhabited.
 */
const TOWN_MIN_POPULATION = 5_000;

/** A "major city" for the headline answer — and the tier loaded up front. */
const MAJOR_MIN_POPULATION = 100_000;

/**
 * Countries the majority vote below can't reach because no GeoNames place sits
 * inside them. Kept explicit rather than silently unlabelled — the build prints
 * anything still missing so this list stays honest.
 */
const ISO_OVERRIDES: Record<string, string> = {
  Antarctica: 'AQ',
  'Fr. S. Antarctic Lands': 'TF',
  'Heard I. and McDonald Is.': 'HM',
  'Br. Indian Ocean Ter.': 'IO',
  'S. Geo. and the Is.': 'GS',
  'U.S. Minor Outlying Is.': 'UM',
  'Coral Sea Is.': 'AU',
  'Ashmore and Cartier Is.': 'AU',
  'Indian Ocean Ter.': 'AU',
  'Siachen Glacier': 'IN',
  'Bajo Nuevo Bank': 'CO',
  'Serranilla Bank': 'CO',
  'Scarborough Reef': 'CN',
  'Spratly Is.': 'VN',
  'Clipperton I.': 'FR',
  // Simplified at 1:50m these are smaller than the settlement that names them,
  // so no GeoNames point falls inside; W. Sahara is drawn inside Morocco's
  // claim, so its own towns vote for Morocco.
  Vatican: 'VA',
  'Pitcairn Is.': 'PN',
  'Turks and Caicos Is.': 'TC',
  'W. Sahara': 'EH',
  'St-Martin': 'MF',
  Macao: 'MO',
};

/** base64 alphabet, used for the fixed-width and varint fields below. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';

/** Three base64 chars = 18 bits: ~76 m of latitude, ~153 m of longitude. */
function enc18(value: number): string {
  return B64[(value >> 12) & 63] + B64[(value >> 6) & 63] + B64[value & 63];
}

/** Little-endian base64 varint, 5 bits of payload per char. */
function encVarint(value: number): string {
  let rest = value;
  let out = '';
  do {
    const digit = rest & 31;
    rest >>>= 5;
    out += B64[digit | (rest > 0 ? 32 : 0)];
  } while (rest > 0);
  return out;
}

/**
 * One city per line: `<CC><lat×3><lon×3><pop varint>\t<name>`.
 *
 * Plain JSON of the same 49k rows is 1.7 MB, mostly repeated keys and decimal
 * digits. This is 1.0 MB and parses with two slices per line.
 */
function packCities(cities: typeof allTheCities): string {
  const lines: string[] = [];
  for (const city of cities) {
    const [lon, lat] = city.loc.coordinates;
    const latQ = Math.round(((lat + 90) / 180) * 262143);
    const lonQ = Math.round(((lon + 180) / 360) * 262143);
    lines.push(`${city.country}${enc18(latQ)}${enc18(lonQ)}${encVarint(city.population)}\t${city.name}`);
  }
  return lines.join('\n');
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // ── Country polygons ───────────────────────────────────────────────────────
  // The 110m file ships untouched: the globe only ever draws it.
  copyFileSync(join(ATLAS_DIR, 'countries-110m.json'), join(OUT_DIR, 'countries-110m.json'));

  // The 50m file gets ISO alpha-2 codes stitched in, so the page can turn a hit
  // into a flag and a localized country name (via Intl.DisplayNames) without a
  // second lookup table. Natural Earth carries only its own display names —
  // "W. Sahara", "United States of America" — and no codes at all.
  const topology = JSON.parse(readFileSync(join(ATLAS_DIR, 'countries-50m.json'), 'utf8')) as Topology<{
    countries: GeometryCollection<{ name?: string; iso?: string }>;
  }>;

  const features = (
    topojson.feature(topology, topology.objects.countries) as unknown as {
      features: Feature<Geometry, { name?: string }>[];
    }
  ).features;

  // Every city is a labelled sample of the country it sits in, so the code for
  // each polygon is just the code most of its cities carry. Cheaper and less
  // error-prone than transcribing 240 ISO numeric codes by hand, and a
  // disagreement inside one polygon (a border town on the wrong side of a
  // simplified coastline) is outvoted rather than believed.
  const bounds = features.map((f) => geoBounds(f));
  const votes: Map<string, Map<string, number>> = new Map();

  // d3 reports a shape straddling the antimeridian — Russia, the US with
  // Alaska, Kiribati — with its west edge east of its east edge. Reading that
  // as an ordinary box excludes the whole country.
  const inBounds = (index: number, lon: number, lat: number) => {
    const [[minLon, minLat], [maxLon, maxLat]] = bounds[index];
    if (lat < minLat || lat > maxLat) return false;
    return minLon <= maxLon ? lon >= minLon && lon <= maxLon : lon >= minLon || lon <= maxLon;
  };

  const tally = (pool: typeof allTheCities, candidates: number[]) => {
    for (const city of pool) {
      const [lon, lat] = city.loc.coordinates;
      for (const i of candidates) {
        if (!inBounds(i, lon, lat)) continue;
        const name = features[i].properties?.name;
        if (!name) continue;
        if (!geoContains(features[i], [lon, lat])) continue;
        let counts = votes.get(name);
        if (!counts) votes.set(name, (counts = new Map()));
        counts.set(city.country, (counts.get(city.country) ?? 0) + 1);
        break;
      }
    }
  };

  const cities = allTheCities;
  const everyFeature = features.map((_, i) => i);
  // First pass over the larger places is enough for almost every country.
  tally(
    cities.filter((c) => c.population >= 15_000),
    everyFeature
  );
  // Second pass, over every village but only against the polygons still
  // unlabelled, reaches the island territories whose biggest settlement is tiny
  // — and isn't shadowed by a big neighbour winning the first-hit race.
  const shortlist = everyFeature.filter((i) => {
    const name = features[i].properties?.name;
    return Boolean(name) && !votes.has(name!);
  });
  if (shortlist.length > 0) tally(cities, shortlist);

  const unlabelled: string[] = [];
  // Narrowed by hand: TopoJSON's type allows a null geometry with no
  // properties, which world-atlas never actually contains.
  const geometries = topology.objects.countries.geometries as GeometryObjectA<{
    name?: string;
    iso?: string;
  }>[];
  for (const geometry of geometries) {
    const name = geometry.properties?.name;
    if (!name) continue;
    const counts = votes.get(name);
    let iso = ISO_OVERRIDES[name];
    if (counts) {
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      // A handful of votes against a polygon this size means the polygon is a
      // territory whose few towns are indexed under the parent country — trust
      // the override list over a thin majority when one exists.
      iso = best[1] >= 3 || !iso ? best[0] : iso;
    }
    if (!iso) unlabelled.push(name);
    else geometry.properties!.iso = iso;
  }

  // A polygon with no code renders as a country with no flag and no localized
  // name, which is a data regression worth stopping for rather than shipping.
  if (unlabelled.length > 0) {
    const plural = unlabelled.length === 1 ? 'polygon' : 'polygons';
    console.error(`No ISO code for ${unlabelled.length} ${plural}: ${unlabelled.join(', ')}`);
    console.error('Add them to ISO_OVERRIDES above and rerun.');
    process.exitCode = 1;
    return;
  }

  writeFileSync(join(OUT_DIR, 'countries-50m.json'), JSON.stringify(topology));

  // ── Populated places ───────────────────────────────────────────────────────
  // Split in two so the page is useful before the whole atlas has landed: the
  // major-city tier is ~90 KB and answers "nearest big city" on its own, and
  // the town tier streams in behind it.
  const sorted = cities
    .filter((c) => c.population >= TOWN_MIN_POPULATION)
    .sort((a, b) => b.population - a.population);
  const major = sorted.filter((c) => c.population >= MAJOR_MIN_POPULATION);
  const towns = sorted.filter((c) => c.population < MAJOR_MIN_POPULATION);

  writeFileSync(join(OUT_DIR, 'cities-major.txt'), packCities(major));
  writeFileSync(join(OUT_DIR, 'cities-towns.txt'), packCities(towns));

  console.log(`countries : ${features.length} polygons, every one with an ISO code`);
  console.log(`major     : ${major.length} cities >= ${MAJOR_MIN_POPULATION.toLocaleString()}`);
  console.log(`towns     : ${towns.length} places >= ${TOWN_MIN_POPULATION.toLocaleString()}`);
}

main();
