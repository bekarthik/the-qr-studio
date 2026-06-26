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
 * Half-width of the central "data core" that carries the true module value
 * (the rest of the module follows the image). At the standard 3x3 detail this
 * is a single centre cell; at higher detail we keep a 3x3 core so a data module
 * over a same-brightness image area still reads correctly.
 */
const coreRadius = (sub: number) => (sub <= 3 ? 0 : 1);

/** True when (dr, dc) is inside the central data core for a given detail. */
function inCore(dr: number, dc: number, sub: number): boolean {
  const mid = (sub - 1) / 2;
  const cr = coreRadius(sub);
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
): boolean {
  if (sampler && !inCore(dr, dc, sub) && !(protectPatterns && matrix.isFunction(r, c))) {
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

export interface FillOpts {
  style: ColorStyle;
  fg: string;
  bg: string;
  /** Pre-clamped dark colour used by brand mode (see brandDarkHex). */
  brand: string;
  protectPatterns: boolean;
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
  const dark = subCellDark(matrix, sampler, opts.protectPatterns, r, c, dr, dc, sub);

  if (opts.style === 'brand') {
    return dark ? opts.brand : opts.bg;
  }

  if (opts.style === 'image' && sampler?.colorAt) {
    const isFn = matrix.isFunction(r, c);
    if (isFn || !inCore(dr, dc, sub)) {
      const rgb = sampler.colorAt(r * sub + dr, c * sub + dc);
      // Identifier patterns get a stronger dark clamp for reliable detection.
      return rgbToHex(dark ? clampDark(rgb, isFn ? IDENTIFIER_DARK_MAX : DARK_MAX) : clampLight(rgb));
    }
  }

  return dark ? opts.fg : opts.bg;
}
