// ── The globe ────────────────────────────────────────────────────────────────
// An orthographic projection on a 2D canvas: the same view you get looking at a
// real globe from far away, so rotating the projection *is* spinning the Earth.
// No WebGL and no texture to download — the outlines are vector data, which
// stays sharp on a retina screen and is a fraction of the size of an image.
//
// d3-geo does the projection and the horizon clipping (the fiddly part: a
// country straddling the edge has to be cut along the limb, not just dropped).
// Everything else here is shading to sell the sphere: a light source up and to
// the left, a darkened limb, an atmosphere halo, and the real day/night
// terminator for the moment you're looking at it.

import { geoOrthographic, geoPath, geoGraticule10, geoCircle, geoDistance } from 'd3-geo';
import type { GeoProjection, GeoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';

import { type Point, subsolarPoint, antipodeOf } from './antipode';
import type { GlobeShapes } from './atlas';

export interface GlobeMarker {
  point: Point;
  kind: 'origin' | 'target';
  label: string;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

const COLORS = {
  space: '#080b1c',
  ocean: ['#2f6fd0', '#1b47a0', '#0e2560'],
  land: ['#3ec98a', '#1f9d6b'],
  landEdge: 'rgba(8, 24, 20, 0.45)',
  border: 'rgba(255, 255, 255, 0.22)',
  graticule: 'rgba(190, 215, 255, 0.16)',
  highlight: '#fdcb6e',
  origin: '#00e5c0',
  target: '#ff4d8d',
  atmosphere: '108, 160, 255',
};

const TAU = Math.PI * 2;

/** Eases in and out symmetrically: a heavy object getting up to speed and back. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface SpinOptions {
  /** Milliseconds for the whole move. */
  duration?: number;
  /** Full extra revolutions to throw in before settling. */
  extraTurns?: number;
  /** 0–1 progress callback, for the depth counter. */
  onProgress?: (t: number) => void;
}

export class Globe {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projection: GeoProjection;
  private path: GeoPath;
  private frame: number | null = null;
  private stars: Star[] = [];
  private size = 0;
  private radius = 0;

  private shapes: GlobeShapes | null = null;
  private highlight: Feature<Geometry> | null = null;
  private markers: GlobeMarker[] = [];

  /** [λ, φ] handed straight to the projection; the visible centre is its negation. */
  private rotation: [number, number] = [0, -15];
  private spin: {
    from: [number, number];
    to: [number, number];
    start: number;
    duration: number;
    onProgress?: (t: number) => void;
    resolve: () => void;
  } | null = null;

  private idleSpin = true;
  private dragging = false;
  private lastPointer: { x: number; y: number } | null = null;
  private velocity = 0;
  private lastTime = 0;
  private reducedMotion = false;
  /** 0–1: how lit up the bore hole at the centre is. */
  private drill = 0;
  private nightCentre: [number, number] | null = null;
  private nightComputedAt = -Infinity;
  private observer: ResizeObserver | null = null;
  private onRotate: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    this.ctx = ctx;
    this.projection = geoOrthographic().clipAngle(90).precision(0.4);
    this.path = geoPath(this.projection, ctx);

    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement ?? canvas);
    this.attachDrag();
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────

  setShapes(shapes: GlobeShapes) {
    this.shapes = shapes;
  }

  setHighlight(feature: Feature<Geometry> | null) {
    this.highlight = feature;
  }

  setMarkers(markers: GlobeMarker[]) {
    this.markers = markers;
  }

  setIdleSpin(on: boolean) {
    this.idleSpin = on;
  }

  setDrill(amount: number) {
    this.drill = amount;
  }

  onRotated(callback: (() => void) | null) {
    this.onRotate = callback;
  }

  /** The geographic point currently facing the viewer. */
  get centre(): Point {
    return { lat: -this.rotation[1], lon: -this.rotation[0] };
  }

  /** Jump, no animation. */
  centreOn(point: Point) {
    this.spin = null;
    this.rotation = [-point.lon, -point.lat];
    this.velocity = 0;
  }

  /**
   * Turn the globe until `point` faces the viewer. Resolves when it lands.
   * The extra turns exist purely because a half-turn on its own doesn't read as
   * "all the way through" — you want to watch the whole planet go past.
   */
  spinTo(point: Point, options: SpinOptions = {}): Promise<void> {
    const { duration = 3200, extraTurns = 1, onProgress } = options;
    const from: [number, number] = [this.rotation[0], this.rotation[1]];

    // Take the short way round in longitude, then pad it with whole turns.
    let deltaLon = (-point.lon - from[0]) % 360;
    if (deltaLon > 180) deltaLon -= 360;
    if (deltaLon < -180) deltaLon += 360;
    const direction = deltaLon === 0 ? 1 : Math.sign(deltaLon);
    const to: [number, number] = [from[0] + deltaLon + direction * 360 * extraTurns, -point.lat];

    this.velocity = 0;
    if (this.reducedMotion) {
      this.rotation = [to[0], to[1]];
      onProgress?.(1);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.spin = { from, to, start: performance.now(), duration, onProgress, resolve };
    });
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  start() {
    if (this.frame !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.frame = requestAnimationFrame(tick);
      this.step(now);
      this.draw(now);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  destroy() {
    this.stop();
    this.observer?.disconnect();
    this.observer = null;
    this.detachDrag();
  }

  private step(now: number) {
    const dt = Math.min(100, now - this.lastTime);
    this.lastTime = now;

    if (this.spin) {
      const t = Math.min(1, (now - this.spin.start) / this.spin.duration);
      const eased = easeInOutCubic(t);
      this.rotation = [
        this.spin.from[0] + (this.spin.to[0] - this.spin.from[0]) * eased,
        this.spin.from[1] + (this.spin.to[1] - this.spin.from[1]) * eased,
      ];
      this.spin.onProgress?.(t);
      if (t >= 1) {
        const done = this.spin.resolve;
        this.spin = null;
        done();
      }
      this.onRotate?.();
      return;
    }

    if (this.dragging) return;

    if (Math.abs(this.velocity) > 0.002) {
      // Flick inertia, bled off over about a second.
      this.rotation[0] += this.velocity * dt;
      this.velocity *= Math.pow(0.9, dt / 16);
      this.onRotate?.();
    } else if (this.idleSpin && !this.reducedMotion) {
      this.rotation[0] += (dt / 1000) * 3;
      this.onRotate?.();
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private resize() {
    const parent = this.canvas.parentElement;
    const available = parent?.clientWidth || this.canvas.clientWidth || 480;
    const size = Math.max(240, Math.min(available, 560));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;

    this.size = size;
    this.radius = size / 2 - size * 0.055;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.projection.translate([size / 2, size / 2]).scale(this.radius);
    this.stars = this.makeStars(size);
  }

  private makeStars(size: number): Star[] {
    const count = Math.round((size * size) / 2600);
    return Array.from({ length: count }, () => ({
      x: Math.random() * size,
      y: Math.random() * size,
      r: 0.4 + Math.random() * 1.1,
      phase: Math.random() * TAU,
    }));
  }

  private draw(now: number) {
    const { ctx, size, radius } = this;
    const cx = size / 2;
    const cy = size / 2;
    this.projection.rotate([this.rotation[0], this.rotation[1], 0]);

    ctx.clearRect(0, 0, size, size);

    // Space, and a field of stars that breathe just enough to be alive.
    ctx.fillStyle = COLORS.space;
    ctx.fillRect(0, 0, size, size);
    for (const star of this.stars) {
      const twinkle = this.reducedMotion ? 0.55 : 0.4 + 0.35 * Math.sin(now / 900 + star.phase);
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Atmosphere: a halo sitting just outside the limb.
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.94, cx, cy, radius * 1.16);
    halo.addColorStop(0, `rgba(${COLORS.atmosphere}, 0.42)`);
    halo.addColorStop(0.45, `rgba(${COLORS.atmosphere}, 0.14)`);
    halo.addColorStop(1, `rgba(${COLORS.atmosphere}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.16, 0, TAU);
    ctx.fill();

    // Ocean. The off-centre gradient is what makes a flat disc read as a ball.
    const sea = ctx.createRadialGradient(
      cx - radius * 0.35,
      cy - radius * 0.35,
      radius * 0.05,
      cx,
      cy,
      radius
    );
    sea.addColorStop(0, COLORS.ocean[0]);
    sea.addColorStop(0.55, COLORS.ocean[1]);
    sea.addColorStop(1, COLORS.ocean[2]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.fillStyle = sea;
    ctx.fill();

    // Everything geographic is clipped to the disc so nothing bleeds into space.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.clip();

    ctx.strokeStyle = COLORS.graticule;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    this.path(geoGraticule10());
    ctx.stroke();

    if (this.shapes) {
      const green = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      green.addColorStop(0, COLORS.land[0]);
      green.addColorStop(1, COLORS.land[1]);
      ctx.beginPath();
      this.path(this.shapes.land);
      ctx.fillStyle = green;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = COLORS.landEdge;
      ctx.stroke();
    }

    if (this.shapes) {
      ctx.beginPath();
      this.path(this.shapes.borders);
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    this.drawNight(now);

    // The country you landed in is painted over the night shading — otherwise
    // it vanishes whenever it happens to be 3am there, which is exactly when
    // the antipode of a sunny afternoon is.
    if (this.highlight) {
      ctx.beginPath();
      this.path(this.highlight);
      ctx.fillStyle = 'rgba(253, 203, 110, 0.5)';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = COLORS.highlight;
      ctx.stroke();
    }

    // Limb shading — dark rim, bright flank, which is most of the 3D.
    const shade = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      radius * 0.25,
      cx,
      cy,
      radius * 1.02
    );
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.85, 'rgba(0, 0, 10, 0.35)');
    shade.addColorStop(1, 'rgba(0, 0, 10, 0.62)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);

    if (this.drill > 0) this.drawBore(cx, cy, now);

    ctx.restore();

    // Rim light around the edge of the disc.
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.strokeStyle = `rgba(${COLORS.atmosphere}, 0.75)`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    for (const marker of this.markers) this.drawMarker(marker, now);
  }

  /**
   * The unlit half: a 90° cap centred on the antisolar point, which is exactly
   * what night is. Two caps, one inside the other, so the terminator reads as a
   * band of dusk rather than a hard edge.
   */
  private drawNight(now: number) {
    // The subsolar point drifts a quarter of a degree a minute; recomputing it
    // sixty times a second would be wasted work.
    if (now - this.nightComputedAt > 10_000 || !this.nightCentre) {
      const dark = antipodeOf(subsolarPoint(new Date()));
      this.nightCentre = [dark.lon, dark.lat];
      this.nightComputedAt = now;
    }

    for (const [radius, fill] of [
      [90, 'rgba(4, 8, 28, 0.55)'],
      [83, 'rgba(4, 8, 28, 0.3)'],
    ] as const) {
      this.ctx.beginPath();
      this.path(geoCircle().center(this.nightCentre).radius(radius)());
      this.ctx.fillStyle = fill;
      this.ctx.fill();
    }
  }

  /** The hole, glowing hotter the deeper the dig has gone. */
  private drawBore(cx: number, cy: number, now: number) {
    const { ctx, radius } = this;
    const pulse = 0.85 + 0.15 * Math.sin(now / 140);
    const r = radius * 0.16 * this.drill * pulse;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r * 3));
    glow.addColorStop(0, `rgba(255, 245, 210, ${0.95 * this.drill})`);
    glow.addColorStop(0.25, `rgba(255, 170, 60, ${0.8 * this.drill})`);
    glow.addColorStop(0.6, `rgba(220, 60, 40, ${0.35 * this.drill})`);
    glow.addColorStop(1, 'rgba(220, 60, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3, 0, TAU);
    ctx.fill();
  }

  private drawMarker(marker: GlobeMarker, now: number) {
    const { ctx } = this;
    const coords: [number, number] = [marker.point.lon, marker.point.lat];
    const projected = this.projection(coords);
    if (!projected) return;

    // A point is on the far side once it's more than a quarter turn from the
    // centre; fade the last few degrees so markers don't pop at the edge.
    const away = geoDistance(coords, [this.centre.lon, this.centre.lat]);
    const limb = Math.PI / 2;
    if (away > limb) return;
    const alpha = Math.min(1, (limb - away) / 0.16);

    const [x, y] = projected;
    const colour = marker.kind === 'origin' ? COLORS.origin : COLORS.target;

    ctx.save();
    ctx.globalAlpha = alpha;

    const pulse = this.reducedMotion ? 1 : 1 + 0.35 * Math.sin(now / 360);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 16 * pulse);
    halo.addColorStop(0, `${colour}bb`);
    halo.addColorStop(1, `${colour}00`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 16 * pulse, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, TAU);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();

    if (marker.label) {
      ctx.font = '600 12px var(--font-inter), system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const width = ctx.measureText(marker.label).width;
      const boxY = y - 14;
      ctx.fillStyle = 'rgba(8, 11, 28, 0.78)';
      ctx.beginPath();
      ctx.roundRect(x - width / 2 - 7, boxY - 16, width + 14, 19, 9);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(marker.label, x, boxY + 1);
    }

    ctx.restore();
  }

  // ── Dragging ───────────────────────────────────────────────────────────────

  private onPointerDown = (event: PointerEvent) => {
    if (this.spin) return;
    this.dragging = true;
    this.velocity = 0;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.style.cursor = 'grabbing';
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging || !this.lastPointer) return;
    event.preventDefault();
    // One radius of travel is a quarter turn, which is how a real globe feels.
    const scale = 90 / this.radius;
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.rotation[0] += dx * scale;
    this.rotation[1] = Math.max(-90, Math.min(90, this.rotation[1] - dy * scale));
    this.velocity = (dx * scale) / 16;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.onRotate?.();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    this.lastPointer = null;
    this.canvas.style.cursor = 'grab';
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private attachDrag() {
    this.canvas.style.cursor = 'grab';
    this.canvas.style.touchAction = 'pan-y';
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  private detachDrag() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }
}
