import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';
import { computeGrid, subCellFill, brandDarkHex, centerHole, type ColorStyle } from './grid';

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
  const fillOpts = { style: colorStyle, fg, bg, brand: brandDarkHex(opts.brandColor), protectPatterns };

  const cellPx = Math.max(1, Math.floor(opts.targetPx / gridSide));
  const dim = gridSide * cellPx;

  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;

  // Background / quiet zone.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dim, dim);

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
