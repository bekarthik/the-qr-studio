import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';
import {
  computeGrid,
  subCellFill,
  brandDarkHex,
  centerHole,
  inFinder,
  finderOrigins,
  moduleColor,
  dotHalfWidth,
  resolveEyeShape,
  liquidOps,
  liquidDotOps,
  SHAPE_RX,
  EYE_RX,
  EYE_LAYERS,
  type ColorStyle,
  type ModuleShape,
  type EyeShape,
} from './grid';

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
  /** Half-width of the protected data dot in sub-cells (0 = finest image). */
  core: number;
  /** Continuous 0–1 size of the solid data dot over a halftone module's centre. */
  dotScale?: number;
  /** Shape of each dark data module (and the halftone data dot). */
  shape?: ModuleShape;
  /** Shape of the three finder "eyes" (auto = follow the module shape). */
  eyeShape?: EyeShape;
  /** Override colour for the finder eyes; falls back to the module dark colour. */
  eyeColor?: string | null;
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
  const fillOpts = { style: colorStyle, fg, bg, brand: brandDarkHex(opts.brandColor), protectPatterns, core: opts.core };

  const total = n * sub;
  const shape: ModuleShape = opts.shape ?? 'square';
  const eyeShape = opts.eyeShape ?? 'auto';
  const eyeShapeR = resolveEyeShape(eyeShape, shape);
  const eyeColor = opts.eyeColor ? brandDarkHex(opts.eyeColor) : moduleColor(true, fillOpts);
  // Eyes are restyled whenever the user has chosen any styling.
  const eyesActive = shape !== 'square' || eyeShape !== 'auto' || !!opts.eyeColor;

  // Data layer: styled module shapes for block codes, else the merged sub-cells
  // (plain or halftone). Styled eyes are drawn separately, below.
  const shapedData = !sampler && shape !== 'square';
  const rects: string[] = shapedData
    ? shapedModules(matrix, n, quietSub, sub, shape, fillOpts)
    : mergedRects(matrix, sampler, fillOpts, n, sub, quietSub, bg);

  // Linear data-dot overlay (halftone only): a solid mark at each data module's
  // centre, sized continuously by dotScale and drawn in the chosen module shape.
  const dotScale = opts.dotScale ?? 0;
  if (sampler && dotScale > 0) {
    const hw = dotHalfWidth(sub, dotScale);
    const dark = moduleColor(true, fillOpts);
    if (shape === 'liquid') {
      const { dots, bars } = liquidDotOps(matrix, n, quietSub, quietSub, sub, hw);
      for (const b of bars) {
        rects.push(`<rect x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.w)}" height="${r2(b.h)}" fill="${dark}"/>`);
      }
      for (const d of dots) if (d.dark) rects.push(markSvg(d.cx, d.cy, hw, 'dot', dark));
      for (const d of dots) if (!d.dark) rects.push(markSvg(d.cx, d.cy, hw, 'dot', bg));
    } else {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix.isFunction(r, c)) continue;
          const cx = quietSub + c * sub + sub / 2;
          const cy = quietSub + r * sub + sub / 2;
          rects.push(markSvg(cx, cy, hw, shape, moduleColor(matrix.get(r, c), fillOpts)));
        }
      }
    }
  }

  // Styled finder eyes (works for both block and halftone): clear each 7×7 then
  // redraw the position pattern in the chosen shape/colour.
  if (eyesActive) {
    for (const [fr, fc] of finderOrigins(n)) {
      rects.push(...eyeSvg(quietSub + fc * sub, quietSub + fr * sub, sub, eyeShapeR, eyeColor, bg));
    }
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

/** Classic block output: horizontally-adjacent same-colour sub-cells merged. */
function mergedRects(
  matrix: QrMatrix,
  sampler: ImageSampler | null | undefined,
  fillOpts: Parameters<typeof subCellFill>[2],
  n: number,
  sub: number,
  quietSub: number,
  bg: string,
): string[] {
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
  return rects;
}

/**
 * Styled data modules (dots / rounded / extra). Coordinates are in module units
 * of `sub`. Finder patterns are skipped here (drawn as styled eyes separately)
 * and timing/alignment stay solid squares so the code still scans.
 */
function shapedModules(
  matrix: QrMatrix,
  n: number,
  quietSub: number,
  sub: number,
  shape: ModuleShape,
  fillOpts: { style: ColorStyle; fg: string; bg: string; brand: string },
): string[] {
  const dark = moduleColor(true, fillOpts);

  if (shape === 'liquid') {
    return liquidOps(matrix, n, quietSub, quietSub, sub, sub * 0.5).map((op) =>
      op.square
        ? `<rect x="${r2(op.x)}" y="${r2(op.y)}" width="${r2(op.m)}" height="${r2(op.m)}" fill="${dark}"/>`
        : `<path d="${op.d}" fill="${dark}"/>`,
    );
  }

  const out: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c, n) || !matrix.get(r, c)) continue;
      const x = quietSub + c * sub;
      const y = quietSub + r * sub;
      if (matrix.isFunction(r, c)) {
        out.push(`<rect x="${x}" y="${y}" width="${sub}" height="${sub}" fill="${dark}"/>`);
      } else {
        out.push(markSvg(x + sub / 2, y + sub / 2, sub / 2, shape, dark));
      }
    }
  }
  return out;
}

/** One module-sized mark centred at (cx, cy) with half-width `half`. */
function markSvg(cx: number, cy: number, half: number, shape: ModuleShape, color: string): string {
  if (shape === 'dot') {
    return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(half)}" fill="${color}"/>`;
  }
  const rx = SHAPE_RX[shape] * 2 * half;
  const rxa = rx ? ` rx="${r2(rx)}"` : '';
  return `<rect x="${r2(cx - half)}" y="${r2(cy - half)}" width="${r2(2 * half)}" height="${r2(2 * half)}"${rxa} fill="${color}"/>`;
}

/** A styled finder eye: clear the 7×7, then redraw frame / gap / pupil. */
function eyeSvg(
  x: number,
  y: number,
  sub: number,
  shape: 'square' | 'rounded' | 'circle',
  dark: string,
  bg: string,
): string[] {
  const out = [`<rect x="${r2(x)}" y="${r2(y)}" width="${7 * sub}" height="${7 * sub}" fill="${bg}"/>`];
  for (const { inset, size, dark: isDark } of EYE_LAYERS) {
    const color = isDark ? dark : bg;
    const cx = x + (inset + size / 2) * sub;
    const cy = y + (inset + size / 2) * sub;
    if (shape === 'circle') {
      out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2((size / 2) * sub)}" fill="${color}"/>`);
    } else {
      const rx = shape === 'rounded' ? EYE_RX * size * sub : 0;
      const rxa = rx ? ` rx="${r2(rx)}"` : '';
      out.push(
        `<rect x="${r2(x + inset * sub)}" y="${r2(y + inset * sub)}" width="${r2(size * sub)}" height="${r2(size * sub)}"${rxa} fill="${color}"/>`,
      );
    }
  }
  return out;
}

const r2 = (v: number) => Math.round(v * 1000) / 1000;

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
