// ── The offline atlas ────────────────────────────────────────────────────────
// Loads what scripts/build-antipode-data.ts baked and answers the three
// questions the page asks of a coordinate: is it land, whose land, and what is
// the nearest named place.
//
// Everything runs in the browser against static files. There is no geocoding
// service in the loop, which means no API key, no rate limit, nothing to break
// behind a restrictive network, and no coordinate of the visitor's ever leaving
// their machine.

import { geoContains, geoBounds } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Feature, FeatureCollection, Geometry, MultiLineString, MultiPolygon, Position } from 'geojson';
import type { Topology, GeometryCollection, MultiPolygon as TopoMultiPolygon, Polygon as TopoPolygon } from 'topojson-specification';

import { type Point, distanceKm, normalizeLon } from './antipode';

const BASE = '/data/antipode';

export interface City {
  name: string;
  /** ISO 3166-1 alpha-2, straight from GeoNames. */
  iso2: string;
  lat: number;
  lon: number;
  population: number;
}

export interface CountryFeature extends Feature<Geometry, { name: string; iso: string }> {
  bounds: [[number, number], [number, number]];
}

// ── Loading ──────────────────────────────────────────────────────────────────
// Two tiers. The globe only needs the coarse outlines and the big cities, ~90 KB
// between them, so it can be spinning almost immediately. The precise coastlines
// and the 44k smaller towns — the bulk of the download — stream in behind and
// are only awaited when someone actually digs.

export interface GlobeShapes {
  /** Every landmass merged into one path — one fill instead of 241. */
  land: MultiPolygon;
  /** Shared borders only, so no coastline gets drawn twice. */
  borders: MultiLineString;
}

let renderPromise: Promise<GlobeShapes> | null = null;
let lookupPromise: Promise<CountryFeature[]> | null = null;
let majorPromise: Promise<City[]> | null = null;
let townPromise: Promise<City[]> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

/** Coarse country outlines, 8k points — cheap enough to redraw every frame. */
export function loadGlobeShapes(): Promise<GlobeShapes> {
  renderPromise ??= fetchJson<Topology<{ countries: GeometryCollection }>>(
    `${BASE}/countries-110m.json`
  ).then((topology) => ({
    // Every country welded into one shape, so the fill is a single path and
    // shared borders don't get painted over by their neighbour.
    land: topojson.merge(
      topology,
      topology.objects.countries.geometries as (TopoPolygon | TopoMultiPolygon)[]
    ),
    borders: topojson.mesh(topology, topology.objects.countries, (a, b) => a !== b),
  }));
  return renderPromise;
}

/** Ten-times-finer outlines, used for the land test and the ISO codes. */
export function loadLookupCountries(): Promise<CountryFeature[]> {
  lookupPromise ??= fetchJson<Topology<{ countries: GeometryCollection<{ name: string; iso: string }> }>>(
    `${BASE}/countries-50m.json`
  ).then((topology) => {
    const collection = topojson.feature(topology, topology.objects.countries) as FeatureCollection<
      Geometry,
      { name: string; iso: string }
    >;
    // Caching each bounding box turns "which of 241 countries is this point in"
    // into a couple of arithmetic comparisons for all but a handful of them.
    return collection.features.map((feature) => {
      const bounds = geoBounds(feature);
      return Object.assign(feature, { bounds }) as CountryFeature;
    });
  });
  return lookupPromise;
}

const B64_INDEX = (() => {
  const table = new Int8Array(128).fill(-1);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-';
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
})();

/** Reverses packCities() in the build script. */
function parseCities(text: string): City[] {
  const cities: City[] = [];
  if (!text) return cities;
  for (const line of text.split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const packed = line.slice(0, tab);
    let latQ = 0;
    let lonQ = 0;
    for (let i = 0; i < 3; i++) latQ = (latQ << 6) | B64_INDEX[packed.charCodeAt(2 + i)];
    for (let i = 0; i < 3; i++) lonQ = (lonQ << 6) | B64_INDEX[packed.charCodeAt(5 + i)];
    let population = 0;
    let shift = 0;
    for (let i = 8; i < packed.length; i++) {
      const digit = B64_INDEX[packed.charCodeAt(i)];
      population |= (digit & 31) << shift;
      shift += 5;
      if (!(digit & 32)) break;
    }
    cities.push({
      name: line.slice(tab + 1),
      iso2: packed.slice(0, 2),
      lat: (latQ / 262143) * 180 - 90,
      lon: (lonQ / 262143) * 360 - 180,
      population,
    });
  }
  return cities;
}

async function fetchCities(path: string): Promise<City[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
  return parseCities(await response.text());
}

/** Everywhere over 100,000 people — 4,442 of them, ~100 KB. */
export function loadMajorCities(): Promise<City[]> {
  majorPromise ??= fetchCities(`${BASE}/cities-major.txt`);
  return majorPromise;
}

