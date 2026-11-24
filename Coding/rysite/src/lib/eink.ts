// ── The UV meter's e-ink screen, drawn the way the meter draws it ─────────────
// A port of the Adafruit GFX calls that uv_meter_v1_1.ino makes — the classic
// 5×7 font, drawCircle, fillCircle and fillTriangle (Adafruit GFX Library, BSD
// licence, © Adafruit Industries) — onto a 250 × 122 framebuffer like the 2.13"
// tri-color panel's. drawAviators() follows the sketch line for line, with its
// 32-bit float arithmetic, so the site shows what the device shows.
//
// Runs at build time: the browser only receives the finished SVG paths.

export const EINK_W = 250;
export const EINK_H = 122;

/** Path data per ink. `dither` is filled with a 2 × 1 one-pixel-on pattern. */
export interface EinkPaths {
  black: string;
  red: string;
  dither: string;
}

const WHITE = 0;
const BLACK = 1;
const RED = 2;
type Ink = typeof WHITE | typeof BLACK | typeof RED;

/** C floats are 32-bit; rounding through this keeps the lens edges identical. */
const f = Math.fround;
/** C integer division truncates toward zero. */
const idiv = (a: number, b: number) => Math.trunc(a / b);

// glcdfont.c: five column bytes per character, bit 0 = the top row.
const GLYPHS: Record<string, number[]> = {
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x72, 0x49, 0x49, 0x49, 0x46],
  '3': [0x21, 0x41, 0x49, 0x4d, 0x33],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x31],
  '7': [0x41, 0x21, 0x11, 0x09, 0x07],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x46, 0x49, 0x49, 0x29, 0x1e],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
};

class Panel {
  readonly px = new Uint8Array(EINK_W * EINK_H);
  /**
   * The lens dither, kept as spans instead of pixels: the sketch inks only even
   * columns of even rows, which is exactly a 2 × 1 pattern anchored at x = 0,
   * so one span per row draws the same pixels as ~40 separate dots. Nothing
   * draws white over a lens after its dither, so layering it under the black
   * and red paths matches the framebuffer.
   */
  readonly ditherSpans: string[] = [];

  ditherSpan(x: number, y: number, w: number) {
    if (w > 0 && y % 2 === 0) this.ditherSpans.push(`M${x} ${y}h${w}v1h-${w}z`);
  }

  pixel(x: number, y: number, c: Ink) {
    if (x >= 0 && y >= 0 && x < EINK_W && y < EINK_H) this.px[y * EINK_W + x] = c;
  }

  hline(x: number, y: number, w: number, c: Ink) {
    for (let i = 0; i < w; i++) this.pixel(x + i, y, c);
  }

  vline(x: number, y: number, h: number, c: Ink) {
    for (let i = 0; i < h; i++) this.pixel(x, y + i, c);
  }

  fillRect(x: number, y: number, w: number, h: number, c: Ink) {
    for (let j = 0; j < h; j++) this.hline(x, y + j, w, c);
  }

  drawRect(x: number, y: number, w: number, h: number, c: Ink) {
    this.hline(x, y, w, c);
    this.hline(x, y + h - 1, w, c);
    this.vline(x, y, h, c);
    this.vline(x + w - 1, y, h, c);
  }

  drawCircle(x0: number, y0: number, r: number, c: Ink) {
    let f_ = 1 - r, ddFx = 1, ddFy = -2 * r, x = 0, y = r;
    this.pixel(x0, y0 + r, c);
    this.pixel(x0, y0 - r, c);
    this.pixel(x0 + r, y0, c);
    this.pixel(x0 - r, y0, c);
    while (x < y) {
      if (f_ >= 0) { y--; ddFy += 2; f_ += ddFy; }
      x++; ddFx += 2; f_ += ddFx;
      for (const [dx, dy] of [[x, y], [-x, y], [x, -y], [-x, -y], [y, x], [-y, x], [y, -x], [-y, -x]]) {
        this.pixel(x0 + dx, y0 + dy, c);
      }
    }
  }

