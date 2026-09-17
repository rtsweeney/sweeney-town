'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

import {
  type Point,
  type ClockReading,
  antipodeOf,
  bearingDeg,
  compassWord,
  countryName,
  distanceKm,
  EARTH_DIAMETER_KM,
  flagEmoji,
  formatCoord,
  formatKm,
  formatPopulation,
  GRAVITY_TRAIN_MINUTES,
  GRAVITY_TRAIN_MINUTES_REALISTIC,
  GRAVITY_TRAIN_TOP_SPEED_KMH,
  HALF_CIRCUMFERENCE_KM,
  readClock,
  waterName,
} from './antipode';
import {
  type City,
  type CountryFeature,
  type NearestCity,
  countryAt,
  loadGlobeShapes,
  loadLookupCountries,
  loadMajorCities,
  loadTowns,
  nearestCity,
  nearestLand,
  searchCities,
} from './atlas';
import { Globe } from './globe';

/** Somewhere to start from, however it was chosen. */
interface Origin {
  point: Point;
  label: string;
  /** True when it came from the browser rather than a search or a chip. */
  fromDevice: boolean;
}

interface DigResult {
  origin: Origin;
  target: Point;
  country: { name: string; iso: string } | null;
  water: string | null;
  coastline: { distanceKm: number; countryName: string; bearing: number } | null;
  town: NearestCity | null;
  majorCity: NearestCity | null;
  timeZone: string | null;
  clock: ClockReading | null;
}

/**
 * A few antipodal pairs that actually land on people rather than open water —
 * most of the planet's dry land is opposite ocean, so without a shortcut the
 * first try is usually the middle of the Pacific.
 */
const SHORTCUTS: { label: string; point: Point }[] = [
  { label: 'Shanghai', point: { lat: 31.2222, lon: 121.4581 } },
  { label: 'Madrid', point: { lat: 40.4165, lon: -3.7026 } },
  { label: 'Auckland', point: { lat: -36.8485, lon: 174.7633 } },
  { label: 'Honolulu', point: { lat: 21.3069, lon: -157.8583 } },
  { label: 'Lima', point: { lat: -12.0464, lon: -77.0428 } },
];

/** Depth is faked as a constant-rate drill; the captions are not. */
const LAYERS: { depth: number; label: string }[] = [
  { depth: 0, label: 'Breaking through the crust' },
  { depth: 35, label: 'Into the mantle — rock that flows like tar' },
  { depth: 2890, label: 'Outer core: liquid iron, about 4,000 °C' },
  { depth: 5150, label: 'Inner core: solid iron, near the heat of the Sun' },
  { depth: 6371, label: 'Past the centre — gravity is behind you now' },
  { depth: 7592, label: 'Back up through the far outer core' },
  { depth: 9852, label: 'Rising through the far mantle' },
  { depth: 12707, label: 'Surfacing' },
];

const DIG_MS = 4200;

function layerFor(depth: number): string {
  let label = LAYERS[0].label;
  for (const layer of LAYERS) if (depth >= layer.depth) label = layer.label;
  return label;
}

/** "Etc/GMT-7" is what the tz database calls open ocean; say it in plain UTC. */
function zoneLabel(zone: string): string {
  const nautical = /^Etc\/GMT([+-])(\d{1,2})$/.exec(zone);
  if (nautical) {
    // The Etc zones have their sign inverted relative to how anyone says it.
    const sign = nautical[1] === '-' ? '+' : '−';
    return `UTC${sign}${nautical[2]} (nautical time)`;
  }
  return zone.replace(/_/g, ' ');
}

