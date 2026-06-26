import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';

/**
 * Geometry shared by every renderer. Each module is expanded into a `sub` x
 * `sub` grid of sub-cells (odd number; 3 = standard, higher = finer image).
 */
export interface GridSpec {
  /** Modules per side (no quiet zone). */
  n: number;
  /** Sub-cells per module side (odd: 3, 5, 7…). */
  sub: number;
  /** Index of the centre sub-cell ((sub-1)/2). */
  mid: number;
  /** Quiet-zone width in sub-cells. */
  quietSub: number;
  /** Total sub-cells per side including the quiet zone. */
  gridSide: number;
}

export function computeGrid(size: number, quietModules: number, sub = 3): GridSpec {
  const quietSub = quietModules * sub;
  return { n: size, sub, mid: (sub - 1) / 2, quietSub, gridSide: size * sub + 2 * quietSub };
}

/**
 * True when (dr, dc) is inside the central data "dot" that carries the true
 * module value; every other sub-cell follows the image. `core` is the dot's
 * half-width in sub-cells: 0 = a single centre cell (finest image, smallest
 * dot), larger = a bigger, more scannable dot. It is clamped to the module so
 * it can never exceed it. Detail (sub) sets image fineness; core sets dot size.
 */
function inCore(dr: number, dc: number, sub: number, core: number): boolean {
  const mid = (sub - 1) / 2;
  const cr = Math.max(0, Math.min(core, mid));
  return Math.abs(dr - mid) <= cr && Math.abs(dc - mid) <= cr;
}

/**
 * The single source of truth for whether a sub-cell is dark. Canvas and SVG
 * renderers both call this so their geometry — and therefore scannability — is
 * guaranteed identical.
 *
 * The centre sub-cell always carries the true module value. The surrounding
 * sub-cells follow the image when halftoning, except over protected function
 * patterns which stay solid.
 */
export function subCellDark(
  matrix: QrMatrix,
  sampler: ImageSampler | null | undefined,
  protectPatterns: boolean,
  r: number,
  c: number,
  dr: number,
  dc: number,
  sub = 3,
  core = 0,
): boolean {
  if (sampler && !inCore(dr, dc, sub, core) && !(protectPatterns && matrix.isFunction(r, c))) {
    return sampler.dark(r * sub + dr, c * sub + dc);
  }
  return matrix.get(r, c);
}

/* --------------------------------------------------------------- colour --- */

export type RGB = [number, number, number];

/**
 * Luminance bands that keep a coloured code scannable. A "dark" sub-cell is
 * forced no brighter than DARK_MAX; a "light" one no darker than LIGHT_MIN.
 * The ~80-level gap gives scanners reliable contrast regardless of hue.
 */
const DARK_MAX = 95;
const LIGHT_MIN = 175;
/** Identifier (finder/alignment/timing) dark cells clamp harder than data. */
const IDENTIFIER_DARK_MAX = 35;
/** Quantise channels so smooth image regions merge into runs (smaller SVGs). */
const QUANT = 12;

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const q = (v: number) => Math.max(0, Math.min(255, Math.round(v / QUANT) * QUANT));

/** Darken an image colour while keeping its hue — result reads as "dark". */
export function clampDark([r, g, b]: RGB, maxLum = DARK_MAX): RGB {
  const l = lum(r, g, b);
  const f = l > maxLum ? maxLum / Math.max(l, 1) : 1;
  return [q(r * f), q(g * f), q(b * f)];
}

/** Lighten an image colour while keeping its hue — result reads as "light". */
export function clampLight([r, g, b]: RGB): RGB {
  const allowed = 255 - LIGHT_MIN;
  const darkness = 255 - lum(r, g, b);
  const f = darkness > allowed ? allowed / Math.max(darkness, 1) : 1;
  return [q(255 - (255 - r) * f), q(255 - (255 - g) * f), q(255 - (255 - b) * f)];
}

export const rgbToHex = ([r, g, b]: RGB): string =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Brand mode's dark colour: the chosen brand colour darkened just enough to
 * read as "dark", so even a light brand colour (yellow, cyan…) stays scannable.
 */
export const brandDarkHex = (hex: string): string => rgbToHex(clampDark(hexToRgb(hex)));

