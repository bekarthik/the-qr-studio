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
  type ColorStyle,
  type ModuleShape,
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
  /** Shape of each dark module (block codes only; ignored when halftoning). */
  shape?: ModuleShape;
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

  // A shaped (dots / rounded) code is a block code with no image sampler — the
  // image styling and shape styling are mutually exclusive paths.
  const shaped = !sampler && opts.shape && opts.shape !== 'square';

  if (shaped) {
    drawShapedModules(ctx, matrix, n, quietSub * cellPx, sub * cellPx, opts.shape!, fillOpts);
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
 * Draws a code as styled modules (dots or rounded squares). Data modules take
 * the chosen shape; the three finder patterns are drawn as one cohesive eye and
 * the timing/alignment patterns stay solid squares, so the code still scans.
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
  const bg = fillOpts.bg;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c, n) || !matrix.get(r, c)) continue;
      const x = origin + c * m;
      const y = origin + r * m;
      ctx.fillStyle = dark;
      // Keep structural (timing/alignment) modules solid for reliable detection.
      if (matrix.isFunction(r, c) || shape === 'rounded') {
        if (shape === 'rounded' && !matrix.isFunction(r, c)) {
          roundRect(ctx, x, y, m, m, m * 0.32);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, m, m);
        }
      } else {
        circle(ctx, x + m / 2, y + m / 2, m / 2);
        ctx.fill();
      }
    }
  }

  for (const [fr, fc] of finderOrigins(n)) {
    drawEye(ctx, origin + fc * m, origin + fr * m, m, shape, dark, bg);
  }
}

/** One finder "eye": an outer frame, a cleared gap, and a centre pupil. */
function drawEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  m: number,
  shape: ModuleShape,
  dark: string,
  bg: string,
) {
  if (shape === 'dot') {
    const cx = x + 3.5 * m;
    const cy = y + 3.5 * m;
    ctx.fillStyle = dark;
    circle(ctx, cx, cy, 3.5 * m);
    ctx.fill();
    ctx.fillStyle = bg;
    circle(ctx, cx, cy, 2.5 * m);
    ctx.fill();
    ctx.fillStyle = dark;
    circle(ctx, cx, cy, 1.5 * m);
    ctx.fill();
  } else {
    ctx.fillStyle = dark;
    roundRect(ctx, x, y, 7 * m, 7 * m, 2 * m);
    ctx.fill();
    ctx.fillStyle = bg;
    roundRect(ctx, x + m, y + m, 5 * m, 5 * m, 1.4 * m);
    ctx.fill();
    ctx.fillStyle = dark;
    roundRect(ctx, x + 2 * m, y + 2 * m, 3 * m, 3 * m, 0.9 * m);
    ctx.fill();
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
