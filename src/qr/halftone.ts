/**
 * Samples an image into a binary (dark/light) grid used to paint the
 * surrounding sub-modules of a halftone QR. The image is scaled to "cover"
 * the QR area so it isn't distorted.
 */
export interface ImageSampler {
  /** True when the image is dark at sub-cell (subRow, subCol) of a gridSize grid. */
  dark(subRow: number, subCol: number): boolean;
  /** The image's RGB colour at that sub-cell (transparent → white). */
  colorAt(subRow: number, subCol: number): [number, number, number];
}

export interface SampleOptions {
  /** gridSize x gridSize sub-cells (== sub * module count). */
  gridSize: number;
  /** Luminance cut-off 0..1. Pixels darker than this become dark cells. */
  threshold: number;
  /** Invert dark/light mapping. */
  invert: boolean;
  /** Pick the dark/light cut-off automatically (Otsu) instead of `threshold`. */
  auto: boolean;
}

/** Otsu's method: the luminance cut-off that best separates dark from light. */
function otsuCut(lumas: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (const v of lumas) hist[v]++;
  const total = lumas.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let cut = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      cut = t;
    }
  }
  return cut;
}

/**
 * Renders `source` into a gridSize x gridSize buffer and returns a sampler.
 * Uses cover-fit (center crop) so the image fills the square without stretching.
 */
export function sampleImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  opts: SampleOptions,
): ImageSampler {
  const { gridSize, threshold, invert, auto } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = gridSize;
  canvas.height = gridSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // Cover fit: scale so the smaller dimension fills the grid, center-crop.
  const scale = Math.max(gridSize / width, gridSize / height);
  const dw = width * scale;
  const dh = height * scale;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, gridSize, gridSize);
  ctx.drawImage(source, (gridSize - dw) / 2, (gridSize - dh) / 2, dw, dh);

  const { data } = ctx.getImageData(0, 0, gridSize, gridSize);

  // Choose the dark/light cut-off: Otsu auto, or the manual threshold slider.
  let cut = threshold * 255;
  if (auto) {
    const lumas = new Uint8Array(gridSize * gridSize);
    for (let i = 0; i < lumas.length; i++) {
      const j = i * 4;
      lumas[i] = data[j + 3] < 16 ? 255 : (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) | 0;
    }
    cut = otsuCut(lumas);
  }

  return {
    dark(subRow: number, subCol: number): boolean {
      const idx = (subRow * gridSize + subCol) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      // Transparent pixels are treated as light (background).
      const lum = a < 16 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
      const isDark = lum < cut;
      return invert ? !isDark : isDark;
    },
    colorAt(subRow: number, subCol: number): [number, number, number] {
      const idx = (subRow * gridSize + subCol) * 4;
      if (data[idx + 3] < 16) return [255, 255, 255]; // transparent → white
      return [data[idx], data[idx + 1], data[idx + 2]];
    },
  };
}

/**
 * Estimates a brand colour from an image: the average colour of its darker
 * half (the logo mark, separated from a light background by an Otsu cut-off).
 * Returns a hex string. Browser-only (uses a canvas).
 */
export function extractBrandColor(source: CanvasImageSource, width: number, height: number): string {
  const size = 96; // small sample is plenty for an average
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const scale = Math.max(size / width, size / height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, (size - width * scale) / 2, (size - height * scale) / 2, width * scale, height * scale);
  const { data } = ctx.getImageData(0, 0, size, size);

  const lumas = new Uint8Array(size * size);
  for (let i = 0; i < lumas.length; i++) {
    const j = i * 4;
    lumas[i] = data[j + 3] < 16 ? 255 : (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) | 0;
  }
  const cut = otsuCut(lumas);

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < lumas.length; i++) {
    if (lumas[i] < cut && data[i * 4 + 3] >= 16) {
      r += data[i * 4];
      g += data[i * 4 + 1];
      b += data[i * 4 + 2];
      n++;
    }
  }
  if (!n) return '#101418';
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