  /** fillCircle → fillCircleHelper(corners = 3, delta = 0), whose delta++ makes spans 2y + 1. */
  fillCircle(x0: number, y0: number, r: number, c: Ink) {
    this.vline(x0, y0 - r, 2 * r + 1, c);
    let f_ = 1 - r, ddFx = 1, ddFy = -2 * r, x = 0, y = r, px = x, py = y;
    while (x < y) {
      if (f_ >= 0) { y--; ddFy += 2; f_ += ddFy; }
      x++; ddFx += 2; f_ += ddFx;
      if (x < y + 1) {
        this.vline(x0 + x, y0 - y, 2 * y + 1, c);
        this.vline(x0 - x, y0 - y, 2 * y + 1, c);
      }
      if (y !== py) {
        this.vline(x0 + py, y0 - px, 2 * px + 1, c);
        this.vline(x0 - py, y0 - px, 2 * px + 1, c);
        py = y;
      }
      px = x;
    }
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Ink) {
    // Sort by y (y2 >= y1 >= y0).
    if (y0 > y1) { [y0, y1] = [y1, y0]; [x0, x1] = [x1, x0]; }
    if (y1 > y2) { [y2, y1] = [y1, y2]; [x2, x1] = [x1, x2]; }
    if (y0 > y1) { [y0, y1] = [y1, y0]; [x0, x1] = [x1, x0]; }
    if (y0 === y2) {
      let a = x0, b = x0;
      if (x1 < a) a = x1; else if (x1 > b) b = x1;
      if (x2 < a) a = x2; else if (x2 > b) b = x2;
      this.hline(a, y0, b - a + 1, c);
      return;
    }
    const dx01 = x1 - x0, dy01 = y1 - y0, dx02 = x2 - x0, dy02 = y2 - y0, dx12 = x2 - x1, dy12 = y2 - y1;
    let sa = 0, sb = 0, y = y0;
    const last = y1 === y2 ? y1 : y1 - 1;
    for (; y <= last; y++) {
      let a = x0 + idiv(sa, dy01), b = x0 + idiv(sb, dy02);
      sa += dx01; sb += dx02;
      if (a > b) [a, b] = [b, a];
      this.hline(a, y, b - a + 1, c);
    }
    sa = dx12 * (y - y1);
    sb = dx02 * (y - y0);
    for (; y <= y2; y++) {
      let a = x1 + idiv(sa, dy12), b = x0 + idiv(sb, dy02);
      sa += dx12; sb += dx02;
      if (a > b) [a, b] = [b, a];
      this.hline(a, y, b - a + 1, c);
    }
  }

  /** print() with the built-in font: each set bit is a size × size block; 6 × size advance. */
  text(x: number, y: number, s: string, size: number, c: Ink) {
    for (const ch of s) {
      const cols = GLYPHS[ch];
      if (!cols) throw new Error(`No glyph for "${ch}"`);
      cols.forEach((col, i) => {
        for (let j = 0; j < 8; j++) if ((col >> j) & 1) this.fillRect(x + i * size, y + j * size, size, size, c);
      });
      x += 6 * size;
    }
  }

  /** Each colour's pixels as one SVG path of horizontal runs. */
  toPaths(): EinkPaths {
    const out: Record<number, string[]> = { [BLACK]: [], [RED]: [] };
    for (let y = 0; y < EINK_H; y++) {
      let x = 0;
      while (x < EINK_W) {
        const c = this.px[y * EINK_W + x];
        let end = x + 1;
        while (end < EINK_W && this.px[y * EINK_W + end] === c) end++;
        if (c !== WHITE) out[c].push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
        x = end;
      }
    }
    return { black: out[BLACK].join(''), red: out[RED].join(''), dither: this.ditherSpans.join('') };
  }
}

// ── From uv_meter_v1_1.ino ─────────────────────────────────────────────────────

