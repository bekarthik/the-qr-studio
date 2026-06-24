import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';

/** Geometry shared by every renderer. One module === 3x3 sub-cells. */
export interface GridSpec {
  /** Modules per side (no quiet zone). */
  n: number;
  /** Sub-cells per module side (always 3). */
  sub: number;
  /** Quiet-zone width in sub-cells. */
  quietSub: number;
  /** Total sub-cells per side including the quiet zone. */
  gridSide: number;
}

export function computeGrid(size: number, quietModules: number): GridSpec {
  const sub = 3;
  const quietSub = quietModules * sub;
  return { n: size, sub, quietSub, gridSide: size * sub + 2 * quietSub };
}

/**
 * The single source of truth for whether a sub-cell is dark. Canvas and SVG
 * renderers both call this so their geometry — and therefore scannability — is
 * guaranteed identical.
 *
 * The centre sub-cell (dr==1, dc==1) always carries the true module value. The
 * eight surrounding sub-cells follow the image when halftoning, except over
 * protected function patterns which stay solid.
 */
export function subCellDark(
  matrix: QrMatrix,
  sampler: ImageSampler | null | undefined,
  protectPatterns: boolean,
  r: number,
  c: number,
  dr: number,
  dc: number,
): boolean {
  const isCenter = dr === 1 && dc === 1;
  if (sampler && !isCenter && !(protectPatterns && matrix.isFunction(r, c))) {
    return sampler.dark(r * 3 + dr, c * 3 + dc);
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
/** Quantise channels so smooth image regions merge into runs (smaller SVGs). */
const QUANT = 12;

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const q = (v: number) => Math.max(0, Math.min(255, Math.round(v / QUANT) * QUANT));

/** Darken an image colour while keeping its hue — result reads as "dark". */
export function clampDark([r, g, b]: RGB): RGB {
  const l = lum(r, g, b);
  const f = l > DARK_MAX ? DARK_MAX / Math.max(l, 1) : 1;
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
 *  - image : the eight surrounding sub-cells take the image's hue clamped into
 *            the dark/light band; the centre sub-cell (which scanners sample)
 *            and function patterns stay at full fg/bg contrast.
 */
export function subCellFill(
  matrix: QrMatrix,
  sampler: ImageSampler | null | undefined,
  opts: FillOpts,
  r: number,
  c: number,
  dr: number,
  dc: number,
): string {
  const dark = subCellDark(matrix, sampler, opts.protectPatterns, r, c, dr, dc);

  if (opts.style === 'brand') {
    return dark ? opts.brand : opts.bg;
  }

  if (opts.style === 'image' && sampler?.colorAt) {
    const isCenter = dr === 1 && dc === 1;
    const isImageCell = !isCenter && !(opts.protectPatterns && matrix.isFunction(r, c));
    if (isImageCell) {
      const rgb = sampler.colorAt(r * 3 + dr, c * 3 + dc);
      return rgbToHex(dark ? clampDark(rgb) : clampLight(rgb));
    }
  }

  return dark ? opts.fg : opts.bg;
}
