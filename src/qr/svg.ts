import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';
import { computeGrid, subCellFill, brandDarkHex, centerHole, type ColorStyle } from './grid';

export interface SvgCenterImage {
  /** Data URL (or any URL) of the logo to embed. */
  href: string;
  /** Fraction of the QR side carved out for the logo region (0.1 - 0.3). */
  ratio: number;
  /** Round the corners of the carved-out region (vs a square hole). */
  plate: boolean;
}

export interface SvgOptions {
  matrix: QrMatrix;
  quietModules: number;
  fg: string;
  bg: string;
  sampler?: ImageSampler | null;
  protectPatterns: boolean;
  /** How data cells are coloured: solid fg/bg, a brand colour, or image hues. */
  colorStyle: ColorStyle;
  /** Brand colour (raw hex) used when colorStyle === 'brand'. */
  brandColor: string;
  /** Sub-cells per module (odd: 3 standard, 5/7 = finer image detail). */
  sub: number;
  centerImage?: SvgCenterImage | null;
  /** Pixel size written to the width/height attributes (the SVG stays vector). */
  pixelSize: number;
}

/**
 * Renders the QR as a vector SVG. Colours come from the same `subCellFill`
 * decision as the canvas renderer, so the SVG is exactly as scannable.
 * Horizontally adjacent sub-cells of the same colour are merged into one rect
 * (cells equal to the background are skipped) to keep the file compact, and an
 * optional centre logo is embedded as an <image>.
 */
export function renderSVG(opts: SvgOptions): string {
  const { matrix, quietModules, fg, bg, sampler, protectPatterns, colorStyle, centerImage, pixelSize } = opts;
  const { n, sub, quietSub, gridSide } = computeGrid(matrix.size, quietModules, opts.sub);
  const fillOpts = { style: colorStyle, fg, bg, brand: brandDarkHex(opts.brandColor), protectPatterns };

  // Paint colour for every sub-cell, indexed by sub-row/col in module space.
  const fillAt = (sr: number, sc: number): string =>
    subCellFill(matrix, sampler, fillOpts, Math.floor(sr / sub), Math.floor(sc / sub), sr % sub, sc % sub, sub);

  const rects: string[] = [];
  const total = n * sub;
  for (let sr = 0; sr < total; sr++) {
    let runStart = -1;
    let runFill = '';
    const flush = (end: number) => {
      if (runStart !== -1 && runFill !== bg) {
        rects.push(
          `<rect x="${quietSub + runStart}" y="${quietSub + sr}" width="${end - runStart}" height="1" fill="${runFill}"/>`,
        );
      }
    };
    for (let sc = 0; sc < total; sc++) {
      const f = fillAt(sr, sc);
      if (f !== runFill) {
        flush(sc);
        runStart = sc;
        runFill = f;
      }
    }
    flush(total);
  }

  let center = '';
  if (centerImage) {
    // Carve an empty region (snapped to the module grid) and inset the logo so
    // it sits in cleared space with a quiet margin, never over live modules.
    const { holeSide, logoBox, radius } = centerHole(total, sub, centerImage.ratio);
    const mid = gridSide / 2;
    const hs = mid - holeSide / 2;
    const rx = centerImage.plate ? ` rx="${r2(radius)}"` : '';
    center += `<rect x="${r2(hs)}" y="${r2(hs)}" width="${r2(holeSide)}" height="${r2(holeSide)}"${rx} fill="${bg}"/>`;
    const ib = mid - logoBox / 2;
    center +=
      `<image x="${r2(ib)}" y="${r2(ib)}" width="${r2(logoBox)}" height="${r2(logoBox)}" ` +
      `href="${escapeAttr(centerImage.href)}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" ` +
    `viewBox="0 0 ${gridSide} ${gridSide}" shape-rendering="crispEdges">` +
    `<rect x="0" y="0" width="${gridSide}" height="${gridSide}" fill="${bg}"/>` +
    rects.join('') +
    center +
    `</svg>`
  );
}

const r2 = (v: number) => Math.round(v * 1000) / 1000;

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
