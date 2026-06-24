import QRCode from 'qrcode';

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  /** Number of modules per side (excludes quiet zone). */
  size: number;
  /** QR symbol version (1-40). */
  version: number;
  /** Returns true when module (row, col) is dark. */
  get(row: number, col: number): boolean;
  /**
   * True when (row, col) is a function pattern (finder, separator, timing,
   * alignment, dark module, format/version info). These must stay solid so a
   * scanner can still locate and sample the symbol when the data area is
   * halftoned.
   */
  isFunction(row: number, col: number): boolean;
}

/** Row/col centres of alignment patterns per version (ISO/IEC 18004 Annex E). */
const ALIGNMENT_CENTERS: number[][] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

/** Precompute a boolean grid marking every function-pattern module. */
function buildFunctionMask(size: number, version: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  const set = (r: number, c: number) => {
    if (r >= 0 && c >= 0 && r < size && c < size) mask[r * size + c] = 1;
  };

  // Finder patterns + 1-module separators (8x8 blocks) at the three corners.
  const finder = (r0: number, c0: number) => {
    for (let r = r0; r < r0 + 8; r++) for (let c = c0; c < c0 + 8; c++) set(r, c);
  };
  finder(0, 0);
  finder(0, size - 8);
  finder(size - 8, 0);

  // Timing patterns (row 6 and column 6 across the whole symbol).
  for (let i = 0; i < size; i++) {
    set(6, i);
    set(i, 6);
  }

  // Format information areas (around the finder patterns).
  for (let i = 0; i < 9; i++) {
    set(8, i);
    set(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    set(8, size - 1 - i);
    set(size - 1 - i, 8);
  }

  // Dark module (always set), just above the bottom-left format strip.
  set(size - 8, 8);

  // Alignment patterns (5x5 blocks centred on the version's coordinate grid,
  // skipping any that collide with the finder patterns).
  const centers = ALIGNMENT_CENTERS[version] || [];
  for (const cr of centers) {
    for (const cc of centers) {
      const nearFinder =
        (cr <= 8 && cc <= 8) ||
        (cr <= 8 && cc >= size - 9) ||
        (cr >= size - 9 && cc <= 8);
      if (nearFinder) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(cr + dr, cc + dc);
    }
  }

  // Version information blocks (versions >= 7): two 6x3 areas near TR & BL finders.
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        set(i, size - 11 + j);
        set(size - 11 + j, i);
      }
    }
  }

  return mask;
}

/**
 * Build the raw QR bit-matrix for a payload. We only use the `qrcode` package
 * for the encoding/masking; rendering is done entirely by us so we can carve
 * space for a logo and halftone the data modules while protecting the parts a
 * scanner needs to lock onto.
 */
export function buildMatrix(text: string, errorLevel: ErrorLevel): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: errorLevel });
  const modules = qr.modules;
  const size = modules.size;
  const version = qr.version;
  const fnMask = buildFunctionMask(size, version);

  return {
    size,
    version,
    get(row, col) {
      if (row < 0 || col < 0 || row >= size || col >= size) return false;
      return Boolean(modules.get(row, col));
    },
    isFunction(row, col) {
      if (row < 0 || col < 0 || row >= size || col >= size) return false;
      return fnMask[row * size + col] === 1;
    },
  };
}