/** Fraction of the carved centre region actually filled by the logo; the rest
 * is a quiet margin so the logo sits *inside* empty space, never touching live
 * modules. */
const LOGO_FILL = 0.72;

export interface CenterHole {
  /** Side of the carved-out (background-filled) square, in the caller's units. */
  holeSide: number;
  /** Side of the inner box the logo is contain-fitted into (< holeSide). */
  logoBox: number;
  /** Corner radius to use when a rounded plate is requested. */
  radius: number;
}

/**
 * Geometry for the empty region carved in the centre of the code to hold a
 * logo. The hole is snapped to an *odd* number of modules so its edges land on
 * module boundaries (crisp, deliberate-looking) and stay symmetric about the
 * centre module; the logo is then drawn smaller than the hole, leaving a real
 * quiet margin all around instead of being pasted over the modules.
 *
 * @param qrSide     QR side length (excluding quiet zone) in the caller's units
 * @param moduleUnit size of one module in those same units
 * @param ratio      requested logo size as a fraction of the QR side (0.1–0.3)
 */
export function centerHole(qrSide: number, moduleUnit: number, ratio: number): CenterHole {
  const r = Math.min(0.3, Math.max(0.1, ratio));
  let mods = Math.round((qrSide * r) / moduleUnit);
  if (mods % 2 === 0) mods += 1; // odd → edges align with module grid, symmetric
  mods = Math.max(3, mods);
  const holeSide = mods * moduleUnit;
  return { holeSide, logoBox: holeSide * LOGO_FILL, radius: holeSide * 0.16 };
}

/** How data cells are coloured. */
export type ColorStyle = 'solid' | 'brand' | 'image';

/* ------------------------------------------------------------ module shape --- */

/**
 * The shape each *dark module* is drawn as, for plain (non-halftone) codes:
 *  - square  : classic solid blocks (default).
 *  - dot     : a filled circle per data module; finder eyes become rings + a
 *              round pupil.
 *  - rounded : rounded-corner squares; finder eyes become rounded frames.
 *
 * Shapes are a cosmetic layer over the *block* renderer, so they only apply
 * when no image sampler is active (halftone already styles every sub-cell). To
 * stay scannable, the three finder patterns are drawn as one cohesive eye and
 * the timing/alignment patterns are kept as solid squares — a scanner samples
 * each module's centre, which every shape fills.
 */
export type ModuleShape = 'square' | 'dot' | 'rounded' | 'extra' | 'liquid';

/** How the three finder patterns ("eyes") are drawn. `auto` follows the module
 *  shape (dots → circular eyes, rounded/extra → rounded eyes, else square). */
export type EyeShape = 'auto' | 'square' | 'rounded' | 'circle';

/** Resolved (non-auto) eye shape, given the eye choice and the module shape. */
export function resolveEyeShape(eye: EyeShape, mod: ModuleShape): 'square' | 'rounded' | 'circle' {
  if (eye !== 'auto') return eye;
  if (mod === 'dot') return 'circle';
  if (mod === 'rounded' || mod === 'extra' || mod === 'liquid') return 'rounded';
  return 'square';
}

/** Corner radius as a fraction of the module side for each module shape (dots
 *  are drawn as circles, not rounded rects). Shared so canvas + SVG match. */
export const SHAPE_RX: Record<ModuleShape, number> = { square: 0, dot: 0, rounded: 0.32, extra: 0.46, liquid: 0.5 };

/* ------------------------------------------------------------ liquid paths --- */

