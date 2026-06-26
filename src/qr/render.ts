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

export interface CenterImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Fraction of the QR side carved out for the logo region (0.1 - 0.3). */
  ratio: number;
  /** Round the corners of the carved-out region (vs a square hole). */
  plate: boolean;
}

export interface RenderOptions {
  matrix: QrMatrix;
  /** Target output size in pixels (approximate; rounded to whole sub-cells). */
  targetPx: number;
  /** Quiet-zone width in modules (spec recommends 4). */
  quietModules: number;
  fg: string;
  bg: string;
  /** When set, surrounding sub-modules follow the image (halftone style). */
  sampler?: ImageSampler | null;
  /** Keep finder/timing/alignment patterns fully solid (recommended). */
  protectPatterns: boolean;
  /** How data cells are coloured: solid fg/bg, a brand colour, or image hues. */
  colorStyle: ColorStyle;
  /** Brand colour (raw hex) used when colorStyle === 'brand'. */
  brandColor: string;
  /** Sub-cells per module (odd: 3 standard, 5/7 = finer image detail). */
  sub: number;
  /** Half-width of the protected data dot in sub-cells (0 = finest image). */
  core: number;
  /** Continuous 0–1 size of the solid data dot drawn over a halftone module's
   *  centre (0 = single centre cell, 1 = whole module). Linear, detail-agnostic. */
  dotScale?: number;
  /** Shape of each dark data module (and the halftone data dot). */
  shape?: ModuleShape;
  /** Shape of the three finder "eyes" (auto = follow the module shape). */
  eyeShape?: EyeShape;
  /** Override colour for the finder eyes; falls back to the module dark colour. */
  eyeColor?: string | null;
  /** Optional faint logo watermark: across the whole code, or bottom-right. */
  watermark?: {
    source: CanvasImageSource;
    width: number;
    height: number;
    opacity: number;
    position: 'across' | 'br';
  } | null;
  /** Optional logo embedded into carved-out center space. */
  centerImage?: CenterImage | null;
}

/**
 * Renders the QR onto a freshly created canvas.
 *
 * Every module is expanded into a 3x3 grid of sub-cells. For a plain QR all
 * nine sub-cells share the module's value. For a halftone QR the *center*
 * sub-cell always keeps the true module value (preserving the data layer),
 * while the eight surrounding sub-cells follow the source image — this is what
 * makes the finished code resemble the picture while staying scannable.
 */
export function renderQR(opts: RenderOptions): HTMLCanvasElement {
  const { matrix, quietModules, fg, bg, sampler, protectPatterns, colorStyle, centerImage } = opts;
  const { n, sub, quietSub, gridSide } = computeGrid(matrix.size, quietModules, opts.sub);
  const fillOpts = { style: colorStyle, fg, bg, brand: brandDarkHex(opts.brandColor), protectPatterns, core: opts.core };

  const cellPx = Math.max(1, Math.floor(opts.targetPx / gridSide));
  const dim = gridSide * cellPx;

  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;

  // Background / quiet zone.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dim, dim);

  const shape: ModuleShape = opts.shape ?? 'square';
  const eyeShape = opts.eyeShape ?? 'auto';
  const eyeShapeR = resolveEyeShape(eyeShape, shape);
  const eyeColor = opts.eyeColor ? brandDarkHex(opts.eyeColor) : moduleColor(true, fillOpts);
  const eyesActive = shape !== 'square' || eyeShape !== 'auto' || !!opts.eyeColor;

  // Styled data modules (dots / rounded) only apply to block codes; a halftone
  // styles every sub-cell from the image instead.
  const shapedData = !sampler && shape !== 'square';

  if (shapedData) {
    drawShapedModules(ctx, matrix, n, quietSub * cellPx, sub * cellPx, shape, fillOpts);
  } else {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const baseSubRow = quietSub + r * sub;
        const baseSubCol = quietSub + c * sub;
        for (let dr = 0; dr < sub; dr++) {
          for (let dc = 0; dc < sub; dc++) {
            ctx.fillStyle = subCellFill(matrix, sampler, fillOpts, r, c, dr, dc, sub);
            ctx.fillRect((baseSubCol + dc) * cellPx, (baseSubRow + dr) * cellPx, cellPx, cellPx);
          }
        }
      }
    }
  }

  // Linear data-dot overlay (halftone): a solid mark at each data module's
  // centre, sized continuously by dotScale and drawn in the chosen module shape.
  const dotScale = opts.dotScale ?? 0;
  if (sampler && dotScale > 0) {
    const hw = dotHalfWidth(sub, dotScale) * cellPx;
    const moduleUnit = sub * cellPx;
    const dark = moduleColor(true, fillOpts);
    if (shape === 'liquid') {
      // Bridge adjacent dark data dots into connected blobs; draw dark first,
      // then light dots on top so light centres stay protected.
      const { dots, bars } = liquidDotOps(matrix, n, quietSub * cellPx, quietSub * cellPx, moduleUnit, hw);
      ctx.fillStyle = dark;
      for (const b of bars) ctx.fillRect(b.x, b.y, b.w, b.h);
      for (const d of dots) if (d.dark) markCanvas(ctx, d.cx, d.cy, hw, 'dot', dark);
      for (const d of dots) if (!d.dark) markCanvas(ctx, d.cx, d.cy, hw, 'dot', bg);
    } else {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix.isFunction(r, c)) continue;
          const cx = (quietSub + c * sub) * cellPx + moduleUnit / 2;
          const cy = (quietSub + r * sub) * cellPx + moduleUnit / 2;
          markCanvas(ctx, cx, cy, hw, shape, moduleColor(matrix.get(r, c), fillOpts));
        }
      }
    }
  }

  // Styled finder eyes (block + halftone): clear each 7×7, then redraw the
  // position pattern in the chosen shape/colour.
  if (eyesActive) {
    const m = sub * cellPx;
    for (const [fr, fc] of finderOrigins(n)) {
      drawEye(ctx, (quietSub + fc * sub) * cellPx, (quietSub + fr * sub) * cellPx, m, eyeShapeR, eyeColor, bg);
    }
  }

  // Faint watermark (never the quiet zone), under any centre logo. Kept
  // low-opacity so module contrast still reads.
  if (opts.watermark) {
    const qrPx = n * sub * cellPx;
    const start = quietSub * cellPx;
    const modulePx = sub * cellPx;
    const { source, width, height, position } = opts.watermark;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opts.watermark.opacity));
    if (position === 'br') {
      // Contain in a corner box, anchored bottom-right with a 1-module margin.
      const box = qrPx * 0.3;
      const scale = Math.min(box / width, box / height);
      const dw = width * scale;
      const dh = height * scale;
      ctx.drawImage(source, start + qrPx - modulePx - dw, start + qrPx - modulePx - dh, dw, dh);
    } else {
      ctx.beginPath();
      ctx.rect(start, start, qrPx, qrPx);
      ctx.clip();
      const scale = Math.max(qrPx / width, qrPx / height); // cover
      const dw = width * scale;
      const dh = height * scale;
      ctx.drawImage(source, start + (qrPx - dw) / 2, start + (qrPx - dh) / 2, dw, dh);
    }
    ctx.restore();
  }

  if (centerImage) drawCenterImage(ctx, dim, n * sub * cellPx, sub * cellPx, bg, centerImage);

  return canvas;
}

