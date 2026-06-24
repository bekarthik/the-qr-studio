import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';
import { computeGrid, subCellFill, brandDarkHex, type ColorStyle } from './grid';

export interface SvgCenterImage {
  /** Data URL (or any URL) of the logo to embed. */
  href: string;
  /** Fraction of the QR side covered by the logo box (0.1 - 0.3). */
  ratio: number;
  /** Draw a rounded background plate behind the logo. */
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
  const { n, sub, quietSub, gridSide } = computeGrid(matrix.size, quietModules);
  const fillOpts = { style: colorStyle, fg, bg, brand: brandDarkHex(opts.brandColor), protectPatterns };

  // Paint colour for every sub-cell, indexed by sub-row/col in module space.
  const fillAt = (sr: number, sc: number): string =>
    subCellFill(matrix, sampler, fillOpts, Math.floor(sr / sub), Math.floor(sc / sub), sr % sub, sc % sub);

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
    const ratio = Math.min(0.3, Math.max(0.1, centerImage.ratio));
    const qr = total;
    const box = qr * ratio;
    const mid = gridSide / 2;
    if (centerImage.plate) {
      const side = box * 1.18;
      const s = mid - side / 2;
      const rx = side * 0.14;
      center += `<rect x="${r2(s)}" y="${r2(s)}" width="${r2(side)}" height="${r2(side)}" rx="${r2(rx)}" fill="${bg}"/>`;
    } else {
      const s = mid - box / 2;
      center += `<rect x="${r2(s)}" y="${r2(s)}" width="${r2(box)}" height="${r2(box)}" fill="${bg}"/>`;
    }
    const ix = mid - box / 2;
    center +=
      `<image x="${r2(ix)}" y="${r2(ix)}" width="${r2(box)}" height="${r2(box)}" ` +
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
