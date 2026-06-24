/**
 * Samples an image into a binary (dark/light) grid used to paint the
 * surrounding sub-modules of a halftone QR. The image is scaled to "cover"
 * the QR area so it isn't distorted.
 */
export interface ImageSampler {
  /** True when the image is dark at sub-cell (subRow, subCol) of a gridSize grid. */
  dark(subRow: number, subCol: number): boolean;
}

export interface SampleOptions {
  /** gridSize x gridSize sub-cells (== 3 * module count). */
  gridSize: number;
  /** Luminance cut-off 0..1. Pixels darker than this become dark cells. */
  threshold: number;
  /** Invert dark/light mapping. */
  invert: boolean;
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
  const { gridSize, threshold, invert } = opts;
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
  const cut = threshold * 255;

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
  };
}