/**
 * Carves an empty region in the middle of the QR (snapped to module bounds) and
 * embeds the logo *inside* it with a quiet margin — the image sits in cleared
 * space, never pasted over live modules.
 */
function drawCenterImage(
  ctx: CanvasRenderingContext2D,
  dim: number,
  qrPx: number,
  modulePx: number,
  bg: string,
  logo: CenterImage,
) {
  const { holeSide, logoBox, radius } = centerHole(qrPx, modulePx, logo.ratio);
  const center = dim / 2;
  const holeStart = center - holeSide / 2;

  // Clear the region (rounded corners when a plate is requested, else a square
  // hole) so the modules underneath are removed, not just covered.
  ctx.fillStyle = bg;
  if (logo.plate) {
    roundRect(ctx, holeStart, holeStart, holeSide, holeSide, radius);
    ctx.fill();
  } else {
    ctx.fillRect(holeStart, holeStart, holeSide, holeSide);
  }

  // Embed the logo (contain fit) within the inner box, leaving the margin clear.
  const scale = Math.min(logoBox / logo.width, logoBox / logo.height);
  const dw = logo.width * scale;
  const dh = logo.height * scale;
  ctx.drawImage(logo.source, center - dw / 2, center - dh / 2, dw, dh);
}

/**
 * Draws the styled data modules (dots / rounded / extra). Finder patterns are
 * skipped (drawn as styled eyes elsewhere) and timing/alignment stay solid
 * squares so the code still scans.
 */
function drawShapedModules(
  ctx: CanvasRenderingContext2D,
  matrix: RenderOptions['matrix'],
  n: number,
  origin: number,
  m: number,
  shape: ModuleShape,
  fillOpts: { style: ColorStyle; fg: string; bg: string; brand: string },
) {
  const dark = moduleColor(true, fillOpts);

  if (shape === 'liquid') {
    ctx.fillStyle = dark;
    for (const op of liquidOps(matrix, n, origin, origin, m, m * 0.5)) {
      if (op.square) ctx.fillRect(op.x, op.y, op.m, op.m);
      else ctx.fill(new Path2D(op.d));
    }
    return;
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c, n) || !matrix.get(r, c)) continue;
      const x = origin + c * m;
      const y = origin + r * m;
      // Keep structural (timing/alignment) modules solid for reliable detection.
      if (matrix.isFunction(r, c)) {
        ctx.fillStyle = dark;
        ctx.fillRect(x, y, m, m);
      } else {
        markCanvas(ctx, x + m / 2, y + m / 2, m / 2, shape, dark);
      }
    }
  }
}

/** One module-sized mark centred at (cx, cy) with half-width `half`. */
function markCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  half: number,
  shape: ModuleShape,
  color: string,
) {
  ctx.fillStyle = color;
  if (shape === 'dot') {
    circle(ctx, cx, cy, half);
  } else {
    const rx = SHAPE_RX[shape] * 2 * half;
    if (rx) roundRect(ctx, cx - half, cy - half, 2 * half, 2 * half, rx);
    else {
      ctx.fillRect(cx - half, cy - half, 2 * half, 2 * half);
      return;
    }
  }
  ctx.fill();
}

/** A styled finder eye: clear the 7×7, then redraw frame / gap / pupil. */
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  m: number,
  shape: 'square' | 'rounded' | 'circle',
  dark: string,
  bg: string,
) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, 7 * m, 7 * m);
  for (const { inset, size, dark: isDark } of EYE_LAYERS) {
    const color = isDark ? dark : bg;
    const cx = x + (inset + size / 2) * m;
    const cy = y + (inset + size / 2) * m;
    if (shape === 'circle') {
      markCanvas(ctx, cx, cy, (size / 2) * m, 'dot', color);
    } else {
      const rx = shape === 'rounded' ? EYE_RX * size * m : 0;
      ctx.fillStyle = color;
      if (rx) {
        roundRect(ctx, x + inset * m, y + inset * m, size * m, size * m, rx);
        ctx.fill();
      } else {
        ctx.fillRect(x + inset * m, y + inset * m, size * m, size * m);
      }
    }
  }
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
