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