/** Orthogonal-neighbour darkness used to decide where a liquid module merges. */
export interface Neigh {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const p3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * SVG path `d` for a "liquid" (connected) data module at (x, y), side `m`.
 * A corner is rounded by `rad` only when *both* of its adjacent edges are open
 * (neighbour light); a shared edge stays square so neighbours merge into one
 * smooth blob. The same string drives an SVG `<path d>` and a canvas `Path2D`,
 * so the two renderers are pixel-identical.
 */
export function liquidModulePath(x: number, y: number, m: number, nb: Neigh, rad: number): string {
  const r = Math.min(rad, m / 2);
  const tl = !nb.up && !nb.left ? r : 0;
  const tr = !nb.up && !nb.right ? r : 0;
  const br = !nb.down && !nb.right ? r : 0;
  const bl = !nb.down && !nb.left ? r : 0;
  const a = (rr: number, ex: number, ey: number) => (rr ? ` A ${p3(rr)} ${p3(rr)} 0 0 1 ${p3(ex)} ${p3(ey)}` : '');
  let d = `M ${p3(x + tl)} ${p3(y)}`;
  d += ` L ${p3(x + m - tr)} ${p3(y)}` + a(tr, x + m, y + tr);
  d += ` L ${p3(x + m)} ${p3(y + m - br)}` + a(br, x + m - br, y + m);
  d += ` L ${p3(x + bl)} ${p3(y + m)}` + a(bl, x, y + m - bl);
  d += ` L ${p3(x)} ${p3(y + tl)}` + a(tl, x + tl, y);
  return d + ' Z';
}

/** A primitive to draw for a liquid code: a solid square or a filled path. */
export type LiquidOp = { square: true; x: number; y: number; m: number } | { square: false; d: string };

/**
 * All geometry for a liquid (connected-blob) code, in the caller's coordinate
 * system (origin + module size `m`). Data modules merge into smooth blobs;
 * timing/alignment stay solid squares; finder patterns are skipped (drawn as
 * styled eyes). Concave fillets round the inner armpits of L-junctions. Both
 * renderers consume this list, so canvas and SVG are identical.
 */
export function liquidOps(
  matrix: { size: number; get(r: number, c: number): boolean; isFunction(r: number, c: number): boolean },
  n: number,
  ox: number,
  oy: number,
  m: number,
  rad: number,
): LiquidOp[] {
  const dark = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && matrix.get(r, c) && !inFinder(r, c, n);
  const dataDark = (r: number, c: number) => dark(r, c) && !matrix.isFunction(r, c);
  const ops: LiquidOp[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = ox + c * m;
      const y = oy + r * m;
      if (dark(r, c)) {
        if (matrix.isFunction(r, c)) {
          ops.push({ square: true, x, y, m });
        } else {
          const nb = { up: dark(r - 1, c), down: dark(r + 1, c), left: dark(r, c - 1), right: dark(r, c + 1) };
          ops.push({ square: false, d: liquidModulePath(x, y, m, nb, rad) });
        }
        continue;
      }
      // Light data cell: round the inner armpit at any corner where both
      // orthogonal neighbours and the diagonal are dark data, unless the cell is
      // fully enclosed (which would erase a genuine light hole).
      if (matrix.isFunction(r, c) || inFinder(r, c, n)) continue;
      const u = dataDark(r - 1, c), d = dataDark(r + 1, c), l = dataDark(r, c - 1), ri = dataDark(r, c + 1);
      const enclosed = u && d && l && ri;
      if (enclosed) continue;
      if (u && ri && dataDark(r - 1, c + 1)) ops.push({ square: false, d: liquidFilletPath(x, y, m, 'tr', rad) });
      if (u && l && dataDark(r - 1, c - 1)) ops.push({ square: false, d: liquidFilletPath(x, y, m, 'tl', rad) });
      if (d && ri && dataDark(r + 1, c + 1)) ops.push({ square: false, d: liquidFilletPath(x, y, m, 'br', rad) });
      if (d && l && dataDark(r + 1, c - 1)) ops.push({ square: false, d: liquidFilletPath(x, y, m, 'bl', rad) });
    }
  }
  return ops;
}

/** Which corner of a light cell a concave fillet rounds. */
export type Corner = 'tl' | 'tr' | 'br' | 'bl';

/**
 * Dark concave fillet that fills a light cell's corner where the two orthogonal
 * neighbours are dark — it rounds the inner "armpit" of a blob so L-junctions
 * read as smooth rather than notched.
 */
export function liquidFilletPath(x: number, y: number, m: number, corner: Corner, rad: number): string {
  const r = Math.min(rad, m / 2);
  const A = (cx: number, cy: number, sx: number, sy: number, ex: number, ey: number) =>
    `M ${p3(sx)} ${p3(sy)} L ${p3(cx)} ${p3(cy)} L ${p3(ex)} ${p3(ey)} A ${p3(r)} ${p3(r)} 0 0 0 ${p3(sx)} ${p3(sy)} Z`;
  switch (corner) {
    case 'tr':
      return A(x + m, y, x + m - r, y, x + m, y + r);
    case 'tl':
      return A(x, y, x, y + r, x + r, y);
    case 'br':
      return A(x + m, y + m, x + m, y + m - r, x + m - r, y + m);
    case 'bl':
      return A(x, y + m, x + r, y + m, x, y + m - r);
  }
}
/** Corner radius as a fraction of a finder-eye layer side, for rounded eyes. */
export const EYE_RX = 0.28;