/** lensShape(): a teardrop aviator lens, scanline by scanline. Mode 1 is the 25% dither. */
function lensShape(p: Panel, x: number, y: number, w: number, h: number, flip: boolean, color: Ink, mode: 0 | 1) {
  const r = f(h * f(0.24));
  for (let j = 0; j < h; j++) {
    const t = f(j / (h - 1));
    const inset = j < r ? f(r - f(Math.sqrt(f(r * r - f((r - j) * (r - j)))))) : 0;
    let taper = 0;
    const lean = f(f(t * t) * f(w * f(0.1)));
    if (t > f(0.45)) {
      const u = f(f(t - f(0.45)) / f(0.55));
      taper = f(f(Math.pow(u, f(1.7))) * f(w * f(0.55)));
    }
    const L = flip ? f(f(x + inset) + taper) : f(f(x + inset) + lean);
    const R = flip ? f(f(x + w - inset) - lean) : f(f(x + w - inset) - taper);
    if (f(R - L) < 1) continue;
    if (mode === 0) p.hline(Math.trunc(L), y + j, Math.trunc(f(R - L)), color);
    // Sketch: for px in [(int)L, (int)R): if px even and row even, drawPixel.
    else p.ditherSpan(Math.trunc(L), y + j, Math.trunc(R) - Math.trunc(L));
  }
}

function drawLens(p: Panel, x: number, y: number, w: number, h: number, flip: boolean, gray: boolean) {
  lensShape(p, x, y, w, h, flip, BLACK, 0);
  lensShape(p, x + 3, y + 3, w - 6, h - 6, flip, WHITE, 0);
  if (gray) lensShape(p, x + 3, y + 3, w - 6, h - 6, flip, BLACK, 1);
}

function drawHeart(p: Panel, cx: number, cy: number, s: number) {
  p.fillCircle(cx - idiv(s, 3), cy, idiv(s, 3) + 1, RED);
  p.fillCircle(cx + idiv(s, 3), cy, idiv(s, 3) + 1, RED);
  p.fillTriangle(cx - idiv(s * 2, 3) - 1, cy + 1, cx + idiv(s * 2, 3) + 1, cy + 1, cx, cy + s, RED);
}

function drawFlames(p: Panel, cx: number, cy: number) {
  p.fillTriangle(cx - 6, cy, cx - 3, cy - 9, cx, cy, RED);
  p.fillTriangle(cx - 1, cy, cx + 3, cy - 12, cx + 6, cy, RED);
}

/** Screen 1, "giant aviators": the UV index, one digit per lens. */
function drawAviators(p: Panel, uviIn: number, batteryPct: number) {
  const uvi = f(uviIn);
  const gray = uvi > 3.0;
  const digitCol: Ink = uvi >= 8.0 ? RED : BLACK;

  drawLens(p, 22, 30, 92, 62, false, gray);
  drawLens(p, 136, 30, 92, 62, true, gray);
  p.fillRect(114, 40, 22, 4, BLACK); // double bridge
  p.fillRect(114, 50, 22, 3, BLACK);

  let d1: number, d2: number, showDot: boolean;
  if (uvi < 10) {
    d1 = Math.trunc(uvi);
    d2 = Math.trunc(f(uvi * 10)) % 10;
    showDot = true;
  } else {
    const u = Math.min(Math.trunc(f(uvi + f(0.5))), 19);
    d1 = idiv(u, 10);
    d2 = u % 10;
    showDot = false;
  }
  p.text(50, 38, String(d1), 6, digitCol);
  p.text(164, 38, String(d2), 6, digitCol);
  if (showDot) p.fillCircle(125, 86, 4, digitCol);

  p.drawRect(4, 4, 32, 13, BLACK); // battery
  p.fillRect(36, 7, 3, 7, BLACK);
  p.text(8, 7, `${batteryPct}%`, 1, BLACK);

  if (uvi >= 3.0) { // hearts join the party at 3+
    drawHeart(p, 12, 104, 9);
    drawHeart(p, 238, 104, 9);
    if (uvi >= 9.0) { // and catch fire at 9+
      drawFlames(p, 12, 96);
      drawFlames(p, 238, 96);
    }
  }
}

function drawPageDots(p: Panel, screenIdx: number) {
  for (let i = 0; i < 3; i++) {
    if (i === screenIdx) p.fillCircle(226 + i * 10, 116, 2, BLACK);
    else p.drawCircle(226 + i * 10, 116, 2, BLACK);
  }
}

/** The aviators screen at a given UV index, as SVG path data. */
export function aviatorsScreen(uvi: number, batteryPct = 82): EinkPaths {
  const p = new Panel();
  drawAviators(p, uvi, batteryPct);
  drawPageDots(p, 0);
  return p.toPaths();
}
