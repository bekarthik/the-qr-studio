import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';
import { computeGrid, subCellDark } from './grid';

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
  centerImage?: SvgCenterImage | null;
  /** Pixel size written to the width/height attributes (the SVG stays vector). */
  pixelSize: number;
}

/**
 * Renders the QR as a vector SVG. Geometry comes from the same `subCellDark`
 * decision as the canvas renderer, so the SVG is exactly as scannable. Dark
 * sub-cells are merged into horizontal runs to keep the file compact, and an
 * optional centre logo is embedded as an <image>.
 */
export function renderSVG(opts: SvgOptions): string {
  const { matrix, quietModules, fg, bg, sampler, protectPatterns, centerImage, pixelSize } = opts;
  const { n, sub, quietSub, gridSide } = computeGrid(matrix.size, quietModules);

  // Dark/light value for every sub-cell, indexed [subRow][subCol] in module space.
  const dark = (sr: number, sc: number): boolean => {
    const r = Math.floor(sr / sub);
    const c = Math.floor(sc / sub);
    return subCellDark(matrix, sampler, protectPatterns, r, c, sr % sub, sc % sub);
  };

  const rects: string[] = [];
  const total = n * sub;
  for (let sr = 0; sr < total; sr++) {
    let runStart = -1;
    for (let sc = 0; sc <= total; sc++) {
      const on = sc < total && dark(sr, sc);
      if (on && runStart === -1) {
        runStart = sc;
      } else if (!on && runStart !== -1) {
        const x = quietSub + runStart;
        const y = quietSub + sr;
        rects.push(`<rect x="${x}" y="${y}" width="${sc - runStart}" height="1" fill="${fg}"/>`);
        runStart = -1;
      }
    }
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