/** The three concentric layers of a finder eye, as fractions of a module: an
 *  outer frame (7), a cleared gap (5) and the centre pupil (3). */
export const EYE_LAYERS: Array<{ inset: number; size: number; dark: boolean }> = [
  { inset: 0, size: 7, dark: true },
  { inset: 1, size: 5, dark: false },
  { inset: 2, size: 3, dark: true },
];

/** Top-left corner (module coords) of each 7×7 finder/position pattern. */
export function finderOrigins(n: number): Array<[number, number]> {
  return [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
}

/** True when module (r, c) falls inside one of the three 7×7 finder patterns. */
export function inFinder(r: number, c: number, n: number): boolean {
  for (const [fr, fc] of finderOrigins(n)) {
    if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) return true;
  }
  return false;
}

/** Paint colour for a whole module in the block (non-halftone) renderer. */
export function moduleColor(dark: boolean, opts: Pick<FillOpts, 'style' | 'fg' | 'bg' | 'brand'>): string {
  if (!dark) return opts.bg;
  return opts.style === 'brand' ? opts.brand : opts.fg;
}

/**
 * Half-width (in sub-cell units) of the solid data dot drawn at a halftone
 * module's centre. `scale` is a continuous 0–1 control so the dot grows
 * *linearly*, independent of the sub-cell granularity:
 *   - 0 → half a sub-cell (a single centre cell — finest image, smallest dot)
 *   - 1 → half a module (the whole module solid — most scannable)
 * This replaces the old integer sub-cell "core", which could only step in whole
 * sub-cells (just two usable sizes at standard detail).
 */
export function dotHalfWidth(sub: number, scale: number): number {
  const s = Math.max(0, Math.min(1, scale));
  return 0.5 + s * (sub / 2 - 0.5);
}

export interface FillOpts {
  style: ColorStyle;
  fg: string;
  bg: string;
  /** Pre-clamped dark colour used by brand mode (see brandDarkHex). */
  brand: string;
  protectPatterns: boolean;
  /** Half-width (in sub-cells) of the protected data dot at each module centre.
   *  0 (default) = a single cell / finest image; larger = bigger, more
   *  scannable dots. Only affects halftone (a sampler is present). */
  core?: number;
}

/**
 * The single source of truth for a sub-cell's paint colour, shared by the
 * canvas and SVG renderers.
 *  - solid : plain fg / bg.
 *  - brand : every dark cell → the (clamped) brand colour, light cells → bg.
 *  - image : everything takes the image's hue, clamped into the dark/light band
 *            so it still scans — including the identifier (finder/alignment/
 *            timing) patterns. The only exception is the centre sub-cell of a
 *            *data* module (the point a scanner samples), kept at full fg/bg
 *            contrast for margin. Identifier patterns are darkened harder so a
 *            dark identifier cell over a light image area stays detectable.
 */
export function subCellFill(
  matrix: QrMatrix,
  sampler: ImageSampler | null | undefined,
  opts: FillOpts,
  r: number,
  c: number,
  dr: number,
  dc: number,
  sub = 3,
): string {
  const core = opts.core ?? 0;
  const dark = subCellDark(matrix, sampler, opts.protectPatterns, r, c, dr, dc, sub, core);

  if (opts.style === 'brand') {
    return dark ? opts.brand : opts.bg;
  }

  if (opts.style === 'image' && sampler?.colorAt) {
    const isFn = matrix.isFunction(r, c);
    if (isFn || !inCore(dr, dc, sub, core)) {
      const rgb = sampler.colorAt(r * sub + dr, c * sub + dc);
      // Identifier patterns get a stronger dark clamp for reliable detection.
      return rgbToHex(dark ? clampDark(rgb, isFn ? IDENTIFIER_DARK_MAX : DARK_MAX) : clampLight(rgb));
    }
  }

  return dark ? opts.fg : opts.bg;
}