/** Everywhere between 5,000 and 100,000 — 44,583 of them, ~1 MB. */
export function loadTowns(): Promise<City[]> {
  townPromise ??= fetchCities(`${BASE}/cities-towns.txt`);
  return townPromise;
}

// ── Queries ──────────────────────────────────────────────────────────────────

function withinBounds(feature: CountryFeature, { lat, lon }: Point): boolean {
  const [[minLon, minLat], [maxLon, maxLat]] = feature.bounds;
  if (lat < minLat || lat > maxLat) return false;
  // Russia, the US and Fiji all straddle the antimeridian, and d3 reports those
  // with the west edge numerically east of the east edge.
  return minLon <= maxLon ? lon >= minLon && lon <= maxLon : lon >= minLon || lon <= maxLon;
}

export function countryAt(countries: CountryFeature[], point: Point): CountryFeature | null {
  const position: [number, number] = [point.lon, point.lat];
  for (const feature of countries) {
    if (!withinBounds(feature, point)) continue;
    if (geoContains(feature, position)) return feature;
  }
  return null;
}

export interface NearestCity {
  city: City;
  distanceKm: number;
}

export function nearestCity(cities: City[], point: Point, minPopulation = 0): NearestCity | null {
  let best: City | null = null;
  let bestScore = Infinity;
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  for (const city of cities) {
    if (city.population < minPopulation) continue;
    // Rank on a cheap flat-earth approximation first; it gets the ordering right
    // over the few hundred km that ever win, and skips 45,000 trig calls.
    const dLat = city.lat - point.lat;
    let dLon = city.lon - point.lon;
    if (dLon > 180) dLon -= 360;
    else if (dLon < -180) dLon += 360;
    const score = dLat * dLat + (dLon * cosLat) ** 2;
    if (score < bestScore) {
      bestScore = score;
      best = city;
    }
  }
  return best ? { city: best, distanceKm: distanceKm(point, best) } : null;
}

export interface NearestLand {
  point: Point;
  distanceKm: number;
  country: CountryFeature | null;
}

/**
 * Closest bit of coastline to an ocean point, found by walking the vertices of
 * the 1:50m outlines. Sampling vertices rather than edges can overshoot by the
 * length of one segment — a few km at this resolution — so the page reports it
 * as approximate.
 */
export function nearestLand(countries: CountryFeature[], point: Point): NearestLand | null {
  let bestScore = Infinity;
  let bestPosition: Position | null = null;
  let bestCountry: CountryFeature | null = null;
  const cosLat = Math.cos((point.lat * Math.PI) / 180);

  const consider = (position: Position, feature: CountryFeature) => {
    const dLat = position[1] - point.lat;
    let dLon = position[0] - point.lon;
    if (dLon > 180) dLon -= 360;
    else if (dLon < -180) dLon += 360;
    const score = dLat * dLat + (dLon * cosLat) ** 2;
    if (score < bestScore) {
      bestScore = score;
      bestPosition = position;
      bestCountry = feature;
    }
  };

  for (const feature of countries) {
    const geometry = feature.geometry;
    if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates) for (const p of ring) consider(p, feature);
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates)
        for (const ring of polygon) for (const p of ring) consider(p, feature);
    }
  }

  if (!bestPosition) return null;
  const [lon, lat] = bestPosition as Position;
  const landing = { lat, lon: normalizeLon(lon) };
  return { point: landing, distanceKm: distanceKm(point, landing), country: bestCountry };
}

// ── Search, for typing a starting point by name ──────────────────────────────

interface CitySearchResult extends City {
  /** Lower is better. */
  rank: number;
}

/**
 * Same data, used backwards: find a place by name so nobody has to grant
 * location access or know their own coordinates.
 */
export function searchCities(pools: City[][], query: string, limit = 6): City[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const results: CitySearchResult[] = [];
  for (const pool of pools) {
    for (const city of pool) {
      const name = city.name.toLowerCase();
      let rank: number;
      if (name === needle) rank = 0;
      else if (name.startsWith(needle)) rank = 1;
      else if (name.includes(needle)) rank = 2;
      else continue;
      // Within a tier, the bigger place is the one people meant.
      results.push({ ...city, rank: rank - Math.min(0.9, city.population / 25_000_000) });
    }
  }

  results.sort((a, b) => a.rank - b.rank || b.population - a.population);

  // "Springfield" exists in most US states; one per country per name is plenty.
  const seen = new Set<string>();
  const unique: City[] = [];
  for (const city of results) {
    const key = `${city.name.toLowerCase()}|${city.iso2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(city);
    if (unique.length >= limit) break;
  }
  return unique;
}