export default function AntipodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<Globe | null>(null);

  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [atlasReady, setAtlasReady] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'digging' | 'arrived'>('idle');
  const [depth, setDepth] = useState(0);
  const [result, setResult] = useState<DigResult | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  const cities = useRef<{ major: City[]; towns: City[]; all: City[] } | null>(null);
  const countries = useRef<CountryFeature[] | null>(null);

  // ── Globe lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current) return;
    const globe = new Globe(canvasRef.current);
    globeRef.current = globe;
    globe.start();

    void loadGlobeShapes()
      .then((shapes) => globe.setShapes(shapes))
      .catch(() => {});

    const onVisibility = () => (document.hidden ? globe.stop() : globe.start());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      globe.destroy();
      globeRef.current = null;
    };
  }, []);

  // The heavy half of the atlas — precise coastlines and 44k towns — downloads
  // in the background while the globe is already turning.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadMajorCities(), loadTowns(), loadLookupCountries()])
      .then(([major, towns, lookup]) => {
        if (cancelled) return;
        cities.current = { major, towns, all: major.concat(towns) };
        countries.current = lookup;
        setAtlasReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A clock, so the time on the far side stays honest while you read it.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── Choosing where to dig from ─────────────────────────────────────────────

  const describe = useCallback((point: Point, fallback: string): string => {
    const pool = cities.current;
    if (!pool) return fallback;
    const near = nearestCity(pool.all, point);
    if (!near || near.distanceKm > 120) return fallback;
    const country = countryName(near.city.iso2, near.city.iso2);
    return near.distanceKm < 12
      ? `${near.city.name}, ${country}`
      : `near ${near.city.name}, ${country}`;
  }, []);

  /**
   * Set once someone picks a place themselves. The permission prompt can sit
   * unanswered for as long as it likes, and whenever it does come back it must
   * not yank the globe away from the city they chose in the meantime.
   */
  const pickedByHand = useRef(false);

  /**
   * getCurrentPosition's own `timeout` only starts counting once permission has
   * been granted, so a prompt nobody answers calls neither callback, ever. This
   * watchdog is what gets the UI out of "Locating…" in that case; the request
   * itself is left running, because a permission granted late should still
   * work.
   */
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (watchdog.current && clearTimeout(watchdog.current)), []);

  const requestDeviceLocation = useCallback(
    (auto = false) => {
      if (!('geolocation' in navigator)) {
        if (!auto) setLocationError('This browser has no location service — search for a place instead.');
        return;
      }
      if (!auto) pickedByHand.current = false;
      setLocating(true);
      setLocationError(null);

      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = setTimeout(() => {
        watchdog.current = null;
        setLocating(false);
        if (auto && pickedByHand.current) return;
        setLocationError('Your browser hasn\u2019t answered — pick a place below, or ask it again.');
      }, 9_000);

      const settle = () => {
        if (watchdog.current) clearTimeout(watchdog.current);
        watchdog.current = null;
        setLocating(false);
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          settle();
          if (auto && pickedByHand.current) return;
          const point = { lat: position.coords.latitude, lon: position.coords.longitude };
          setLocationError(null);
          setOrigin({ point, label: describe(point, formatCoord(point)), fromDevice: true });
        },
        () => {
          settle();
          if (auto && pickedByHand.current) return;
          setLocationError('No location from the browser — search for a place or use a shortcut below.');
        },
        // A cached fix is fine for the automatic ask on arrival, but someone
        // pressing the button wants where they are now, not where they were.
        { timeout: 8_000, maximumAge: auto ? 300_000 : 0 }
      );
    },
    [describe]
  );

  // Ask once on arrival, the way the planetarium does. A refusal is not an
  // error state here: the search box below works just as well.
  useEffect(() => {
    if (!atlasReady) return;
    requestDeviceLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasReady]);

  // Once a starting point exists, aim the globe at it. Picking a new one after
  // a dig also has to clear the last answer off the globe.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !origin || phase !== 'idle') return;
    globe.setHighlight(null);
    globe.setDrill(0);
    globe.setIdleSpin(true);
    globe.setMarkers([{ point: origin.point, kind: 'origin', label: 'You' }]);
    void globe.spinTo(origin.point, { duration: 1200, extraTurns: 0 });
  }, [origin, phase]);

  useEffect(() => {
    if (!atlasReady || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const pool = cities.current;
    if (!pool) return;
    const timer = setTimeout(() => setSuggestions(searchCities([pool.major, pool.towns], query)), 160);
    return () => clearTimeout(timer);
  }, [query, atlasReady]);

  const chooseCity = useCallback((city: City) => {
    pickedByHand.current = true;
    setOrigin({
      point: { lat: city.lat, lon: city.lon },
      label: `${city.name}, ${countryName(city.iso2, city.iso2)}`,
      fromDevice: false,
    });
    setQuery('');
    setSuggestions([]);
    setLocationError(null);
    setPhase('idle');
    setResult(null);
  }, []);

  // ── The dig ────────────────────────────────────────────────────────────────

  const dig = useCallback(async () => {
    const globe = globeRef.current;
    const pool = cities.current;
    const lookup = countries.current;
    if (!globe || !origin || !pool || !lookup) return;

    setPhase('digging');
    setResult(null);
    setDepth(0);
    globe.setIdleSpin(false);
    globe.setHighlight(null);

    const target = antipodeOf(origin.point);

    // Work the answer out now, while the animation covers the cost.
    const hit = countryAt(lookup, target);
    const coast = hit ? null : nearestLand(lookup, target);
    const town = nearestCity(pool.all, target);
    const majorCity = nearestCity(pool.major, target);

    let timeZone: string | null = null;
    try {
      const { default: tzlookup } = await import('tz-lookup');
      timeZone = tzlookup(target.lat, target.lon);
    } catch {
      timeZone = null;
    }

    await globe.spinTo(target, {
      duration: DIG_MS,
      extraTurns: 1,
      onProgress: (t) => {
        setDepth(t * EARTH_DIAMETER_KM);
        // Brightest at the centre of the planet, dark at both surfaces.
        globe.setDrill(Math.sin(Math.PI * t));
      },
    });

    globe.setDrill(0);
    globe.setHighlight(hit ?? null);
    globe.setMarkers([
      { point: origin.point, kind: 'origin', label: 'You' },
      {
        point: target,
        kind: 'target',
        label: hit ? countryName(hit.properties.iso, hit.properties.name) : 'Open water',
      },
    ]);
    globe.setIdleSpin(false);

    const when = new Date();
    setResult({
      origin,
      target,
      country: hit ? { name: hit.properties.name, iso: hit.properties.iso } : null,
      water: hit ? null : waterName(target),
      coastline:
        coast && coast.country
          ? {
              distanceKm: coast.distanceKm,
              countryName: countryName(coast.country.properties.iso, coast.country.properties.name),
              bearing: bearingDeg(target, coast.point),
            }
          : null,
      town,
      majorCity,
      timeZone,
      clock: timeZone ? readClock(when, timeZone) : null,
    });
    setNow(when);
    setDepth(EARTH_DIAMETER_KM);
    setPhase('arrived');
  }, [origin]);

  const reset = useCallback(() => {
    const globe = globeRef.current;
    setPhase('idle');
    setResult(null);
    setDepth(0);
    if (!globe) return;
    globe.setHighlight(null);
    globe.setDrill(0);
    globe.setIdleSpin(true);
    if (origin) {
      globe.setMarkers([{ point: origin.point, kind: 'origin', label: 'You' }]);
      void globe.spinTo(origin.point, { duration: 1600, extraTurns: 0 });
    } else {
      globe.setMarkers([]);
    }
  }, [origin]);

  // Keep the clock on the result card ticking without redoing the lookup.
  const liveClock = useMemo(() => {
    if (!result?.timeZone || !now) return result?.clock ?? null;
    return readClock(now, result.timeZone) ?? result.clock;
  }, [result, now]);

  const targetLabel = result
    ? result.country
      ? countryName(result.country.iso, result.country.name)
      : result.water
    : null;

  const busy = phase === 'digging';

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <Link href="/projects" className="planetarium-breadcrumb">
          Back to Projects
        </Link>

        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Dig Through the Earth</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Flip your coordinates through the centre of the planet and find out who lives
            directly beneath your feet — 12,742 km straight down.
          </p>
        </div>

        <div className="antipode-layout">
          {/* ── Where you're digging from ───────────────────────────────── */}
          <section className="antipode-origin-card">
            <h2 className="antipode-card-title">Start from</h2>

            <div className="antipode-origin-readout">
              {origin ? (
                <>
                  <strong>{origin.label}</strong>
                  <span>{formatCoord(origin.point)}</span>
                </>
              ) : (
                <>
                  <strong>{locating ? 'Asking your browser…' : 'Nowhere yet'}</strong>
                  <span>{atlasReady ? 'Pick a starting point to dig from' : 'Loading the atlas…'}</span>
                </>
              )}
            </div>

            <button
              type="button"
              className="antipode-secondary-btn"
              onClick={() => requestDeviceLocation()}
              disabled={locating || busy}
            >
              {locating ? 'Locating…' : origin?.fromDevice ? 'Update my location' : 'Use my location'}
            </button>

            {locationError && <p className="antipode-note">{locationError}</p>}

            <div className="antipode-search">
              <label className="calc-label" htmlFor="antipode-search-input">
                Or type a city, town or village
              </label>
              <input
                id="antipode-search-input"
                className="calc-input"
                type="search"
                autoComplete="off"
                placeholder={atlasReady ? 'Shanghai, Reykjavík, Wagga Wagga…' : 'Loading 49,000 places…'}
                value={query}
                disabled={!atlasReady || busy}
                onChange={(event) => setQuery(event.target.value)}
              />
              {suggestions.length > 0 && (
                <ul className="antipode-suggestions">
                  {suggestions.map((city) => (
                    <li key={`${city.name}-${city.iso2}-${city.lat}-${city.lon}`}>
                      <button type="button" onClick={() => chooseCity(city)}>
                        <span>
                          {flagEmoji(city.iso2)} {city.name}
                        </span>
                        <span className="antipode-suggestion-meta">
                          {countryName(city.iso2, city.iso2)} · {formatPopulation(city.population)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="antipode-shortcuts">
              <span className="antipode-shortcut-label">Antipodes worth seeing</span>
              <div className="antipode-shortcut-row">
                {SHORTCUTS.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    type="button"
                    className="antipode-chip"
                    disabled={busy}
                    onClick={() => {
                      pickedByHand.current = true;
                      setOrigin({
                        point: shortcut.point,
                        label: describe(shortcut.point, shortcut.label),
                        fromDevice: false,
                      });
                      setPhase('idle');
                      setResult(null);
                    }}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="antipode-note antipode-privacy">
              Every lookup runs in this tab against map files the page downloads once.
              Your coordinates are never sent anywhere.
            </p>
          </section>

          {/* ── The globe ───────────────────────────────────────────────── */}
          <section className="antipode-globe-card">
            <div className="antipode-canvas-wrap">
              <canvas ref={canvasRef} className="antipode-canvas" />
              {busy && (
                <div className="antipode-depth" role="status" aria-live="polite">
                  <span className="antipode-depth-value">{Math.round(depth).toLocaleString()} km</span>
                  <span className="antipode-depth-layer">{layerFor(depth)}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="antipode-dig-btn"
              onClick={phase === 'arrived' ? reset : dig}
              disabled={!origin || !atlasReady || busy}
            >
              {busy
                ? 'Drilling…'
                : phase === 'arrived'
                  ? 'Climb back'
                  : 'Dig through the centre of the Earth'}
            </button>

            <p className="antipode-globe-hint">
              {busy ? 'Hold on.' : 'Drag the globe to spin it yourself.'}
            </p>
          </section>
        </div>

        {/* ── What you found ─────────────────────────────────────────────── */}
        {result && phase === 'arrived' && (
          <section className="antipode-result animate-in">
            <div className="antipode-result-headline">
              <span className="antipode-result-kicker">You surface in</span>
              <h2>
                {result.country && <span className="antipode-flag">{flagEmoji(result.country.iso)}</span>}
                {targetLabel}
              </h2>
              <p className="antipode-result-coords">{formatCoord(result.target)}</p>
              {result.country ? (
                result.town && (
                  <p className="antipode-result-sub">
                    {result.town.distanceKm < 5
                      ? `Right in ${result.town.city.name}.`
                      : `Nearest town: ${result.town.city.name}, ${formatKm(result.town.distanceKm)} ${compassWord(
                          bearingDeg(result.target, {
                            lat: result.town.city.lat,
                            lon: result.town.city.lon,
                          })
                        )}.`}
                  </p>
                )
              ) : (
                <p className="antipode-result-sub">
                  Open water — like about seven digs in ten.
                  {result.coastline &&
                    ` The nearest land is the coast of ${result.coastline.countryName}, roughly ${formatKm(
                      result.coastline.distanceKm
                    )} ${compassWord(result.coastline.bearing)}.`}
                </p>
              )}
            </div>

            <div className="antipode-fact-grid">
              <div className="antipode-fact">
                <span className="antipode-fact-label">Local time there</span>
                <span className="antipode-fact-value">
                  {liveClock ? liveClock.time : '—'}
                  {liveClock && (
                    <span className="antipode-fact-icon">{liveClock.isNight ? '🌙' : '☀️'}</span>
                  )}
                </span>
                <span className="antipode-fact-detail">
                  {liveClock
                    ? `${liveClock.weekday} ${liveClock.date} · ${liveClock.offsetLabel}`
                    : 'No time zone for this spot'}
                </span>
              </div>

              <div className="antipode-fact">
                <span className="antipode-fact-label">Nearest major city</span>
                <span className="antipode-fact-value">
                  {result.majorCity ? result.majorCity.city.name : '—'}
                </span>
                <span className="antipode-fact-detail">
                  {result.majorCity
                    ? `${countryName(result.majorCity.city.iso2, result.majorCity.city.iso2)} · ${formatPopulation(
                        result.majorCity.city.population
                      )} people · ${formatKm(result.majorCity.distanceKm)} away`
                    : 'Nothing over 100,000 within reach'}
                </span>
              </div>

              <div className="antipode-fact">
                <span className="antipode-fact-label">Nearest town</span>
                <span className="antipode-fact-value">{result.town ? result.town.city.name : '—'}</span>
                <span className="antipode-fact-detail">
                  {result.town
                    ? `${countryName(result.town.city.iso2, result.town.city.iso2)} · ${formatPopulation(
                        result.town.city.population
                      )} people · ${formatKm(result.town.distanceKm)} away`
                    : 'No settled place anywhere near'}
                </span>
              </div>

              <div className="antipode-fact">
                <span className="antipode-fact-label">Time zone</span>
                <span className="antipode-fact-value antipode-fact-value-small">
                  {result.timeZone ? zoneLabel(result.timeZone) : '—'}
                </span>
                <span className="antipode-fact-detail">
                  {!result.country
                    ? 'Open ocean keeps nautical time, one zone per 15° of longitude.'
                    : Math.abs(result.target.lat) > 15
                      ? `The seasons flip with the hemisphere — it is ${
                          result.target.lat >= 0 ? 'northern' : 'southern'
                        } summer there when it is winter where you stand.`
                      : 'Close enough to the equator that the seasons barely notice the hemisphere flip.'}
                </span>
              </div>

              <div className="antipode-fact">
                <span className="antipode-fact-label">Straight through</span>
                <span className="antipode-fact-value">{EARTH_DIAMETER_KM.toLocaleString()} km</span>
                <span className="antipode-fact-detail">
                  Against {HALF_CIRCUMFERENCE_KM.toLocaleString()} km the long way round the
                  surface — the hole saves you 37%.
                </span>
              </div>

              <div className="antipode-fact">
                <span className="antipode-fact-label">Fall time</span>
                <span className="antipode-fact-value">{GRAVITY_TRAIN_MINUTES.toFixed(0)} minutes</span>
                <span className="antipode-fact-detail">
                  Jump into a frictionless hole and you arrive in {GRAVITY_TRAIN_MINUTES.toFixed(1)} min
                  no matter where you dug, topping{' '}
                  {Math.round(GRAVITY_TRAIN_TOP_SPEED_KMH).toLocaleString()} km/h at the centre.
                  Earth&apos;s core is denser than that maths assumes, so really it is nearer{' '}
                  {GRAVITY_TRAIN_MINUTES_REALISTIC} min.
                </span>
              </div>
            </div>

            <p className="antipode-note">
              Digging from {result.origin.label} · {formatCoord(result.origin.point)} ·{' '}
              {formatKm(distanceKm(result.origin.point, result.target))} away over the surface.
            </p>
          </section>
        )}

        <section className="antipode-colophon">
          <h2 className="antipode-card-title">How it works</h2>
          <p>
            An antipode is the simplest calculation on this page: negate the latitude, swing the
            longitude half a turn, done. Everything after that is looking the answer up. The globe
            is an orthographic projection of Natural Earth&apos;s vector coastlines drawn on a
            canvas — rotating the projection is genuinely rotating the Earth, and the shadow across
            it is the real day/night terminator for this minute.
          </p>
          <p>
            Which country you land in is a point-in-polygon test against Natural Earth&apos;s 1:50m
            outlines; the nearest town and nearest major city come from 49,000 GeoNames places; the
            local time comes from the IANA time zone boundaries. All three files are downloaded once
            and queried in your browser, so there is no geocoding service in the loop — nothing to
            rate-limit, and nothing that learns where you are.
          </p>
          <p className="antipode-note">
            Coastlines are simplified, so a result within a few kilometres of a shore is a coin
            flip. Populations are GeoNames estimates. About 71% of the planet is ocean and land
            opposite land is rarer still — if you keep hitting water, that is the planet&apos;s
            fault, not the page&apos;s.
          </p>
        </section>
      </div>

      <Footer />
    </main>
  );
}
