import type { QrMatrix } from './matrix';
import type { ImageSampler } from './halftone';

export interface CenterImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Fraction of the QR side covered by the logo box (0.1 - 0.3). */
  ratio: number;
  /** Draw a rounded background plate behind the logo. */
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
  const { matrix, quietModules, fg, bg, sampler, protectPatterns, centerImage } = opts;
  const n = matrix.size;
  const sub = 3; // sub-cells per module side
  const quietSub = quietModules * sub;
  const gridSide = n * sub + 2 * quietSub; // total sub-cells per side incl. quiet zone

  const cellPx = Math.max(1, Math.floor(opts.targetPx / gridSide));
  const dim = gridSide * cellPx;

  const canvas = document.createElement('canvas');
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;

  // Background / quiet zone.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dim, dim);

  const paint = (subRow: number, subCol: number, dark: boolean) => {
    ctx.fillStyle = dark ? fg : bg;
    ctx.fillRect(subCol * cellPx, subRow * cellPx, cellPx, cellPx);
  };

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const moduleDark = matrix.get(r, c);
      const fn = matrix.isFunction(r, c);
      const baseSubRow = quietSub + r * sub;
      const baseSubCol = quietSub + c * sub;

      for (let dr = 0; dr < sub; dr++) {
        for (let dc = 0; dc < sub; dc++) {
          const isCenter = dr === 1 && dc === 1;
          let dark = moduleDark;

          if (sampler && !isCenter && !(fn && protectPatterns)) {
            // Surrounding sub-cells follow the image.
            dark = sampler.dark(r * sub + dr, c * sub + dc);
          }
          paint(baseSubRow + dr, baseSubCol + dc, dark);
        }
      }
    }
  }

  if (centerImage) drawCenterImage(ctx, dim, quietSub * cellPx, n * sub * cellPx, bg, centerImage);

  return canvas;
}

/**
 * Carves an empty square in the middle of the QR (snapped to module bounds)
 * and embeds the logo into that space — the image sits *inside* the code, not
 * pasted over live modules.
 */
function drawCenterImage(
  ctx: CanvasRenderingContext2D,
  dim: number,
  quietPx: number,
  qrPx: number,
  bg: string,
  logo: CenterImage,
) {
  const ratio = Math.min(0.3, Math.max(0.1, logo.ratio));
  const boxSide = qrPx * ratio;
  const start = quietPx + (qrPx - boxSide) / 2;
  const center = dim / 2;

  // Carve out (clear modules under the logo to the background colour).
  const plateSide = logo.plate ? boxSide * 1.18 : boxSide;
  const plateStart = center - plateSide / 2;
  if (logo.plate) {
    ctx.fillStyle = bg;
    roundRect(ctx, plateStart, plateStart, plateSide, plateSide, plateSide * 0.14);
    ctx.fill();
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(start, start, boxSide, boxSide);
  }

  // Embed the logo, preserving aspect ratio (contain fit) within the box.
  const scale = Math.min(boxSide / logo.width, boxSide / logo.height);
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
